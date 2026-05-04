from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .coordinator import NovelCoordinator, NovelAgentResult
from .storage import create_run_record


class NovelMarketWorker:
    def __init__(self, db: Session):
        self.db = db

    def analyze(self, project_id: int, payload: dict[str, Any] | None = None) -> NovelAgentResult:
        payload = payload or {}
        return NovelAgentResult(
            step="market",
            success=True,
            output={
                "genre": payload.get("genre", ""),
                "style_tags": payload.get("style_tags", []),
                "commercial_tags": payload.get("commercial_tags", []),
                "note": "market analysis skeleton",
            },
        )


class NovelWorldbuildingWorker:
    def __init__(self, db: Session):
        self.db = db

    def build(self, project_id: int, prompt: str, payload: dict[str, Any] | None = None) -> NovelAgentResult:
        payload = payload or {}
        coordinator = NovelCoordinator(self.db)
        results = coordinator.plan(project_id, prompt, {**payload, "characters": [], "chapter": None})
        world = next((item for item in results if item.step == "worldbuilding"), None)
        return world or NovelAgentResult(step="worldbuilding", success=False, error="worldbuilding failed")


class NovelCharacterWorker:
    def __init__(self, db: Session):
        self.db = db

    def build(self, project_id: int, payload: dict[str, Any] | None = None) -> list[NovelAgentResult]:
        payload = payload or {}
        results: list[NovelAgentResult] = []
        for item in payload.get("characters", []):
            results.append(NovelAgentResult(step="character", success=True, output=item))
        return results


class NovelOutlineWorker:
    def __init__(self, db: Session):
        self.db = db

    def build(self, project_id: int, prompt: str, payload: dict[str, Any] | None = None) -> NovelAgentResult:
        payload = payload or {}
        coordinator = NovelCoordinator(self.db)
        results = coordinator.plan(project_id, prompt, {**payload, "characters": [], "chapter": None})
        outline = next((item for item in results if item.step == "outline"), None)
        return outline or NovelAgentResult(step="outline", success=False, error="outline failed")


class NovelChapterWorker:
    def __init__(self, db: Session):
        self.db = db

    def build(self, project_id: int, prompt: str, payload: dict[str, Any] | None = None) -> NovelAgentResult:
        payload = payload or {}
        coordinator = NovelCoordinator(self.db)
        results = coordinator.plan(project_id, prompt, {**payload, "characters": [], "chapter": payload.get("chapter") or payload})
        chapter = next((item for item in results if item.step == "chapter"), None)
        return chapter or NovelAgentResult(step="chapter", success=False, error="chapter failed")


class NovelReviewWorker:
    def __init__(self, db: Session):
        self.db = db

    def review(self, project_id: int, payload: dict[str, Any] | None = None) -> NovelAgentResult:
        payload = payload or {}
        return NovelAgentResult(
            step="review",
            success=True,
            output={
                "checks": payload.get("checks", ["continuity", "character", "timeline"]),
                "issues": [],
                "note": "review skeleton",
            },
        )


class NovelWorker:
    """小说 worker 编排器。"""

    def __init__(self, db: Session):
        self.db = db
        self.market = NovelMarketWorker(db)
        self.worldbuilding = NovelWorldbuildingWorker(db)
        self.character = NovelCharacterWorker(db)
        self.outline = NovelOutlineWorker(db)
        self.chapter = NovelChapterWorker(db)
        self.review = NovelReviewWorker(db)

    def run_plan(self, project_id: int, prompt: str, payload: dict[str, Any] | None = None) -> list[NovelAgentResult]:
        payload = payload or {}
        results: list[NovelAgentResult] = []

        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": "start",
            "status": "running",
            "input_ref": prompt,
        })

        market = self.market.analyze(project_id, payload)
        results.append(market)
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": market.step,
            "status": "success" if market.success else "failed",
            "output_ref": str(market.output),
            "error_message": market.error,
        })

        world = self.worldbuilding.build(project_id, prompt, payload)
        results.append(world)
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": world.step,
            "status": "success" if world.success else "failed",
            "output_ref": str(world.output),
            "error_message": world.error,
        })

        characters = self.character.build(project_id, payload)
        results.extend(characters)
        for item in characters:
            create_run_record(self.db, {
                "project_id": project_id,
                "run_type": "plan",
                "step_name": item.step,
                "status": "success" if item.success else "failed",
                "output_ref": str(item.output),
                "error_message": item.error,
            })

        outline = self.outline.build(project_id, prompt, payload)
        results.append(outline)
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": outline.step,
            "status": "success" if outline.success else "failed",
            "output_ref": str(outline.output),
            "error_message": outline.error,
        })

        chapter = self.chapter.build(project_id, prompt, payload)
        results.append(chapter)
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": chapter.step,
            "status": "success" if chapter.success else "failed",
            "output_ref": str(chapter.output),
            "error_message": chapter.error,
        })

        review = self.review.review(project_id, payload)
        results.append(review)
        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": review.step,
            "status": "success" if review.success else "failed",
            "output_ref": str(review.output),
            "error_message": review.error,
        })

        create_run_record(self.db, {
            "project_id": project_id,
            "run_type": "plan",
            "step_name": "finish",
            "status": "success",
            "output_ref": str({"steps": len(results)}),
        })

        return results
