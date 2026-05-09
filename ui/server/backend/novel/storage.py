from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .models import (
    NovelProject,
    NovelWorldbuilding,
    NovelCharacter,
    NovelOutline,
    NovelChapter,
    NovelEvent,
    NovelForeshadowing,
    NovelTimeline,
    NovelMemorySnapshot,
    NovelRunRecord,
    NovelReview,
    NovelChapterVersion,
)


# ── Project ──────────────────────────────────────────────────────────

def list_novel_projects(db: Session) -> list[NovelProject]:
    return db.query(NovelProject).order_by(NovelProject.updated_at.desc()).all()


def get_novel_project(db: Session, project_id: int) -> NovelProject | None:
    return db.query(NovelProject).filter(NovelProject.id == project_id).first()


def create_novel_project(db: Session, data: dict[str, Any]) -> NovelProject:
    project = NovelProject(
        title=data["title"],
        genre=data.get("genre", ""),
        sub_genres=data.get("sub_genres", []),
        length_target=data.get("length_target", "medium"),
        target_audience=data.get("target_audience", ""),
        style_tags=data.get("style_tags", []),
        commercial_tags=data.get("commercial_tags", []),
        status=data.get("status", "draft"),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_novel_project(db: Session, project: NovelProject, data: dict[str, Any]) -> NovelProject:
    for key in ["title", "genre", "sub_genres", "length_target", "target_audience", "style_tags", "commercial_tags", "status"]:
        if key in data and data[key] is not None:
            setattr(project, key, data[key])
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def delete_novel_project(db: Session, project_id: int) -> bool:
    project = get_novel_project(db, project_id)
    if not project:
        return False
    db.delete(project)
    db.commit()
    return True


# ── Worldbuilding ────────────────────────────────────────────────────

def list_worldbuilding(db: Session, project_id: int) -> list[NovelWorldbuilding]:
    return db.query(NovelWorldbuilding).filter(NovelWorldbuilding.project_id == project_id).all()


def upsert_worldbuilding(db: Session, project_id: int, data: dict[str, Any]) -> NovelWorldbuilding:
    record = db.query(NovelWorldbuilding).filter(NovelWorldbuilding.project_id == project_id).first()
    if not record:
        record = NovelWorldbuilding(project_id=project_id, **data)
        db.add(record)
    else:
        for key, value in data.items():
            if value is not None:
                setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


# ── Character ────────────────────────────────────────────────────────

def list_characters(db: Session, project_id: int) -> list[NovelCharacter]:
    return db.query(NovelCharacter).filter(NovelCharacter.project_id == project_id).all()


def create_character(db: Session, data: dict[str, Any]) -> NovelCharacter:
    record = NovelCharacter(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_character(db: Session, character_id: int, data: dict[str, Any]) -> NovelCharacter | None:
    record = db.query(NovelCharacter).filter(NovelCharacter.id == character_id).first()
    if not record:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


# ── Outline ──────────────────────────────────────────────────────────

def list_outlines(db: Session, project_id: int) -> list[NovelOutline]:
    return db.query(NovelOutline).filter(NovelOutline.project_id == project_id).order_by(NovelOutline.id.asc()).all()


def create_outline(db: Session, data: dict[str, Any]) -> NovelOutline:
    record = NovelOutline(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_outline(db: Session, outline_id: int) -> bool:
    record = db.query(NovelOutline).filter(NovelOutline.id == outline_id).first()
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


# ── Chapter ──────────────────────────────────────────────────────────

def list_chapters(db: Session, project_id: int) -> list[NovelChapter]:
    return db.query(NovelChapter).filter(NovelChapter.project_id == project_id).order_by(NovelChapter.chapter_no.asc()).all()


def create_chapter(db: Session, data: dict[str, Any]) -> NovelChapter:
    record = NovelChapter(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_chapter(db: Session, chapter_id: int, data: dict[str, Any]) -> NovelChapter | None:
    record = db.query(NovelChapter).filter(NovelChapter.id == chapter_id).first()
    if not record:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


def delete_chapter(db: Session, chapter_id: int) -> bool:
    record = db.query(NovelChapter).filter(NovelChapter.id == chapter_id).first()
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


def get_chapter(db: Session, chapter_id: int) -> NovelChapter | None:
    return db.query(NovelChapter).filter(NovelChapter.id == chapter_id).first()


# ── Chapter Versions ─────────────────────────────────────────────────

def list_chapter_versions(db: Session, chapter_id: int) -> list[NovelChapterVersion]:
    return db.query(NovelChapterVersion).filter(
        NovelChapterVersion.chapter_id == chapter_id
    ).order_by(NovelChapterVersion.version_no.asc()).all()


def create_chapter_version(db: Session, data: dict[str, Any]) -> NovelChapterVersion:
    record = NovelChapterVersion(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_chapter_version(db: Session, version_id: int) -> NovelChapterVersion | None:
    return db.query(NovelChapterVersion).filter(NovelChapterVersion.id == version_id).first()


# ── Review ───────────────────────────────────────────────────────────

def list_reviews(db: Session, project_id: int) -> list[NovelReview]:
    return db.query(NovelReview).filter(NovelReview.project_id == project_id).order_by(
        NovelReview.created_at.desc()
    ).all()


def create_review(db: Session, data: dict[str, Any]) -> NovelReview:
    record = NovelReview(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Run Record ───────────────────────────────────────────────────────

def list_runs(db: Session, project_id: int) -> list[NovelRunRecord]:
    return db.query(NovelRunRecord).filter(NovelRunRecord.project_id == project_id).order_by(
        NovelRunRecord.created_at.desc()
    ).all()


def create_run_record(db: Session, data: dict[str, Any]) -> NovelRunRecord:
    record = NovelRunRecord(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
