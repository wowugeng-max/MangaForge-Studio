"""
novel/models.py — 统一导出点
storage.py 通过 from .models import ... 导入模型
此处从 backend/models/novel.py 重导出所有模型
"""
from __future__ import annotations

from backend.models.novel import (
    NovelChapter,
    NovelChapterVersion,
    NovelCharacter,
    NovelEvent,
    NovelForeshadowing,
    NovelMemorySnapshot,
    NovelOutline,
    NovelProject,
    NovelReview,
    NovelRunRecord,
    NovelTimeline,
    NovelWorldbuilding,
)

__all__ = [
    "NovelChapter",
    "NovelChapterVersion",
    "NovelCharacter",
    "NovelEvent",
    "NovelForeshadowing",
    "NovelMemorySnapshot",
    "NovelOutline",
    "NovelProject",
    "NovelReview",
    "NovelRunRecord",
    "NovelTimeline",
    "NovelWorldbuilding",
]
