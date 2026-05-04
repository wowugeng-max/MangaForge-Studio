import json
from pathlib import Path

from .workspace import get_active_workspace


def _providers_file() -> Path:
    return get_active_workspace() / 'providers.json'


def _read_providers() -> list[dict]:
    f = _providers_file()
    if not f.exists():
        seed = [
            {
                'id': 'openai',
                'display_name': 'OpenAI',
                'service_type': 'llm',
                'api_format': 'openai',
                'auth_type': 'api_key',
                'supported_modalities': ['text'],
                'default_base_url': 'https://api.openai.com/v1',
                'is_active': True,
            }
        ]
        f.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding='utf-8')
        return seed
    try:
        return json.loads(f.read_text(encoding='utf-8'))
    except Exception:
        return []


def _write_providers(providers: list[dict]) -> None:
    _providers_file().write_text(json.dumps(providers, ensure_ascii=False, indent=2), encoding='utf-8')


def get_providers() -> list[dict]:
    return _read_providers()


def get_provider(provider_id: str) -> dict:
    for provider in _read_providers():
        if provider.get('id') == provider_id:
            return provider
    return {'id': provider_id, 'error': 'not found'}


def create_provider(payload: dict) -> dict:
    providers = _read_providers()
    record = {
        'id': payload.get('id') or payload.get('display_name', 'provider').lower(),
        'display_name': payload.get('display_name', 'Unnamed Provider'),
        'service_type': payload.get('service_type', 'llm'),
        'api_format': payload.get('api_format', 'openai'),
        'auth_type': payload.get('auth_type', 'api_key'),
        'supported_modalities': payload.get('supported_modalities', ['text']),
        'default_base_url': payload.get('default_base_url', ''),
        'is_active': payload.get('is_active', True),
    }
    providers.append(record)
    _write_providers(providers)
    return record


def update_provider(provider_id: str, payload: dict) -> dict:
    providers = _read_providers()
    for p in providers:
        if p.get('id') == provider_id:
            p.update({k: v for k, v in payload.items() if k in {'display_name', 'service_type', 'api_format', 'auth_type', 'supported_modalities', 'default_base_url', 'is_active'}})
            _write_providers(providers)
            return p
    return {'ok': False, 'error': 'provider not found', 'id': provider_id}


def delete_provider(provider_id: str) -> dict:
    providers = _read_providers()
    new_providers = [p for p in providers if p.get('id') != provider_id]
    _write_providers(new_providers)
    return {'ok': True, 'id': provider_id}
