from pathlib import Path
from .workspace import get_active_workspace


def _safe_path(rel_path: str) -> Path:
    ws = get_active_workspace().resolve()
    full = (ws / rel_path).resolve()
    if ws not in full.parents and full != ws:
        raise ValueError('path must be inside workspace')
    return full


def read_file(rel_path: str) -> str:
    return _safe_path(rel_path).read_text(encoding='utf-8')


def download_file(rel_path: str) -> bytes:
    return _safe_path(rel_path).read_bytes()
