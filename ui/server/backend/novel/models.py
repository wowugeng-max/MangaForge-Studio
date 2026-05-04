from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from backend.models.base import Base


class NovelProject(Base):
    __tablename__ = "novel_projects"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    genre = Column(String(120), default="")
    sub_genres = Column(JSON, default=list)
    length_target = Column(String(50), default="medium")
    target_audience = Column(String(120), default="")
    style_tags = Column(JSON, default=list)
    commercial_tags = Column(JSON, default=list)
    status = Column(String(50), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    worldbuilding = relationship("NovelWorldbuilding", back_populates="project", cascade="all, delete-orphan")
    characters = relationship("NovelCharacter", back_populates="project", cascade="all, delete-orphan")
    outlines = relationship("NovelOutline", back_populates="project", cascade="all, delete-orphan")
    chapters = relationship("NovelChapter", back_populates="project", cascade="all, delete-orphan")
    events = relationship("NovelEvent", back_populates="project", cascade="all, delete-orphan")
    foreshadowings = relationship("NovelForeshadowing", back_populates="project", cascade="all, delete-orphan")
    timelines = relationship("NovelTimeline", back_populates="project", cascade="all, delete-orphan")
    memory_snapshots = relationship("NovelMemorySnapshot", back_populates="project", cascade="all, delete-orphan")
    run_records = relationship("NovelRunRecord", back_populates="project", cascade="all, delete-orphan")


class NovelWorldbuilding(Base):
    __tablename__ = "novel_worldbuildings"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    world_summary = Column(Text, default="")
    rules = Column(JSON, default=list)
    factions = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    systems = Column(JSON, default=list)
    timeline_anchor = Column(String(120), default="")
    known_unknowns = Column(JSON, default=list)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="worldbuilding")


class NovelCharacter(Base):
    __tablename__ = "novel_characters"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    name = Column(String(120), nullable=False)
    role_type = Column(String(80), default="")
    archetype = Column(String(120), default="")
    motivation = Column(Text, default="")
    goal = Column(Text, default="")
    conflict = Column(Text, default="")
    relationship_graph = Column(JSON, default=dict)
    growth_arc = Column(Text, default="")
    current_state = Column(JSON, default=dict)
    secret = Column(Text, default="")
    appearance = Column(Text, default="")
    abilities = Column(JSON, default=list)
    status = Column(String(50), default="active")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="characters")


class NovelOutline(Base):
    __tablename__ = "novel_outlines"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    outline_type = Column(String(50), default="master")
    parent_id = Column(Integer, nullable=True)
    title = Column(String(200), nullable=False)
    summary = Column(Text, default="")
    beats = Column(JSON, default=list)
    conflict_points = Column(JSON, default=list)
    turning_points = Column(JSON, default=list)
    hook = Column(Text, default="")
    target_length = Column(String(50), default="")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="outlines")


class NovelChapter(Base):
    __tablename__ = "novel_chapters"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    chapter_no = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    chapter_goal = Column(Text, default="")
    chapter_summary = Column(Text, default="")
    scene_list = Column(JSON, default=list)
    chapter_text = Column(Text, default="")
    conflict = Column(Text, default="")
    ending_hook = Column(Text, default="")
    status = Column(String(50), default="draft")
    version = Column(Integer, default=1)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="chapters")


class NovelEvent(Base):
    __tablename__ = "novel_events"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    event_id = Column(String(120), nullable=False)
    chapter_no = Column(Integer, nullable=True)
    event_type = Column(String(80), default="")
    summary = Column(Text, default="")
    participants = Column(JSON, default=list)
    impact = Column(Text, default="")
    timestamp_in_story = Column(String(120), default="")
    resolved = Column(String(20), default="false")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="events")


class NovelForeshadowing(Base):
    __tablename__ = "novel_foreshadowings"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    foreshadow_id = Column(String(120), nullable=False)
    origin_chapter = Column(Integer, nullable=True)
    description = Column(Text, default="")
    expected_resolution = Column(Text, default="")
    status = Column(String(50), default="open")
    resolved_in_chapter = Column(Integer, nullable=True)
    importance = Column(String(50), default="normal")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="foreshadowings")


class NovelTimeline(Base):
    __tablename__ = "novel_timelines"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    timeline_id = Column(String(120), nullable=False)
    story_time = Column(String(120), default="")
    chapter_no = Column(Integer, nullable=True)
    event_id = Column(String(120), default="")
    description = Column(Text, default="")
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="timelines")


class NovelMemorySnapshot(Base):
    __tablename__ = "novel_memory_snapshots"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    snapshot_type = Column(String(80), default="")
    content = Column(Text, default="")
    coverage = Column(String(120), default="")
    source_range = Column(String(120), default="")
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="memory_snapshots")


class NovelRunRecord(Base):
    __tablename__ = "novel_run_records"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    run_type = Column(String(80), default="")
    step_name = Column(String(120), default="")
    status = Column(String(50), default="pending")
    input_ref = Column(Text, default="")
    output_ref = Column(Text, default="")
    duration_ms = Column(Integer, default=0)
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="run_records")
