import json
from pathlib import Path
from datetime import datetime, timezone

from .workspace import get_active_workspace


def _assets_file() -> Path:
    ws = get_active_workspace()
    return ws / 'assets.json'


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_assets() -> list[dict]:
    f = _assets_file()
    if not f.exists():
        seed: list[dict] = []
        f.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding='utf-8')
        return seed
    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except Exception:
        return []


def _write_assets(assets: list[dict]) -> None:
    _assets_file().write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding='utf-8')


def list_assets() -> list[dict]:
    return _read_assets()


def create_asset(payload: dict) -> dict:
    assets = _read_assets()
    next_id = max([a.get('id', 0) for a in assets], default=0) + 1
    record = {
        'id': next_id,
        'name': payload.get('name', '未命名资产'),
        'type': payload.get('type', 'file'),
        'description': payload.get('description', ''),
        'tags': payload.get('tags', []),
        'path': payload.get('path', ''),
        'updated_at': _now_iso(),
    }
    assets.append(record)
    _write_assets(assets)
    return record


def update_asset(asset_id: int, payload: dict) -> dict:
    assets = _read_assets()
    for a in assets:
        if a.get('id') == asset_id:
            a.update({k: v for k, v in payload.items() if k in {'name', 'type', 'description', 'tags', 'path'}})
            a['updated_at'] = _now_iso()
            _write_assets(assets)
            return a
    return {'ok': False, 'error': 'asset not found', 'id': asset_id}


def delete_asset(asset_id: int) -> dict:
    assets = _read_assets()
    new_assets = [a for a in assets if a.get('id') != asset_id]
    _write_assets(new_assets)
    return {'ok': True, 'id': asset_id}
