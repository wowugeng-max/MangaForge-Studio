import json
from pathlib import Path

from .workspace import get_active_workspace


def _models_file() -> Path:
    return get_active_workspace() / 'models.json'


def _read_models() -> list[dict]:
    f = _models_file()
    if not f.exists():
        seed = [
            {
                'id': 1,
                'display_name': 'GPT-4.1',
                'model_name': 'gpt-4.1',
                'capabilities': {'chat': True, 'vision': False, 'text_to_image': False, 'image_to_image': False, 'text_to_video': False, 'image_to_video': False},
                'is_favorite': True,
                'health_status': 'healthy',
                'is_manual': False,
            }
        ]
        f.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding='utf-8')
        return seed
    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except Exception:
        return []


def _write_models(models: list[dict]) -> None:
    _models_file().write_text(json.dumps(models, ensure_ascii=False, indent=2), encoding='utf-8')


def get_models() -> list[dict]:
    return _read_models()


def sync_models(key_id: int) -> dict:
    return {'ok': True, 'keyId': key_id, 'message': 'mock sync complete'}


def create_model(payload: dict) -> dict:
    models = _read_models()
    next_id = max([m.get('id', 0) for m in models], default=0) + 1
    record = {
        'id': next_id,
        'display_name': payload.get('display_name', 'Unnamed Model'),
        'model_name': payload.get('model_name', 'unknown'),
        'capabilities': payload.get('capabilities', {}),
        'is_favorite': payload.get('is_favorite', False),
        'health_status': payload.get('health_status', 'unknown'),
        'is_manual': payload.get('is_manual', True),
        'context_ui_params': payload.get('context_ui_params', {}),
    }
    models.append(record)
    _write_models(models)
    return record
