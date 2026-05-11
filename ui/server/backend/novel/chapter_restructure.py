"""
章节重组服务 — 扩展（拆分）/收缩（合并）章节以控制节奏

核心能力：
  扩展（替换）：选定 N 章 → 拆分为 M 章（M > N）
    1. 备份原始章节（版本快照）
    2. LLM 提取原始内容，重新拆分为 M 章的细纲 + 章节元数据
    3. 删除原始 N 章
    4. 在原始位置插入 M 章新章节
    5. 重排 chapter_no 序号

  收缩（合并）：选定 N 章 → 合并为 M 章（M < N）
    1. 备份原始章节
    2. LLM 合并相邻章节，生成新的细纲 + 正文
    3. 删除多余章节
    4. 重排 chapter_no 序号
"""
from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from .storage import (
    get_novel_project,
    list_worldbuilding,
    list_characters,
    list_chapters,
    get_chapter,
    create_chapter,
    update_chapter,
    delete_chapter,
    create_chapter_version,
    create_run_record,
)
from .llm_utils import call_llm, safe_parse_json


class ChapterRestructure:
    """章节重组服务"""

    def __init__(self, db: Session):
        self.db = db

    async def restructure(
        self,
        project_id: int,
        model_id: Optional[int],
        chapter_ids: list[int],
        mode: str,
        target_count: int,
        instructions: str = "",
    ) -> dict[str, Any]:
        project = get_novel_project(self.db, project_id)
        if not project:
            raise ValueError("项目不存在")

        # 获取选中的章节
        chapters = []
        for cid in chapter_ids:
            ch = get_chapter(self.db, cid)
            if ch:
                chapters.append(ch)
        chapters.sort(key=lambda c: c.chapter_no)

        if not chapters:
            raise ValueError("未找到有效章节")

        original_count = len(chapters)
        first_chapter_no = chapters[0].chapter_no
        last_chapter_no = chapters[-1].chapter_no

        self._record(project_id, "restructure", "start", {
            "mode": mode, "original_count": original_count,
            "target_count": target_count, "chapter_ids": chapter_ids,
        })

        if mode == "expand":
            result = await self._expand(project_id, model_id, chapters, target_count, instructions)
        elif mode == "contract":
            result = await self._contract(project_id, model_id, chapters, target_count, instructions)
        else:
            raise ValueError(f"未知的重组模式: {mode}")

        self._record(project_id, "restructure", "done", {
            "mode": mode, "created": len(result["new_chapters"]),
            "deleted": len(result["deleted_chapter_ids"]),
        })
        return result

    # ── 扩展（替换）──────────────────────────────────────────────

    async def _expand(
        self,
        project_id: int,
        model_id: Optional[int],
        chapters: list,
        target_count: int,
        instructions: str,
    ) -> dict[str, Any]:
        """
        扩展章节（替换模式）：
        将选定 N 章的内容提取出来，重新拆分为 target_count 章。
        原始章节会被删除，新章节会占据原来的位置。
        """
        if target_count <= len(chapters):
            raise ValueError(f"扩展目标章数 ({target_count}) 必须大于原始章数 ({len(chapters)})")

        original_ids = [ch.id for ch in chapters]
        first_chapter_no = chapters[0].chapter_no

        # 1. 版本快照备份
        for ch in chapters:
            create_chapter_version(self.db, {
                "chapter_id": ch.id,
                "version_no": ch.version or 1,
                "chapter_text": ch.chapter_text or "",
                "scene_breakdown": getattr(ch, "scene_list", []) or [],
                "continuity_notes": [],
                "source": "restructure_expand",
            })

        # 2. 构建上下文
        context = self._build_context(project_id, chapters)

        # 3. LLM 生成扩展计划（替换模式）
        expand_plan = await self._generate_expand_plan(
            model_id, context, chapters, target_count, instructions
        )

        # 4. 删除原始章节
        deleted_ids = []
        for ch in chapters:
            delete_chapter(self.db, ch.id)
            deleted_ids.append(ch.id)

        # 5. 在原始位置插入新章节
        created = []
        for i, plan_item in enumerate(expand_plan):
            new_ch = create_chapter(self.db, {
                "project_id": project_id,
                "chapter_no": first_chapter_no + i,
                "title": plan_item.get("title", f"第{first_chapter_no + i}章"),
                "chapter_goal": plan_item.get("chapter_goal", ""),
                "chapter_summary": plan_item.get("chapter_summary", ""),
                "scene_list": plan_item.get("scene_list", []),
                "chapter_text": plan_item.get("chapter_text", "【扩展章节，正文待生成】"),
                "conflict": plan_item.get("conflict", ""),
                "ending_hook": plan_item.get("ending_hook", ""),
                "status": "draft",
                "version": 1,
            })
            created.append(new_ch)

        # 6. 重排序号
        await self._resequence_chapters(self.db, project_id)

        return {
            "mode": "expand",
            "original_count": len(chapters),
            "target_count": len(created),
            "new_chapters": [
                {"id": ch.id, "chapter_no": ch.chapter_no, "title": ch.title,
                 "chapter_summary": ch.chapter_summary, "chapter_text": ch.chapter_text,
                 "status": ch.status}
                for ch in created
            ],
            "deleted_chapter_ids": deleted_ids,
            "message": f"成功将 {len(chapters)} 章拆分为 {len(created)} 章",
        }

    # ── 扩展 Prompt ─────────────────────────────────────────────

    async def _generate_expand_plan(
        self,
        model_id: Optional[int],
        context: str,
        chapters: list,
        target_count: int,
        instructions: str,
    ) -> list[dict]:
        """让 LLM 将 N 章内容重新拆分为 M 章的细纲计划"""

        chapters_info = []
        for ch in chapters:
            chapters_info.append(f"""
### 第{ch.chapter_no}章《{ch.title}》
摘要：{ch.chapter_summary or '无'}
目标：{ch.chapter_goal or '无'}
冲突：{ch.conflict or '无'}
结尾钩子：{ch.ending_hook or '无'}
正文（前3000字）：{(ch.chapter_text or '')[:3000]}""")

        prompt = f"""{context}

## 任务：章节扩展（替换模式）

我需要将以下 {len(chapters)} 章内容扩展为 {target_count} 章。
原始 {len(chapters)} 章会被删除，替换为 {target_count} 章新章节。
新增的 {target_count - len(chapters)} 章应该插入在原始章节之后。

### 原始章节内容：
{chr(10).join(chapters_info)}

### 用户指令：
{instructions or "请合理拆分内容，增加细节描写、心理活动、对话场景，使节奏更加舒缓。"}

请返回一个 JSON 数组，包含 {target_count} 个新章节的规划。每个章节对象包含：
- title: 章节标题
- chapter_goal: 本章要达成什么
- chapter_summary: 本章内容摘要（100-200字）
- conflict: 本章核心冲突
- ending_hook: 结尾悬念
- scene_list: 场景列表，每个场景包含 scene_title 和 description

要求：
1. 保持故事连贯性和角色一致性
2. 新增章节应该插入在原始章节之后
3. 适当增加细节描写、心理活动、场景转换
4. 每章保持合理的篇幅和节奏
5. 不要修改原始章节的内容，只生成新章节

只输出 JSON 数组，不要其他内容。"""

        result = await call_llm(
            self.db, model_id, prompt,
            system_prompt="你是一位专业的小说编辑，擅长把控小说节奏和章节划分。",
            max_tokens=16000,
            temperature=0.7,
        )

        plan = safe_parse_json(result)
        if not isinstance(plan, list):
            plan = self._default_expand_plan(chapters, target_count)
        return plan

    # ── 收缩 ──────────────────────────────────────────────────────

    async def _contract(
        self,
        project_id: int,
        model_id: Optional[int],
        chapters: list,
        target_count: int,
        instructions: str,
    ) -> dict[str, Any]:
        if target_count >= len(chapters):
            raise ValueError(f"收缩目标章数 ({target_count}) 必须小于原始章数 ({len(chapters)})")
        if target_count < 1:
            raise ValueError("目标章数至少为 1")

        # 1. 版本快照
        for ch in chapters:
            create_chapter_version(self.db, {
                "chapter_id": ch.id,
                "version_no": ch.version or 1,
                "chapter_text": ch.chapter_text or "",
                "source": "restructure_contract",
            })

        # 2. 构建上下文
        context = self._build_context(project_id, chapters)

        # 3. 生成合并计划
        contract_plan = await self._generate_contract_plan(
            model_id, context, chapters, target_count, instructions
        )

        # 4. 执行合并
        chapters_to_keep: list[tuple[int, dict]] = []
        chapters_to_delete: list[int] = []
        deleted_ids = []

        for group in contract_plan:
            group_ids = [c.id for c in group.get("source_chapters", [])]
            keep_id = group.get("keep_chapter_id")
            merged_data = group.get("merged_data", {})
            if keep_id:
                chapters_to_keep.append((keep_id, merged_data))
            for ch in chapters:
                if ch.id in group_ids and ch.id != keep_id:
                    chapters_to_delete.append(ch.id)

        # 5. 更新保留的章节内容
        new_chapters = []
        for keep_id, merged_data in chapters_to_keep:
            update_chapter(self.db, keep_id, {
                "title": merged_data.get("title", ""),
                "chapter_summary": merged_data.get("chapter_summary", ""),
                "chapter_goal": merged_data.get("chapter_goal", ""),
                "chapter_text": merged_data.get("chapter_text", ""),
                "conflict": merged_data.get("conflict", ""),
                "ending_hook": merged_data.get("ending_hook", ""),
                "scene_list": merged_data.get("scene_list", []),
                "version": (get_chapter(self.db, keep_id).version or 1) + 1,
            })
            updated = get_chapter(self.db, keep_id)
            if updated:
                new_chapters.append({
                    "id": updated.id, "chapter_no": updated.chapter_no,
                    "title": updated.title, "chapter_summary": updated.chapter_summary,
                    "chapter_text": updated.chapter_text, "status": updated.status,
                })

        # 6. 删除多余章节
        for cid in chapters_to_delete:
            delete_chapter(self.db, cid)
            deleted_ids.append(cid)

        # 7. 重排序号
        await self._resequence_chapters(self.db, project_id)

        return {
            "mode": "contract",
            "original_count": len(chapters),
            "target_count": len(new_chapters),
            "new_chapters": new_chapters,
            "deleted_chapter_ids": deleted_ids,
            "message": f"成功合并为 {len(new_chapters)} 章（删除 {len(deleted_ids)} 章）",
        }

    # ── 收缩 Prompt ──────────────────────────────────────────────

    async def _generate_contract_plan(
        self,
        model_id: Optional[int],
        context: str,
        chapters: list,
        target_count: int,
        instructions: str,
    ) -> list[dict]:
        chapters_info = []
        for ch in chapters:
            chapters_info.append(f"""
### 第{ch.chapter_no}章（ID: {ch.id}）《{ch.title}》
摘要：{ch.chapter_summary or '无'}
正文（前2000字）：{(ch.chapter_text or '')[:2000]}""")

        prompt = f"""{context}

## 任务：章节合并

我需要将以下 {len(chapters)} 章内容合并为 {target_count} 章。

### 原始章节内容：
{chr(10).join(chapters_info)}

### 用户指令：
{instructions or "请合并相邻章节，精简冗余内容，保持核心情节和角色发展。"}

请返回一个 JSON 数组，包含 {target_count} 个合并组。每个合并组对象包含：
- source_chapters: 被合并的原始章节，每个包含 id 和 chapter_no
- keep_chapter_id: 保留哪个原始章节的 ID
- merged_data: 合并后的章节数据（title, chapter_summary, chapter_goal, conflict, ending_hook, chapter_text, scene_list）

要求：
1. 尽量按顺序相邻合并
2. 保留核心情节，删除冗余
3. 合并后的正文要流畅自然，不要有明显的拼接痕迹
4. 保持角色一致性和世界观一致性

只输出 JSON 数组，不要其他内容。"""

        result = await call_llm(
            self.db, model_id, prompt,
            system_prompt="你是一位专业的小说编辑，擅长章节合并和节奏把控。",
            max_tokens=16000,
            temperature=0.6,
        )

        plan = safe_parse_json(result)
        if not isinstance(plan, list):
            plan = self._default_contract_plan(chapters, target_count)
        return plan

    # ── 默认扩展计划（Fallback） ────────────────────────────────

    def _default_expand_plan(self, chapters: list, target_count: int) -> list[dict]:
        plan = []
        expansion_ratio = target_count / len(chapters)
        for ch in chapters:
            num_expanded = max(1, int(expansion_ratio))
            for i in range(num_expanded):
                plan.append({
                    "title": f"第{ch.chapter_no}章（续{i + 1}）{ch.title}",
                    "chapter_goal": ch.chapter_goal or "",
                    "chapter_summary": f"{ch.chapter_summary or ''}（扩展部分）",
                    "conflict": ch.conflict or "",
                    "ending_hook": ch.ending_hook or "",
                    "scene_list": [],
                    "chapter_text": f"【扩展章节，基于第{ch.chapter_no}章《{ch.title}》拆分，正文待生成】",
                })
        while len(plan) < target_count:
            plan.append({
                "title": "新增章节", "chapter_goal": "",
                "chapter_summary": "扩展章节，正文待生成",
                "conflict": "", "ending_hook": "",
                "scene_list": [], "chapter_text": "【扩展章节，正文待生成】",
            })
        return plan[:target_count]

    # ── 默认收缩计划（Fallback） ────────────────────────────────

    def _default_contract_plan(self, chapters: list, target_count: int) -> list[dict]:
        if not chapters:
            return []
        groups_per_merge = len(chapters) // target_count
        plan = []
        idx = 0
        for i in range(target_count):
            end_idx = idx + groups_per_merge if i < target_count - 1 else len(chapters)
            group_chapters = chapters[idx:end_idx]
            idx = end_idx
            if not group_chapters:
                continue
            keep = group_chapters[0]
            merged_text = "\n\n---\n\n".join(ch.chapter_text for ch in group_chapters if ch.chapter_text)
            plan.append({
                "source_chapters": [{"id": ch.id, "chapter_no": ch.chapter_no} for ch in group_chapters],
                "keep_chapter_id": keep.id,
                "merged_data": {
                    "title": keep.title,
                    "chapter_summary": " ".join(ch.chapter_summary for ch in group_chapters if ch.chapter_summary),
                    "chapter_goal": keep.chapter_goal or "",
                    "conflict": keep.conflict or "",
                    "ending_hook": group_chapters[-1].ending_hook or "",
                    "chapter_text": merged_text,
                    "scene_list": [],
                },
            })
        return plan

    # ── 工具方法 ─────────────────────────────────────────────────

    def _build_context(self, project_id: int, chapters: list) -> str:
        project = get_novel_project(self.db, project_id)
        world_list = list_worldbuilding(self.db, project_id)
        characters = list_characters(self.db, project_id)

        parts = []
        if project:
            parts.append(f"## 项目：《{project.title}》")
            parts.append(f"- 题材：{project.genre or '未设置'}")
            if project.style_tags:
                parts.append(f"- 风格：{', '.join(project.style_tags)}")

        if world_list:
            w = world_list[0]
            parts.append(f"\n## 世界观\n{w.world_summary[:500]}")
            if w.rules:
                parts.append(f"核心规则：{', '.join(w.rules)}")

        if characters:
            char_list = []
            for c in characters:
                char_list.append(f"- {c.name}（{c.role_type or '角色'}）：目标={c.goal or '未设置'}")
            parts.append(f"\n## 角色\n" + "\n".join(char_list))
        return "\n".join(parts)

    async def _resequence_chapters(self, db: Session, project_id: int):
        """重排项目下所有章节的 chapter_no"""
        all_chapters = list_chapters(db, project_id)
        all_chapters.sort(key=lambda c: c.chapter_no)
        for i, ch in enumerate(all_chapters):
            update_chapter(db, ch.id, {"chapter_no": i + 1})

    def _record(self, project_id: int, run_type: str, step_name: str, payload: dict):
        create_run_record(self.db, {
            "project_id": project_id, "run_type": run_type,
            "step_name": step_name, "status": "completed",
            "input_ref": json.dumps(payload, ensure_ascii=False),
            "output_ref": "", "duration_ms": 0, "error_message": "",
        })
