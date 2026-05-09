from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.db import get_db
from .schemas import (
    NovelProjectCreate,
    NovelProjectRead,
    NovelProjectUpdate,
    NovelWorldbuildingCreate,
    NovelWorldbuildingRead,
    NovelCharacterCreate,
    NovelCharacterRead,
    NovelOutlineCreate,
    NovelOutlineRead,
    NovelChapterCreate,
    NovelChapterRead,
    NovelChapterUpdate,
    NovelChapterVersionRead,
    NovelRollbackRequest,
    NovelReviewCreate,
    NovelReviewRead,
    NovelRunRecordRead,
    AgentExecutionRequest,
    AgentExecutionResult,
    AgentExecutionResponse,
    ProseGenerationRequest,
    RepairRequest,
    RepairResponse,
)
from .storage import (
    create_novel_project,
    get_novel_project,
    list_novel_projects,
    update_novel_project,
    delete_novel_project,
    list_worldbuilding,
    upsert_worldbuilding,
    list_characters,
    create_character,
    list_outlines,
    create_outline,
    delete_outline,
    list_chapters,
    create_chapter,
    get_chapter,
    update_chapter,
    delete_chapter,
    list_chapter_versions,
    create_chapter_version,
    get_chapter_version,
    list_reviews,
    create_review,
    list_runs,
)
from .outline_generator import OutlineGenerator
from .prose_generator import ProseGenerator
from .repair_service import ContinuityRepair

router = APIRouter(prefix="/api/novel", tags=["novel"])


# ════════════════════════════════════════════════════════════
#  Project CRUD
# ════════════════════════════════════════════════════════════

@router.get("/projects", response_model=list[NovelProjectRead])
def read_projects(db: Session = Depends(get_db)):
    return list_novel_projects(db)


@router.post("/projects", response_model=NovelProjectRead)
def create_project(payload: NovelProjectCreate, db: Session = Depends(get_db)):
    return create_novel_project(db, payload.model_dump())


@router.get("/projects/{project_id}", response_model=NovelProjectRead)
def read_project(project_id: int, db: Session = Depends(get_db)):
    project = get_novel_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return project


@router.put("/projects/{project_id}", response_model=NovelProjectRead)
def edit_project(project_id: int, payload: NovelProjectUpdate, db: Session = Depends(get_db)):
    project = get_novel_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return update_novel_project(db, project, payload.model_dump(exclude_unset=True))


@router.delete("/projects/{project_id}")
def del_project(project_id: int, db: Session = Depends(get_db)):
    if not delete_novel_project(db, project_id):
        raise HTTPException(status_code=404, detail="Novel project not found")
    return {"success": True}


# ════════════════════════════════════════════════════════════
#  Worldbuilding
# ════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/worldbuilding", response_model=list[NovelWorldbuildingRead])
def read_worldbuilding(project_id: int, db: Session = Depends(get_db)):
    return list_worldbuilding(db, project_id)


@router.post("/projects/{project_id}/worldbuilding", response_model=NovelWorldbuildingRead)
def write_worldbuilding(project_id: int, payload: NovelWorldbuildingCreate, db: Session = Depends(get_db)):
    project = get_novel_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    data = payload.model_dump(exclude={"project_id"})
    return upsert_worldbuilding(db, project_id, data)


# ════════════════════════════════════════════════════════════
#  Characters
# ════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/characters", response_model=list[NovelCharacterRead])
def read_characters(project_id: int, db: Session = Depends(get_db)):
    return list_characters(db, project_id)


@router.post("/characters", response_model=NovelCharacterRead)
def create_novel_character(payload: NovelCharacterCreate, db: Session = Depends(get_db)):
    return create_character(db, payload.model_dump())


# ════════════════════════════════════════════════════════════
#  Outlines
# ════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/outlines", response_model=list[NovelOutlineRead])
def read_outlines(project_id: int, db: Session = Depends(get_db)):
    return list_outlines(db, project_id)


