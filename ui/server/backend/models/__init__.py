# backend/models/__init__.py
from .base import Base
# 导入所有模型，确保它们注册到 Base
from .asset import Asset
from .project import Project
from .api_key import APIKey
from .node_parameter_stat import NodeParameterStat
from .recommendation_rule import RecommendationRule
from .model_config import ModelConfig
from .schemas import ImageData, VideoData, PromptData
from backend.novel.models import (
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
)
