"""
正文生成服务 — 单章 LLM 驱动的正文生成
"""
from __future__ import annotations

import json
from typing import Any, Optional, AsyncGenerator

from sqlalchemy.orm import Session

from .storage import (
    get_novel_project,
    list_worldbuilding,
    list_characters,
    list_outlines,
    list_chapters,
    get_chapter,
    update_chapter,
    create_chapter_version,
)
from .llm_utils import call_llm


class ProseGenerator:
    """单章正文生成器"""

    def __init__(self, db: Session):
        self.db = db

    async def generate(
        self,
        chapter_id: int,
        model_id: Optional[int] = None,
        stream: bool = False,
    ) -> Any:
        """
        生成单章正文。

        Args:
            chapter_id: 章节 ID
            model_id: 模型 ID
            stream: 是否流式返回

        Returns:
            非流式：生成的正文文本
            流式：AsyncGenerator
        """
        chapter = get_chapter(self.db, chapter_id)
        if not chapter:
            raise ValueError("章节不存在")

        project = get_novel_project(self.db, chapter.project_id)
        if not project:
            raise ValueError("项目不存在")

        world_list = list_worldbuilding(self.db, chapter.project_id)
        characters = list_characters(self.db, chapter.project_id)
        outlines = list_outlines(self.db, chapter.project_id)
        chapters = list_chapters(self.db, chapter.project_id)

        # 获取前一章的正文（上下文）
        prev_chapters = [c for c in chapters if c.chapter_no < chapter.chapter_no]
        prev_chapters.sort(key=lambda c: c.chapter_no, reverse=True)
        prev_chapter_text = prev_chapters[0].chapter_text[:1500] if prev_chapters else ""

        # 获取本章细纲
        chapter_outline = next(
            (o for o in outlines if o.outline_type == "chapter" and o.summary and chapter.chapter_summary and o.summary[:50] == chapter.chapter_summary[:50]),
            None,
        )
        outline_text = chapter_outline.summary if chapter_outline else chapter.chapter_summary

        prompt = self._build_prose_prompt(
            project, world_list[0] if world_list else None,
            characters, chapter, outline_text, prev_chapter_text,
        )

        if stream:
            return self._generate_stream(chapter_id, prompt, model_id)

        text = await call_llm(
            self.db, model_id, prompt,
            system_prompt="你是一位专业的小说作家，擅长生动描写和紧凑叙事。请直接输出小说正文，不要任何额外说明。",
            max_tokens=12000,
            temperature=0.8,
        )

        # 保存生成的正文
        current_version = chapter.version or 1
        # 创建版本快照
        create_chapter_version(self.db, {
            "chapter_id": chapter_id,
            "version_no": current_version,
            "chapter_text": chapter.chapter_text or "",
            "source": "agent_execute",
        })

        update_chapter(self.db, chapter_id, {
            "chapter_text": text,
            "version": current_version + 1,
        })

        return text

    async def _generate_stream(
        self,
        chapter_id: int,
        prompt: str,
        model_id: Optional[int],
    ) -> AsyncGenerator[str, None]:
        """
        流式生成正文。由于适配器不支持流式，这里采用分段调用的方式模拟。
        实际生产环境可对接支持 SSE 的 LLM provider。
        """
        # 当前适配器不支持原生 SSE，采用分段落生成模拟流式
        paragraph_prompt = prompt + "\n\n请分段输出，每次只输出一段（约 200-300 字），不要一次性输出全文。"

        text = await call_llm(
            self.db, model_id, paragraph_prompt,
            system_prompt="你是一位专业的小说作家。请直接输出小说正文，不要任何额外说明。",
            max_tokens=6000,
            temperature=0.8,
        )

        # 按段落切分，模拟流式效果
        paragraphs = text.split("\n\n")
        for para in paragraphs:
            if para.strip():
                yield para.strip() + "\n\n"

        # 保存最终结果
        chapter = get_chapter(self.db, chapter_id)
        if chapter:
            current_version = chapter.version or 1
            create_chapter_version(self.db, {
                "chapter_id": chapter_id,
                "version_no": current_version,
                "chapter_text": chapter.chapter_text or "",
                "source": "agent_execute",
            })
            update_chapter(self.db, chapter_id, {
                "chapter_text": text,
                "version": current_version + 1,
            })

    def _build_prose_prompt(
        self,
        project: Any,
        world: Any,
        characters: list,
        chapter: Any,
        outline_text: str,
        prev_chapter_text: str,
    ) -> str:
        parts = []
        parts.append(f"## 任务：生成第 {chapter.chapter_no} 章《{chapter.title}》的完整正文")

        parts.append(f"\n## 项目设定\n- 《{project.title}》| {project.genre}")
        if project.style_tags:
            parts.append(f"- 风格：{', '.join(project.style_tags)}")

        if world:
            parts.append(f"\n## 世界观\n{world.world_summary[:500]}")
            if world.rules:
                parts.append(f"核心规则：{', '.join(world.rules)}")

        # 角色信息（含知识边界）
        relevant_chars = []
        for c in characters:
            state = c.current_state or {}
            info_boundary = ""
            if state.get("information_boundaries"):
                info_boundary = f" | 注意：{c.name} 不知道 {len(state['information_boundaries'])} 个事件"
            relevant_chars.append(f"- {c.name}（{c.role_type}）：目标={c.goal}{info_boundary}")

        if relevant_chars:
            parts.append(f"\n## 涉及角色\n" + "\n".join(relevant_chars))

        parts.append(f"\n## 本章细纲\n{outline_text}")
        if chapter.chapter_goal:
            parts.append(f"\n## 章节目标\n{chapter.chapter_goal}")
        if chapter.conflict:
            parts.append(f"\n## 核心冲突\n{chapter.conflict}")
        if chapter.ending_hook:
            parts.append(f"\n## 结尾钩子\n{chapter.ending_hook}")

        if prev_chapter_text:
            parts.append(f"\n## 前一章结尾（上下文衔接）\n{prev_chapter_text[:800]}")

        parts.append("""
请根据以上信息生成完整的章节正文。要求：
1. 语言流畅自然，符合小说文风
2. 对话生动，描写细腻
3. 场景转换自然
4. 角色视角符合其知识范围（不出现上帝视角）
5. 结尾留有悬念

直接输出正文内容。
""")
        return "\n".join(parts)
