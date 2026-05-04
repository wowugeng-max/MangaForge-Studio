import json
from pathlib import Path
from datetime import datetime, timezone

from .workspace import get_active_workspace


def _projects_file() -> Path:
    ws = get_active_workspace()
    return ws / 'projects.json'


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_projects() -> list[dict]:
    f = _projects_file()
    if not f.exists():
        seed = [
            {
                'id': 1,
                'name': '默认创作项目',
                'description': 'Bridge workspace project',
                'tags': ['demo', 'bridge'],
                'updated_at': _now_iso(),
                'workspacePath': str(get_active_workspace()),
            }
        ]
        f.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding='utf-8')
        return seed

    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except Exception:
        return []


def _write_projects(projects: list[dict]) -> None:
    _projects_file().write_text(json.dumps(projects, ensure_ascii=False, indent=2), encoding='utf-8')


def get_projects() -> list[dict]:
    return _read_projects()


def create_project(payload: dict) -> dict:
    projects = _read_projects()
    next_id = max([p.get('id', 0) for p in projects], default=0) + 1
    record = {
        'id': next_id,
        'name': payload.get('name', '未命名项目'),
        'description': payload.get('description', ''),
        'tags': payload.get('tags', []),
        'updated_at': _now_iso(),
        'workspacePath': str(get_active_workspace()),
    }
    projects.append(record)
    _write_projects(projects)
    return record


def update_project(project_id: int, payload: dict) -> dict:
    projects = _read_projects()
    for p in projects:
        if p.get('id') == project_id:
            p.update({k: v for k, v in payload.items() if k in {'name', 'description', 'tags'}})
            p['updated_at'] = _now_iso()
            _write_projects(projects)
            return p
    return {'ok': False, 'error': 'project not found', 'id': project_id}


def delete_project(project_id: int) -> dict:
    projects = _read_projects()
    new_projects = [p for p in projects if p.get('id') != project_id]
    _write_projects(new_projects)
    return {'ok': True, 'id': project_id}
