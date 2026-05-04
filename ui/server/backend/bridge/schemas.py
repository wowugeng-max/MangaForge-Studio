from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class ProjectSchema(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    workspace_path: Optional[str] = None


class AssetSchema(BaseModel):
    id: str
    type: str
    name: str
    path: Optional[str] = None
    project_id: Optional[str] = None


class WorkspaceSchema(BaseModel):
    active_workspace: str
    workspaces: List[str] = []


class StatusSchema(BaseModel):
    workspace: str
    projects: List[ProjectSchema] = []
    assets: List[AssetSchema] = []
    runs: List[Dict[str, Any]] = []
