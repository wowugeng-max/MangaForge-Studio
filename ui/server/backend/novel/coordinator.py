from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from .storage import (
    get_novel_project,
    upsert_worldbuilding,
    create_character,
    create_outline,
    create_chapter,
    create_run_record,
)


@dataclass
class NovelAgentResult:
    step: str
    success: bool
    output: dict[str, Any] = field(default_factory=dict)
    error: str = ""


class NovelCoordinator:
    """小说总控骨架。

    当前阶段只负责串起最小工作流：
    - 世界观
    - 角色
    - 大纲
    - 章节
    后续再接 restored-src 风格的 worker/task 调度。
    """

    def __init__(self, db: Session):
        self.db = db

    def _record(self, project_id: int, run_type: str, step_name: str, status: str, payload: dict[str, Any], result: dict[str, Any] | None = None, error: str = "") -> None:
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": run_type,
            "step_name": step_name,
            "status": status,
            "input_ref": str(payload),
            "output_ref": str(result or {}),
            "duration_ms": 0,
            "error_message": error,
        })

    def plan(self, project_id: int, prompt: str, payload: dict[str, Any] | None = None) -> list[NovelAgentResult]:
        payload = payload or {}
        project = get_novel_project(self.db, project_id)
        if not project:
            self._record(project_id, "plan", "plan", "failed", payload, error="Novel project not found")
            return [NovelAgentResult(step="plan", success=False, error="Novel project not found")]

        results: list[NovelAgentResult] = []
        self._record(project_id, "plan", "start", "running", {"prompt": prompt, "payload": payload})

        try:
            world = upsert_worldbuilding(self.db, project_id, {
                "world_summary": payload.get("world_summary") or f"为《{project.title}》建立基础世界观。",
                "rules": payload.get("rules", ["遵循核心设定", "保持人物一致性"]),
                "factions": payload.get("factions", []),
                "locations": payload.get("locations", []),
                "systems": payload.get("systems", []),
                "timeline_anchor": payload.get("timeline_anchor", "故事起点"),
                "known_unknowns": payload.get("known_unknowns", []),
                "version": payload.get("version", 1),
            })
            world_result = NovelAgentResult(step="worldbuilding", success=True, output={"id": world.id})
            results.append(world_result)
            self._record(project_id, "plan", "worldbuilding", "completed", payload, world_result.output)

            if payload.get("characters"):
                for character in payload["characters"]:
                    created = create_character(self.db, {"project_id": project_id, **character})
                    char_result = NovelAgentResult(step="character", success=True, output={"id": created.id, "name": created.name})
                    results.append(char_result)
                    self._record(project_id, "plan", "character", "completed", payload, char_result.output)

            outline = create_outline(self.db, {
                "project_id": project_id,
                "outline_type": payload.get("outline_type", "master"),
                "parent_id": payload.get("parent_id"),
                "title": payload.get("outline_title") or f"{project.title} 总纲",
                "summary": prompt or payload.get("summary", ""),
                "beats": payload.get("beats", []),
                "conflict_points": payload.get("conflict_points", []),
                "turning_points": payload.get("turning_points", []),
                "hook": payload.get("hook", ""),
                "target_length": payload.get("target_length", project.length_target),
                "version": payload.get("version", 1),
            })
            outline_result = NovelAgentResult(step="outline", success=True, output={"id": outline.id})
            results.append(outline_result)
            self._record(project_id, "plan", "outline", "completed", payload, outline_result.output)

            if payload.get("chapter"):
                chapter_payload = payload["chapter"]
                chapter = create_chapter(self.db, {
                    "project_id": project_id,
                    "chapter_no": chapter_payload.get("chapter_no", 1),
                    "title": chapter_payload.get("title", "第一章"),
                    "chapter_goal": chapter_payload.get("chapter_goal", prompt),
                    "chapter_summary": chapter_payload.get("chapter_summary", prompt),
                    "scene_list": chapter_payload.get("scene_list", []),
                    "chapter_text": chapter_payload.get("chapter_text", ""),
                    "conflict": chapter_payload.get("conflict", ""),
                    "ending_hook": chapter_payload.get("ending_hook", ""),
                    "status": chapter_payload.get("status", "draft"),
                    "version": chapter_payload.get("version", 1),
                    "published_at": chapter_payload.get("published_at"),
                })
                chapter_result = NovelAgentResult(step="chapter", success=True, output={"id": chapter.id, "chapter_no": chapter.chapter_no})
                results.append(chapter_result)
                self._record(project_id, "plan", "chapter", "completed", payload, chapter_result.output)

            self._record(project_id, "plan", "finish", "completed", payload, {"steps": len(results)})
            return results
        except Exception as exc:
            self._record(project_id, "plan", "error", "failed", payload, error=str(exc))
            raise

    def emit_run_record(self, project_id: int, run_type: str, step_name: str, status: str, **kwargs: Any) -> None:
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": run_type,
            "step_name": step_name,
            "status": status,
            "input_ref": kwargs.get("input_ref", ""),
            "output_ref": kwargs.get("output_ref", ""),
            "duration_ms": kwargs.get("duration_ms", 0),
            "error_message": kwargs.get("error_message", ""),
        })
