from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
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
    NovelGenerationRequest,
    NovelRunRecordRead,
)
from .storage import (
    create_novel_project,
    get_novel_project,
    list_novel_projects,
    update_novel_project,
    list_worldbuilding,
    upsert_worldbuilding,
    list_characters,
    create_character,
    list_outlines,
    create_outline,
    list_chapters,
    create_chapter,
    list_runs,
)
from .worker import NovelWorker

router = APIRouter(prefix="/api/novel", tags=["novel"])


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


@router.get("/projects/{project_id}/characters", response_model=list[NovelCharacterRead])
def read_characters(project_id: int, db: Session = Depends(get_db)):
    return list_characters(db, project_id)


@router.post("/characters", response_model=NovelCharacterRead)
def create_novel_character(payload: NovelCharacterCreate, db: Session = Depends(get_db)):
    return create_character(db, payload.model_dump())


@router.get("/projects/{project_id}/outlines", response_model=list[NovelOutlineRead])
def read_outlines(project_id: int, db: Session = Depends(get_db)):
    return list_outlines(db, project_id)


@router.post("/outlines", response_model=NovelOutlineRead)
def create_novel_outline(payload: NovelOutlineCreate, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return create_outline(db, payload.model_dump())


@router.get("/projects/{project_id}/chapters", response_model=list[NovelChapterRead])
def read_chapters(project_id: int, db: Session = Depends(get_db)):
    return list_chapters(db, project_id)


@router.post("/chapters", response_model=NovelChapterRead)
def create_novel_chapter(payload: NovelChapterCreate, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    return create_chapter(db, payload.model_dump())


@router.post("/plan")
def plan_novel(payload: NovelGenerationRequest, db: Session = Depends(get_db)):
    worker = NovelWorker(db)
    results = worker.run_plan(payload.project_id, payload.prompt, payload.payload)
    return {
        "project_id": payload.project_id,
        "results": [
            {"step": item.step, "success": item.success, "output": item.output, "error": item.error}
            for item in results
        ],
    }


@router.post("/outline")
def generate_outline(payload: NovelGenerationRequest, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    worker = NovelWorker(db)
    results = worker.run_plan(payload.project_id, payload.prompt, {**payload.payload, "characters": [], "chapter": None})
    outline_result = next((item for item in results if item.step == "outline"), None)
    return {
        "project_id": payload.project_id,
        "outline": outline_result.output if outline_result else {},
        "results": [
            {"step": item.step, "success": item.success, "output": item.output, "error": item.error}
            for item in results
        ],
    }


@router.post("/chapter")
def generate_chapter(payload: NovelGenerationRequest, db: Session = Depends(get_db)):
    project = get_novel_project(db, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Novel project not found")
    worker = NovelWorker(db)
    results = worker.run_plan(payload.project_id, payload.prompt, {**payload.payload, "characters": [], "chapter": payload.payload})
    chapter_result = next((item for item in results if item.step == "chapter"), None)
    return {
        "project_id": payload.project_id,
        "chapter": chapter_result.output if chapter_result else {},
        "results": [
            {"step": item.step, "success": item.success, "output": item.output, "error": item.error}
            for item in results
        ],
    }


@router.get("/runs", response_model=list[NovelRunRecordRead])
def read_runs(project_id: int, db: Session = Depends(get_db)):
    return list_runs(db, project_id)
