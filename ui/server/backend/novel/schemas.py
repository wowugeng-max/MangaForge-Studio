from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class NovelProjectBase(BaseModel):
    title: str
    genre: str = ""
    sub_genres: list[str] = Field(default_factory=list)
    length_target: str = "medium"
    target_audience: str = ""
    style_tags: list[str] = Field(default_factory=list)
    commercial_tags: list[str] = Field(default_factory=list)
    status: str = "draft"


class NovelProjectCreate(NovelProjectBase):
    pass


class NovelProjectUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    sub_genres: Optional[list[str]] = None
    length_target: Optional[str] = None
    target_audience: Optional[str] = None
    style_tags: Optional[list[str]] = None
    commercial_tags: Optional[list[str]] = None
    status: Optional[str] = None


class NovelProjectRead(NovelProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelWorldbuildingBase(BaseModel):
    project_id: int
    world_summary: str = ""
    rules: list[str] = Field(default_factory=list)
    factions: list[dict[str, Any]] = Field(default_factory=list)
    locations: list[dict[str, Any]] = Field(default_factory=list)
    systems: list[dict[str, Any]] = Field(default_factory=list)
    timeline_anchor: str = ""
    known_unknowns: list[str] = Field(default_factory=list)
    version: int = 1


class NovelWorldbuildingCreate(NovelWorldbuildingBase):
    pass


class NovelWorldbuildingUpdate(BaseModel):
    world_summary: Optional[str] = None
    rules: Optional[list[str]] = None
    factions: Optional[list[dict[str, Any]]] = None
    locations: Optional[list[dict[str, Any]]] = None
    systems: Optional[list[dict[str, Any]]] = None
    timeline_anchor: Optional[str] = None
    known_unknowns: Optional[list[str]] = None
    version: Optional[int] = None


class NovelWorldbuildingRead(NovelWorldbuildingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelCharacterBase(BaseModel):
    project_id: int
    name: str
    role_type: str = ""
    archetype: str = ""
    motivation: str = ""
    goal: str = ""
    conflict: str = ""
    relationship_graph: dict[str, Any] = Field(default_factory=dict)
    growth_arc: str = ""
    current_state: dict[str, Any] = Field(default_factory=dict)
    secret: str = ""
    appearance: str = ""
    abilities: list[str] = Field(default_factory=list)
    status: str = "active"
    version: int = 1


class NovelCharacterCreate(NovelCharacterBase):
    pass


class NovelCharacterUpdate(BaseModel):
    name: Optional[str] = None
    role_type: Optional[str] = None
    archetype: Optional[str] = None
    motivation: Optional[str] = None
    goal: Optional[str] = None
    conflict: Optional[str] = None
    relationship_graph: Optional[dict[str, Any]] = None
    growth_arc: Optional[str] = None
    current_state: Optional[dict[str, Any]] = None
    secret: Optional[str] = None
    appearance: Optional[str] = None
    abilities: Optional[list[str]] = None
    status: Optional[str] = None
    version: Optional[int] = None


class NovelCharacterRead(NovelCharacterBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelOutlineBase(BaseModel):
    outline_type: str = "master"
    parent_id: Optional[int] = None
    title: str
    summary: str = ""
    beats: list[str] = Field(default_factory=list)
    conflict_points: list[str] = Field(default_factory=list)
    turning_points: list[str] = Field(default_factory=list)
    hook: str = ""
    target_length: str = ""
    version: int = 1


class NovelOutlineCreate(NovelOutlineBase):
    project_id: int


class NovelOutlineUpdate(BaseModel):
    outline_type: Optional[str] = None
    parent_id: Optional[int] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    beats: Optional[list[str]] = None
    conflict_points: Optional[list[str]] = None
    turning_points: Optional[list[str]] = None
    hook: Optional[str] = None
    target_length: Optional[str] = None
    version: Optional[int] = None


class NovelOutlineRead(NovelOutlineBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelChapterBase(BaseModel):
    project_id: int
    chapter_no: int
    title: str
    chapter_goal: str = ""
    chapter_summary: str = ""
    scene_list: list[dict[str, Any]] = Field(default_factory=list)
    chapter_text: str = ""
    conflict: str = ""
    ending_hook: str = ""
    status: str = "draft"
    version: int = 1
    published_at: Optional[datetime] = None


class NovelChapterCreate(NovelChapterBase):
    pass


class NovelChapterUpdate(BaseModel):
    chapter_no: Optional[int] = None
    title: Optional[str] = None
    chapter_goal: Optional[str] = None
    chapter_summary: Optional[str] = None
    scene_list: Optional[list[dict[str, Any]]] = None
    chapter_text: Optional[str] = None
    conflict: Optional[str] = None
    ending_hook: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None
    published_at: Optional[datetime] = None


class NovelChapterRead(NovelChapterBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelGenerationRequest(BaseModel):
    project_id: int
    prompt: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)


class NovelRunRecordRead(BaseModel):
    id: int
    project_id: int
    run_type: str
    step_name: str
    status: str
    input_ref: str = ""
    output_ref: str = ""
    duration_ms: int = 0
    error_message: str = ""
    created_at: datetime

    class Config:
        from_attributes = True
