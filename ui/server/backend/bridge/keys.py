import json
from pathlib import Path
from datetime import datetime, timezone

from .workspace import get_active_workspace


def _keys_file() -> Path:
    return get_active_workspace() / 'keys.json'


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_keys() -> list[dict]:
    f = _keys_file()
    if not f.exists():
        seed = [
            {
                'id': 1,
                'provider': 'openai',
                'description': 'mock key',
                'is_active': True,
                'updated_at': _now_iso(),
            }
        ]
        f.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding='utf-8')
        return seed
    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except Exception:
        return []


def _write_keys(keys: list[dict]) -> None:
    _keys_file().write_text(json.dumps(keys, ensure_ascii=False, indent=2), encoding='utf-8')


def get_keys() -> list[dict]:
    return _read_keys()


def get_key(key_id: int) -> dict:
    for key in _read_keys():
        if key.get('id') == key_id:
            return key
    return {'id': key_id, 'error': 'not found'}


def create_key(payload: dict) -> dict:
    keys = _read_keys()
    next_id = max([k.get('id', 0) for k in keys], default=0) + 1
    record = {
        'id': next_id,
        'provider': payload.get('provider', 'openai'),
        'description': payload.get('description', ''),
        'is_active': payload.get('is_active', True),
        'updated_at': _now_iso(),
    }
    keys.append(record)
    _write_keys(keys)
    return record


def update_key(key_id: int, payload: dict) -> dict:
    keys = _read_keys()
    for k in keys:
        if k.get('id') == key_id:
            k.update({k2: v for k2, v in payload.items() if k2 in {'provider', 'description', 'is_active'}})
            k['updated_at'] = _now_iso()
            _write_keys(keys)
            return k
    return {'ok': False, 'error': 'key not found', 'id': key_id}


def delete_key(key_id: int) -> dict:
    keys = _read_keys()
    new_keys = [k for k in keys if k.get('id') != key_id]
    _write_keys(new_keys)
    return {'ok': True, 'id': key_id}