@router.post("/outlines", response_model=NovelOutlineRead)
def create_novel_outline(payload: NovelOutlineCreate, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return create_outline(db, payload.model_dump())


@router.delete("/outlines/{outline_id}")
def del_outline(outline_id: int, db: Session = Depends(get_db)):
    if not delete_outline(db, outline_id):
        raise HTTPException(status_code=404, detail="Outline not found")
    return {"success": True}


# ════════════════════════════════════════════════════════════
#  Chapters
# ════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/chapters", response_model=list[NovelChapterRead])
def read_chapters(project_id: int, db: Session = Depends(get_db)):
    return list_chapters(db, project_id)


@router.post("/chapters", response_model=NovelChapterRead)
def create_novel_chapter(payload: NovelChapterCreate, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return create_chapter(db, payload.model_dump())


@router.put("/chapters/{chapter_id}", response_model=NovelChapterRead)
def update_novel_chapter(chapter_id: int, payload: dict[str, Any], db: Session = Depends(get_db)):
    chapter = update_chapter(db, chapter_id, payload)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter


@router.delete("/chapters/{chapter_id}")
def del_chapter(chapter_id: int, db: Session = Depends(get_db)):
    if not delete_chapter(db, chapter_id):
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"success": True}


# ════════════════════════════════════════════════════════════
#  Chapter Versions
# ════════════════════════════════════════════════════════════

@router.get("/chapters/{chapter_id}/versions", response_model=list[NovelChapterVersionRead])
def read_versions(chapter_id: int, db: Session = Depends(get_db)):
    return list_chapter_versions(db, chapter_id)


@router.post("/chapters/{chapter_id}/rollback")
def rollback_version(chapter_id: int, payload: NovelRollbackRequest, db: Session = Depends(get_db)):
    chapter = get_chapter(db, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    version = get_chapter_version(db, payload.version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # 保存当前状态为新版本
    current_version = chapter.version or 1
    create_chapter_version(db, {
        "chapter_id": chapter_id,
        "version_no": current_version,
        "chapter_text": chapter.chapter_text or "",
        "source": "rollback",
    })

    # 恢复到目标版本
    update_chapter(db, chapter_id, {
        "chapter_text": version.chapter_text,
        "version": current_version + 1,
    })

    return {"success": True, "restored_version": version.version_no}


# ════════════════════════════════════════════════════════════
#  Reviews
# ════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/reviews", response_model=list[NovelReviewRead])
def read_reviews(project_id: int, db: Session = Depends(get_db)):
    return list_reviews(db, project_id)


# ════════════════════════════════════════════════════════════
#  Run Records
# ════════════════════════════════════════════════════════════

@router.get("/runs", response_model=list[NovelRunRecordRead])
def read_runs(project_id: int = Query(...), db: Session = Depends(get_db)):
    return list_runs(db, project_id)


# ════════════════════════════════════════════════════════════
#  Agent Execution — 细纲生成 + 世界观/角色同步
# ════════════════════════════════════════════════════════════

@router.post("/agents/execute", response_model=AgentExecutionResponse)
async def execute_agents(payload: AgentExecutionRequest, db: Session = Depends(get_db)):
    """
    执行 Agent 链 — 核心端点。

    支持三种模式：
    1. 从头生成：指定 chapterCount（默认10）
    2. 续写：指定 continueFrom（从第 N 章之后继续）
    3. 大纲扩展：提供 userOutline（基于用户大纲扩展）
    """
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    gen = OutlineGenerator(db)
    results = await gen.generate(
        payload.project_id,
        payload.model_id,
        chapter_count=payload.payload.get("chapterCount"),
        continue_from=payload.payload.get("continueFrom"),
        user_outline=payload.payload.get("userOutline"),
    )

    return AgentExecutionResponse(
        project_id=payload.project_id,
        results=[
            AgentExecutionResult(
                agent_id=r.agent_id,
                step=r.step,
                success=r.success,
                output=r.output,
                error=r.error,
                outputSource="model" if r.success else "fallback",
                fallbackUsed=not r.success,
            )
            for r in results
        ],
    )


# ════════════════════════════════════════════════════════════
#  Continuity Repair
# ════════════════════════════════════════════════════════════

@router.post("/agents/repair", response_model=RepairResponse)
async def run_repair(payload: RepairRequest, db: Session = Depends(get_db)):
    """连续性修复：检测并报告章节间的矛盾"""
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    repair = ContinuityRepair(db)
    result = await repair.repair(payload.project_id, payload.model_id)

    return RepairResponse(
        project_id=payload.project_id,
        issues_found=result.get("issues_found", 0),
        issues_fixed=result.get("issues_fixed", 0),
        details=result.get("details", []),
    )


# ════════════════════════════════════════════════════════════
#  Prose Generation (Streaming)
# ════════════════════════════════════════════════════════════

@router.post("/chapters/{chapter_id}/generate-prose")
async def generate_prose(
    chapter_id: int,
    payload: dict[str, Any] = {},
    stream: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    单章正文生成。
    - stream=0: 阻塞式，返回完整正文
    - stream=1: SSE 流式返回
    """
    chapter = get_chapter(db, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    gen = ProseGenerator(db)
    model_id = payload.get("model_id")

    if stream:
        async def event_stream():
            progress_sent = False
            try:
                yield f"data: {json.dumps({'type': 'progress', 'progress': '正在生成正文...', 'percent': 10}, ensure_ascii=False)}\n\n"
                progress_sent = True

                text_parts = []
                async for part in gen.generate(chapter_id, model_id, stream=True):
                    text_parts.append(part)
                    yield f"data: {json.dumps({'type': 'chunk', 'text': part}, ensure_ascii=False)}\n\n"

                final_text = "".join(text_parts)
                updated_chapter = get_chapter(db, chapter_id)
                yield f"data: {json.dumps({
                    'type': 'done',
                    'progress': '生成完成',
                    'percent': 100,
                    'result': {'modelName': 'AI'},
                    'chapter': {
                        'id': chapter_id,
                        'chapter_text': final_text,
                        'version': (updated_chapter.version if updated_chapter else 1) + 1,
                    }
                }, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)}, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        text = await gen.generate(chapter_id, model_id, stream=False)
        updated_chapter = get_chapter(db, chapter_id)
        return {
            "success": True,
            "chapter_text": text,
            "chapter": {
                "id": chapter_id,
                "chapter_text": text,
                "version": updated_chapter.version if updated_chapter else 1,
            },
        }
