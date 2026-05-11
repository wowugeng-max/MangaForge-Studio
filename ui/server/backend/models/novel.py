from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class NovelProject(Base):
    __tablename__ = "novel_projects"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    genre = Column(String(128), default="")
    sub_genres = Column(JSON, default=list)
    length_target = Column(String(32), default="medium")
    target_audience = Column(String(255), default="")
    style_tags = Column(JSON, default=list)
    commercial_tags = Column(JSON, default=list)
    status = Column(String(32), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapters = relationship("NovelChapter", back_populates="project", cascade="all, delete-orphan")


class NovelWorldbuilding(Base):
    __tablename__ = "novel_worldbuildings"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    world_summary = Column(Text, default="")
    rules = Column(JSON, default=list)
    factions = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    systems = Column(JSON, default=list)
    timeline_anchor = Column(String(255), default="")
    known_unknowns = Column(JSON, default=list)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelCharacter(Base):
    __tablename__ = "novel_characters"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role_type = Column(String(128), default="")
    archetype = Column(String(128), default="")
    motivation = Column(Text, default="")
    goal = Column(Text, default="")
    conflict = Column(Text, default="")
    relationship_graph = Column(JSON, default=dict)
    growth_arc = Column(Text, default="")
    current_state = Column(JSON, default=dict)
    secret = Column(Text, default="")
    appearance = Column(Text, default="")
    abilities = Column(JSON, default=list)
    status = Column(String(32), default="active")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelOutline(Base):
    __tablename__ = "novel_outlines"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    outline_type = Column(String(32), default="master")
    parent_id = Column(Integer, ForeignKey("novel_outlines.id"), nullable=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, default="")
    beats = Column(JSON, default=list)
    conflict_points = Column(JSON, default=list)
    turning_points = Column(JSON, default=list)
    hook = Column(Text, default="")
    target_length = Column(String(64), default="")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelChapter(Base):
    __tablename__ = "novel_chapters"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    outline_id = Column(Integer, ForeignKey("novel_outlines.id"), nullable=True)
    chapter_no = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    chapter_goal = Column(Text, default="")
    chapter_summary = Column(Text, default="")
    scene_list = Column(JSON, default=list)
    chapter_text = Column(Text, default="")
    conflict = Column(Text, default="")
    ending_hook = Column(Text, default="")
    status = Column(String(32), default="draft")
    version = Column(Integer, default=1)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="chapters")
    versions = relationship("NovelChapterVersion", back_populates="chapter", cascade="all, delete-orphan")


class NovelEvent(Base):
    __tablename__ = "novel_events"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    event_id = Column(String(64), nullable=False, index=True)
    chapter_no = Column(Integer, nullable=True)
    event_type = Column(String(64), default="")
    summary = Column(Text, default="")
    participants = Column(JSON, default=list)
    impact = Column(Text, default="")
    timestamp_in_story = Column(String(64), default="")
    resolved = Column(String(16), default="false")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelForeshadowing(Base):
    __tablename__ = "novel_foreshadowings"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    foreshadow_id = Column(String(64), nullable=False, index=True)
    origin_chapter = Column(Integer, nullable=True)
    description = Column(Text, default="")
    expected_resolution = Column(Text, default="")
    status = Column(String(32), default="open")
    resolved_in_chapter = Column(Integer, nullable=True)
    importance = Column(String(32), default="normal")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelTimeline(Base):
    __tablename__ = "novel_timelines"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    timeline_id = Column(String(64), nullable=False, index=True)
    story_time = Column(String(64), default="")
    chapter_no = Column(Integer, nullable=True)
    event_id = Column(String(64), default="")
    description = Column(Text, default="")
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelMemorySnapshot(Base):
    __tablename__ = "novel_memory_snapshots"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    snapshot_type = Column(String(64), nullable=False)
    content = Column(Text, default="")
    coverage = Column(String(255), default="")
    source_range = Column(String(255), default="")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NovelChapterVersion(Base):
    __tablename__ = "novel_chapter_versions"

    id = Column(Integer, primary_key=True)
    chapter_id = Column(Integer, ForeignKey("novel_chapters.id"), nullable=False, index=True)
    version_no = Column(Integer, nullable=False, default=1)
    chapter_text = Column(Text, default="")
    scene_breakdown = Column(JSON, default=list)
    continuity_notes = Column(JSON, default=list)
    source = Column(String(64), default="")  # manual | agent_execute | repair | rollback | restructure_expand | restructure_contract
    created_at = Column(DateTime, default=datetime.utcnow)

    chapter = relationship("NovelChapter", back_populates="versions")


class NovelReview(Base):
    __tablename__ = "novel_reviews"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    review_type = Column(String(64), default="")  # market_review, platform_fit, continuity_check, ...
    summary = Column(Text, default="")
    issues = Column(JSON, default=list)
    payload = Column(Text, default="")  # JSON string for extra data
    created_at = Column(DateTime, default=datetime.utcnow)


class NovelRunRecord(Base):
    __tablename__ = "novel_run_records"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False, index=True)
    run_type = Column(String(64), nullable=False)
    step_name = Column(String(64), nullable=False)
    status = Column(String(32), default="pending")
    input_ref = Column(Text, default="")
    output_ref = Column(Text, default="")
    duration_ms = Column(Integer, default=0)
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
