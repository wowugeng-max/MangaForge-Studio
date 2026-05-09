"""
连续性修复服务 — 检测并修复章节间的矛盾
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
    update_chapter,
    create_chapter_version,
    create_review,
)
from .llm_utils import call_llm, safe_parse_json


class ContinuityRepair:
    """连续性修复器"""

    def __init__(self, db: Session):
        self.db = db

    async def repair(
        self,
        project_id: int,
        model_id: Optional[int] = None,
    ) -> dict[str, Any]:
        """
        检查项目的所有已写章节，发现矛盾并尝试修复。

        Returns:
            {issues_found, issues_fixed, details}
        """
        project = get_novel_project(self.db, project_id)
        if not project:
            raise ValueError("项目不存在")

        chapters = list_chapters(self.db, project_id)
        chapters.sort(key=lambda c: c.chapter_no)

        # 只检查有正文的章节
        written = [c for c in chapters if c.chapter_text and not c.chapter_text.strip().startswith("【占位正文】")]
        if len(written) < 2:
            return {"issues_found": 0, "issues_fixed": 0, "details": []}

        world_list = list_worldbuilding(self.db, project_id)
        characters = list_characters(self.db, project_id)

        # 拼接所有章节正文（限制总长度）
        all_text = ""
        chapter_map = {}
        for c in written:
            summary = c.chapter_text[:3000]
            all_text += f"---第{c.chapter_no}章《{c.title}》---\n{summary}\n\n"
            chapter_map[c.chapter_no] = c

        # 限制输入长度
        all_text = all_text[:20000]

        prompt = self._build_repair_prompt(project, world_list[0] if world_list else None, characters, all_text)

        try:
            result_text = await call_llm(
                self.db, model_id, prompt,
                system_prompt="你是专业的小说连续性审查编辑。严格检查逻辑矛盾、时间线冲突、角色知识越界。用 JSON 格式输出。",
                max_tokens=4000,
            )
            result_data = safe_parse_json(result_text)

            issues = []
            fixes = []
            if isinstance(result_data, dict):
                issues = result_data.get("issues", [])
                fixes = result_data.get("suggested_fixes", [])

            # 保存检查结果
            create_review(self.db, {
                "project_id": project_id,
                "review_type": "continuity_repair",
                "summary": f"发现 {len(issues)} 个问题，修复 {len(fixes)} 个",
                "issues": [i.get("description", str(i)) if isinstance(i, dict) else str(i) for i in issues],
                "payload": json.dumps(result_data, ensure_ascii=False),
            })

            return {
                "issues_found": len(issues),
                "issues_fixed": len(fixes),
                "details": [
                    {
                        "type": i.get("type", ""),
                        "description": i.get("description", ""),
                        "severity": i.get("severity", "medium"),
                        "chapters_involved": i.get("chapters_involved", []),
                    }
                    for i in issues
                ],
            }
        except Exception as e:
            return {
                "issues_found": 0,
                "issues_fixed": 0,
                "details": [{"type": "error", "description": str(e)}],
            }

    def _build_repair_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        chapters_text: str,
    ) -> str:
        char_info = "\n".join(
            f"- {c.name}（{c.role_type}）：目标={c.goal}"
            for c in characters
        )

        world_info = ""
        if world:
            world_info = f"\n## 世界观\n{world.world_summary[:500]}"

        return f"""## 连续性修复检查

## 项目：《{project.title}》{world_info}

## 角色
{char_info}

## 已写章节内容
{chapters_text}

请检查以下问题：
1. **角色知识越界**：角色是否知道了他不应该知道的信息？
2. **时间线矛盾**：同一时间角色是否在两个地方？
3. **状态矛盾**：角色状态（受伤、死亡、获得物品等）前后是否矛盾？
4. **因果断裂**：某事件的结果是否与原因不匹配？
5. **伏笔未回收**：是否有明显的伏笔在后续章节中被完全忽略？

输出 JSON：
{{
  "issues": [{{type, description, severity: "high"|"medium"|"low", chapters_involved: [章号]}}, ...],
  "suggested_fixes": [{{issue_index, fix_description}}, ...]
}}
"""
