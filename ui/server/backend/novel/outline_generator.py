"""
细纲生成服务 — LLM 驱动的大纲/细纲生成核心逻辑

支持功能：
1. 控制细纲数量 (chapterCount)
2. 从最新细纲继续生成 (continueFrom)
3. 基于用户大纲扩展 (userOutline)
4. 同步更新世界观和角色信息
5. 角色知识追踪（信息隔离）
"""
from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from .storage import (
    get_novel_project,
    list_worldbuilding,
    upsert_worldbuilding,
    list_characters,
    create_character,
    update_character,
    list_outlines,
    create_outline,
    list_chapters,
    create_chapter,
    create_review,
    list_reviews,
)
from .llm_utils import call_llm, safe_parse_json
from .schemas import AgentExecutionResult


class OutlineGenerator:
    """细纲生成器 — 核心服务类"""

    def __init__(self, db: Session):
        self.db = db

    async def generate(
        self,
        project_id: int,
        model_id: Optional[int] = None,
        *,
        chapter_count: Optional[int] = None,
        continue_from: Optional[int] = None,
        user_outline: Optional[str] = None,
    ) -> list[AgentExecutionResult]:
        """
        生成细纲（每章一个细纲），同时同步更新世界观和角色。

        Args:
            project_id: 项目 ID
            model_id: 模型 ID（用于 LLM 调用）
            chapter_count: 要生成的细纲数量（章数），默认 10
            continue_from: 从第 N 章之后继续生成（即生成 N+1 到 N+chapter_count）
            user_outline: 用户提供的大纲文本，用于扩展

        Returns:
            AgentExecutionResult 列表，包含每一步的执行结果
        """
        results: list[AgentExecutionResult] = []

        project = get_novel_project(self.db, project_id)
        if not project:
            return [AgentExecutionResult(step=0, agent_id="validate", success=False, error="项目不存在")]

        # 读取当前项目上下文
        world_list = list_worldbuilding(self.db, project_id)
        world = world_list[0] if world_list else None
        characters = list_characters(self.db, project_id)
        existing_outlines = list_outlines(self.db, project_id)
        existing_chapters = list_chapters(self.db, project_id)

        # 确定生成模式
        if continue_from is not None:
            # 续写模式：从第 continue_from 章之后继续
            start_chapter_no = continue_from + 1
            end_chapter_no = continue_from + (chapter_count or 10)
            # 获取已有的细纲作为上下文
            previous_outlines = [o for o in existing_outlines if o.outline_type == "chapter"]
            previous_outlines.sort(key=lambda o: o.id)
        elif user_outline:
            # 用户大纲扩展模式
            start_chapter_no = 1
            end_chapter_no = chapter_count or 10
            previous_outlines = []
        else:
            # 从头生成模式
            start_chapter_no = 1
            end_chapter_no = chapter_count or 10
            previous_outlines = [o for o in existing_outlines if o.outline_type == "chapter"]

        # ── Step 1: 生成总纲（如果还没有） ──
        master_outline = next((o for o in existing_outlines if o.outline_type == "master"), None)
        if not master_outline:
            try:
                outline_prompt = self._build_master_outline_prompt(
                    project, world, characters, user_outline
                )
                outline_text = await call_llm(
                    self.db, model_id, outline_prompt,
                    system_prompt="你是一个专业的小说策划编辑，擅长构建完整的故事框架。请用 JSON 格式输出。",
                    max_tokens=4000,
                )
                outline_data = safe_parse_json(outline_text)
                if isinstance(outline_data, dict):
                    master_outline = create_outline(self.db, {
                        "project_id": project_id,
                        "outline_type": "master",
                        "title": outline_data.get("title", f"{project.title} 总纲"),
                        "summary": outline_data.get("summary", outline_text[:500]),
                        "beats": outline_data.get("beats", []),
                        "conflict_points": outline_data.get("conflict_points", []),
                        "turning_points": outline_data.get("turning_points", []),
                        "hook": outline_data.get("hook", ""),
                        "target_length": project.length_target,
                    })
                else:
                    master_outline = create_outline(self.db, {
                        "project_id": project_id,
                        "outline_type": "master",
                        "title": f"{project.title} 总纲",
                        "summary": outline_text[:1000],
                        "target_length": project.length_target,
                    })
                results.append(AgentExecutionResult(step=1, agent_id="outline-agent", success=True, output={"type": "master_outline_created"}))
            except Exception as e:
                results.append(AgentExecutionResult(step=1, agent_id="outline-agent", success=False, error=str(e)))
                return results

        # ── Step 2: 生成细纲（每章一个） ──
        detail_outlines_generated = []
        try:
            detail_prompt = self._build_detail_outline_prompt(
                project, world, characters, master_outline,
                previous_outlines, start_chapter_no, end_chapter_no,
                user_outline,
            )
            detail_text = await call_llm(
                self.db, model_id, detail_prompt,
                system_prompt="你是一个专业的小说策划编辑。请为每一章生成详细的细纲。严格使用 JSON 数组格式输出，每个元素包含 chapter_no, title, summary, conflict, ending_hook, scene_list, involved_characters 字段。",
                max_tokens=8000,
            )
            detail_data = safe_parse_json(detail_text)

            if isinstance(detail_data, list):
                for item in detail_data:
                    if isinstance(item, dict):
                        chapter_no = item.get("chapter_no", start_chapter_no)
                        outline = create_outline(self.db, {
                            "project_id": project_id,
                            "outline_type": "chapter",
                            "parent_id": master_outline.id,
                            "title": item.get("title", f"第{chapter_no}章"),
                            "summary": item.get("summary", ""),
                            "beats": item.get("scene_list", []),
                            "conflict_points": [item.get("conflict", "")] if item.get("conflict") else [],
                            "hook": item.get("ending_hook", ""),
                            "target_length": "",
                        })
                        detail_outlines_generated.append(outline)

                        # 同时创建对应的章节记录（占位）
                        create_chapter(self.db, {
                            "project_id": project_id,
                            "chapter_no": chapter_no,
                            "title": item.get("title", f"第{chapter_no}章"),
                            "chapter_goal": item.get("summary", ""),
                            "chapter_summary": item.get("summary", ""),
                            "conflict": item.get("conflict", ""),
                            "ending_hook": item.get("ending_hook", ""),
                            "outline_id": outline.id,
                            "status": "draft",
                            "chapter_text": "",
                        })

            results.append(AgentExecutionResult(
                step=2, agent_id="detail-outline-agent", success=True,
                output={"generated_count": len(detail_outlines_generated), "start": start_chapter_no, "end": end_chapter_no}
            ))
        except Exception as e:
            results.append(AgentExecutionResult(step=2, agent_id="detail-outline-agent", success=False, error=str(e)))
            return results

        # ── Step 3: 同步更新世界观 ──
        try:
            world_update_prompt = self._build_worldbuilding_update_prompt(
                project, world, characters, previous_outlines + detail_outlines_generated
            )
            world_update_text = await call_llm(
                self.db, model_id, world_update_prompt,
                system_prompt="分析新细纲对世界观的影响，提取需要新增或修改的设定。用 JSON 格式输出 {new_rules: [], new_factions: [], new_locations: [], new_systems: [], known_unknowns: []}。如果没有变化返回空数组。",
                max_tokens=2000,
            )
            world_update_data = safe_parse_json(world_update_text)
            if isinstance(world_update_data, dict) and world:
                updates = {}
                for key in ["rules", "factions", "locations", "systems", "known_unknowns"]:
                    if key in world_update_data and world_update_data[key]:
                        current = getattr(world, key, []) or []
                        # 合并，去重
                        if isinstance(current, list) and isinstance(world_update_data[key], list):
                            merged = current + [x for x in world_update_data[key] if x not in current]
                            updates[key] = merged

                if updates:
                    updates["version"] = (world.version or 1) + 1
                    upsert_worldbuilding(self.db, project_id, updates)

            results.append(AgentExecutionResult(step=3, agent_id="worldbuilding-sync", success=True, output={"updated": bool(world_update_data)}))
        except Exception as e:
            results.append(AgentExecutionResult(step=3, agent_id="worldbuilding-sync", success=False, error=str(e)))

        # ── Step 4: 同步更新角色 ──
        try:
            char_update_prompt = self._build_character_update_prompt(
                project, characters, previous_outlines + detail_outlines_generated
            )
            char_update_text = await call_llm(
                self.db, model_id, char_update_prompt,
                system_prompt="分析新细纲中涉及的角色变化，包括新角色出现、角色关系变化、角色状态更新。用 JSON 数组格式输出，每个元素包含 character_id（已有角色则填id，新角色则为null）, name, updates: {motivation, goal, conflict, relationship_graph, current_state, abilities}。",
                max_tokens=2000,
            )
            char_update_data = safe_parse_json(char_update_text)
            if isinstance(char_update_data, list):
                for item in char_update_data:
                    if not isinstance(item, dict):
                        continue
                    char_id = item.get("character_id")
                    updates = item.get("updates", {})
                    if char_id:
                        # 更新已有角色
                        existing = next((c for c in characters if c.id == char_id), None)
                        if existing:
                            update_data = {"version": (existing.version or 1) + 1}
                            update_data.update({k: v for k, v in updates.items() if v is not None})
                            update_character(self.db, char_id, update_data)
                    else:
                        # 新角色
                        create_character(self.db, {
                            "project_id": project_id,
                            "name": item.get("name", "未知角色"),
                            "role_type": updates.get("role_type", ""),
                            "archetype": updates.get("archetype", ""),
                            "motivation": updates.get("motivation", ""),
                            "goal": updates.get("goal", ""),
                            "conflict": updates.get("conflict", ""),
                            "relationship_graph": updates.get("relationship_graph", {}),
                            "current_state": updates.get("current_state", {}),
                            "abilities": updates.get("abilities", []),
                        })

            results.append(AgentExecutionResult(step=4, agent_id="character-sync", success=True, output={"processed": len(char_update_data) if char_update_data else 0}))
        except Exception as e:
            results.append(AgentExecutionResult(step=4, agent_id="character-sync", success=False, error=str(e)))

        # ── Step 5: 连续性预检 ──
        try:
            continuity_prompt = self._build_continuity_check_prompt(
                project, world, characters, existing_outlines + detail_outlines_generated
            )
            continuity_text = await call_llm(
                self.db, model_id, continuity_prompt,
                system_prompt="检查细纲的连续性和逻辑一致性，包括角色知识隔离（角色不能知道与其无关的信息）、时间线矛盾、伏笔回收等。用 JSON 格式输出 {issues: [{type, description, severity, suggestion}]}。",
                max_tokens=2000,
            )
            continuity_data = safe_parse_json(continuity_text)

            issues = []
            if isinstance(continuity_data, dict):
                issues = continuity_data.get("issues", [])

            # 保存预检结果
            create_review(self.db, {
                "project_id": project_id,
                "review_type": "continuity_check",
                "summary": f"发现 {len(issues)} 个连续性问题",
                "issues": [i.get("description", "") if isinstance(i, dict) else str(i) for i in issues],
                "payload": json.dumps(continuity_data, ensure_ascii=False),
            })

            results.append(AgentExecutionResult(
                step=5, agent_id="continuity-check-agent", success=True,
                output={"issues_count": len(issues), "issues": issues}
            ))
        except Exception as e:
            results.append(AgentExecutionResult(step=5, agent_id="continuity-check-agent", success=False, error=str(e)))

        # ── Step 6: 角色知识追踪快照 ──
        try:
            knowledge_snapshot = self._build_knowledge_snapshot(characters, detail_outlines_generated)
            for char_id, knowledge in knowledge_snapshot.items():
                update_character(self.db, char_id, {
                    "current_state": {
                        **(knowledge.get("current_state") or {}),
                        "known_events": knowledge.get("known_events", []),
                        "information_boundaries": knowledge.get("information_boundaries", []),
                    },
                    "version": None,  # 避免覆盖版本号
                })
            results.append(AgentExecutionResult(step=6, agent_id="knowledge-tracker", success=True, output={"characters_updated": len(knowledge_snapshot)}))
        except Exception as e:
            results.append(AgentExecutionResult(step=6, agent_id="knowledge-tracker", success=False, error=str(e)))

        return results

    # ── Prompt 构建器 ─────────────────────────────────────────────

    def _build_master_outline_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        user_outline: Optional[str],
    ) -> str:
        parts = []
        parts.append(f"## 项目信息\n- 标题：《{project.title}》\n- 题材：{project.genre}\n- 篇幅目标：{project.length_target}\n- 目标读者：{project.target_audience}")
        if project.style_tags:
            parts.append(f"- 风格：{', '.join(project.style_tags)}")

        if world:
            parts.append(f"\n## 世界观\n{world.world_summary}")
            if world.rules:
                parts.append(f"核心规则：{', '.join(world.rules)}")

        if characters:
            char_info = "\n".join(
                f"- {c.name}（{c.role_type}）：{c.motivation}" for c in characters
            )
            parts.append(f"\n## 主要角色\n{char_info}")

        if user_outline:
            parts.append(f"\n## 用户提供的大纲\n{user_outline}")
            parts.append("\n请基于用户提供的大纲进行扩展和深化，保留核心设定，补充细节和结构。")

        parts.append("""
请生成完整的故事总纲，包含以下字段：
- title: 总纲标题
- summary: 故事核心摘要（500字以内）
- beats: 主要情节节点列表
- conflict_points: 核心冲突点列表
- turning_points: 关键转折点列表
- hook: 故事的核心吸引力/钩子

只输出 JSON，不要其他内容。
""")
        return "\n".join(parts)

    def _build_detail_outline_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        master_outline: Any,
        previous_outlines: list,
        start_no: int,
        end_no: int,
        user_outline: Optional[str],
    ) -> str:
        parts = []
        parts.append(f"## 任务：生成第 {start_no} 章 到 第 {end_no} 章 的细纲")

        parts.append(f"\n## 项目背景\n- 《{project.title}》 | {project.genre} | {', '.join(project.style_tags or [])}")

        if world:
            parts.append(f"\n## 世界观\n{world.world_summary}")
            if world.rules:
                parts.append(f"核心规则：{', '.join(world.rules)}")

        if master_outline:
            parts.append(f"\n## 总纲\n{master_outline.summary[:500]}")
            if master_outline.beats:
                parts.append(f"主要情节节点：{', '.join(master_outline.beats)}")

        # 角色信息（带知识边界标记）
        if characters:
            char_lines = []
            for c in characters:
                knowledge_bound = ""
                state = c.current_state or {}
                if state.get("information_boundaries"):
                    knowledge_bound = f" | 信息边界：{', '.join(state['information_boundaries'])}"
                char_lines.append(f"- {c.name}（{c.role_type}）：目标={c.goal}{knowledge_bound}")
            parts.append(f"\n## 角色信息\n" + "\n".join(char_lines))

        if previous_outlines:
            prev_text = "\n".join(
                f"第{o.id}章《{o.title}》：{o.summary[:200]}"
                for o in previous_outlines[-10:]  # 最近10章
            )
            parts.append(f"\n## 已有细纲（最近章节）\n{prev_text}")

        if user_outline:
            parts.append(f"\n## 用户大纲参考\n{user_outline}")

        parts.append(f"""
请生成 {end_no - start_no + 1} 个细纲（第 {start_no} 到第 {end_no} 章）。
每个细纲必须包含以下字段：
- chapter_no: 章节号（整数）
- title: 章节标题
- summary: 本章核心内容摘要（200-300字）
- conflict: 本章的核心冲突
- ending_hook: 章末悬念/钩子
- scene_list: 场景列表（每个场景一句话描述）
- involved_characters: 本章涉及的角色名列表

重要约束：
1. 角色不能知道与他们无关的事件信息
2. 保持与前文的连续性
3. 每个章节有明确的冲突和推进

只输出 JSON 数组，不要其他内容。
""")
        return "\n".join(parts)

    def _build_worldbuilding_update_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        all_outlines: list,
    ) -> str:
        parts = [f"## 项目：《{project.title}》"]
        if world:
            parts.append(f"\n## 当前世界观\n{world.world_summary}")
            if world.rules:
                parts.append(f"现有规则：{', '.join(world.rules)}")
            if world.known_unknowns:
                parts.append(f"未知项：{', '.join(world.known_unknowns)}")

        chapter_outlines = [o for o in all_outlines if o.outline_type == "chapter"]
        if chapter_outlines:
            outline_text = "\n".join(
                f"第{o.id}章《{o.title}》：{o.summary[:200]}"
                for o in chapter_outlines[-15:]
            )
            parts.append(f"\n## 细纲摘要\n{outline_text}")

        parts.append("""
请分析细纲内容，提取需要新增或修改的世界观设定。
重点关注：新的规则、势力、地点、系统、未解之谜。

输出 JSON 格式：{new_rules: [], new_factions: [], new_locations: [], new_systems: [], known_unknowns: []}
如果没有变化返回空数组。
""")
        return "\n".join(parts)

    def _build_character_update_prompt(
        self,
        project: Any,
        characters: list,
        all_outlines: list,
    ) -> str:
        char_info = "\n".join(
            f"- {c.id}: {c.name}（{c.role_type}）当前目标={c.goal}，冲突={c.conflict[:100] if c.conflict else '无'}"
            for c in characters
        )

        chapter_outlines = [o for o in all_outlines if o.outline_type == "chapter"]
        outline_text = "\n".join(
            f"第{o.id}章《{o.title}》：{o.summary[:200]}"
            for o in chapter_outlines[-15:]
        )

        return f"""## 项目：《{project.title}》

## 现有角色
{char_info}

## 细纲内容
{outline_text}

请分析细纲中涉及的角色变化，包括新角色出现、角色关系变化、角色状态更新。
用 JSON 数组格式输出，每个元素包含：
- character_id: 已有角色的 ID，新角色则为 null
- name: 角色名
- updates: {{role_type, motivation, goal, conflict, relationship_graph, current_state, abilities}} 中需要更新的字段

只输出 JSON 数组。
"""

    def _build_continuity_check_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        all_outlines: list,
    ) -> str:
        char_info = "\n".join(
            f"- {c.name}（{c.role_type}）：目标={c.goal}"
            for c in characters
        )

        chapter_outlines = [o for o in all_outlines if o.outline_type == "chapter"]
        chapter_outlines.sort(key=lambda o: o.id)
        outline_text = "\n".join(
            f"第{o.id}章《{o.title}》：{o.summary[:300]}"
            for o in chapter_outlines
        )

        return f"""## 连续性检查任务

请检查以下细纲的连续性和逻辑一致性：

## 角色
{char_info}

## 细纲全文
{outline_text}

检查维度：
1. **角色知识隔离**：角色是否知道与其无关的事件？是否出现"上帝视角"？
2. **时间线一致性**：事件顺序是否合理？时间线是否矛盾？
3. **因果关系**：前因后果是否连贯？是否有突兀的转折？
4. **伏笔回收**：是否有未回收的关键伏笔？
5. **角色一致性**：角色行为是否符合其设定和目标？

输出 JSON 格式：{{issues: [{{type, description, severity: "high"|"medium"|"low", suggestion}}]}}
如果没有问题返回空数组。
"""

    def _build_knowledge_snapshot(
        self,
        characters: list,
        new_outlines: list,
    ) -> dict[int, Any]:
        """
        基于新细纲构建角色知识快照。

        分析每章涉及的角色，构建他们"知道"什么、"不知道"什么。
        用于后续的正文生成时控制角色视角。
        """
        snapshot = {}

        for char in characters:
            known_events = []
            for outline in new_outlines:
                if char.name in str(outline.summary):
                    known_events.append({
                        "outline_id": outline.id,
                        "event": outline.summary[:200],
                        "involvement": "direct" if char.name in str(outline.summary) else "observer",
                    })

            # 信息边界：角色不知道其他角色独自经历的事件
            all_events = [o.summary[:200] for o in new_outlines]
            char_event_texts = set(e["event"] for e in known_events)
            boundaries = []
            for event_text in all_events:
                if event_text not in char_event_texts:
                    boundaries.append(event_text[:100])

            if known_events or boundaries:
                snapshot[char.id] = {
                    "current_state": {"name": char.name},
                    "known_events": known_events,
                    "information_boundaries": boundaries[:10],  # 限制数量，避免过大
                }

        return snapshot
