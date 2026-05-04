from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, Response
from backend.bridge import get_status, get_projects, list_assets, get_active_workspace, ensure_workspace
from backend.bridge.workspace import set_active_workspace
from backend.bridge.files import read_file, download_file
from backend.bridge.pipeline import run_all
from backend.bridge.keys import get_keys, get_key, create_key, update_key, delete_key
from backend.bridge.providers import get_providers, get_provider, create_provider, update_provider, delete_provider
from backend.bridge.models import get_models, sync_models, create_model
from backend.bridge.rules import get_rules
from backend.bridge.projects import create_project, update_project, delete_project
from backend.bridge.assets import create_asset, update_asset, delete_asset
from backend.core.restored_runner import preflight_restored_workspace

router = APIRouter(prefix='/api')

@router.get('/status')
def status():
    return get_status()

@router.get('/projects')
def projects():
    return {'projects': get_projects()}

@router.post('/projects')
def projects_create(payload: dict):
    return create_project(payload)

@router.put('/projects/{project_id}')
def projects_update(project_id: int, payload: dict):
    return update_project(project_id, payload)

@router.delete('/projects/{project_id}')
def projects_delete(project_id: int):
    return delete_project(project_id)

@router.get('/assets')
def assets():
    return {'assets': list_assets()}

@router.post('/assets')
def assets_create(payload: dict):
    return create_asset(payload)

@router.put('/assets/{asset_id}')
def assets_update(asset_id: int, payload: dict):
    return update_asset(asset_id, payload)

@router.delete('/assets/{asset_id}')
def assets_delete(asset_id: int):
    return delete_asset(asset_id)

@router.get('/workspace')
def workspace():
    return {'workspace': str(get_active_workspace())}

@router.get('/workspace/preflight')
def workspace_preflight():
    return preflight_restored_workspace()

@router.post('/workspace/switch')
def switch_workspace(payload: dict):
    path = payload.get('workspace')
    if not path:
        return {'ok': False, 'error': 'workspace is required'}
    ws = set_active_workspace(path)
    return {'ok': True, 'workspace': str(ws)}

@router.get('/files')
def files(path: str):
    try:
        return PlainTextResponse(read_file(path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/download')
def download(path: str):
    try:
        content = download_file(path)
        return Response(content, media_type='application/octet-stream')
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/bundle')
def bundle(episodeId: str):
    return {'ok': True, 'episodeId': episodeId, 'message': 'mock bundle download not implemented yet'}

@router.post('/pipeline/run-all')
def pipeline_run_all(payload: dict | None = None):
    return run_all(payload)

@router.get('/keys')
def keys():
    return {'keys': get_keys()}

@router.post('/keys')
def keys_create(payload: dict):
    return create_key(payload)

@router.put('/keys/{key_id}')
def key_update(key_id: int, payload: dict):
    return update_key(key_id, payload)

@router.delete('/keys/{key_id}')
def key_delete(key_id: int):
    return delete_key(key_id)

@router.get('/keys/{key_id}')
def key_detail(key_id: int):
    return get_key(key_id)

@router.get('/providers')
def providers():
    return {'providers': get_providers()}

@router.post('/providers')
def providers_create(payload: dict):
    return create_provider(payload)

@router.put('/providers/{provider_id}')
def providers_update(provider_id: str, payload: dict):
    return update_provider(provider_id, payload)

@router.delete('/providers/{provider_id}')
def providers_delete(provider_id: str):
    return delete_provider(provider_id)

@router.get('/providers/{provider_id}')
def provider_detail(provider_id: str):
    return get_provider(provider_id)

@router.get('/models')
def models():
    return {'models': get_models()}

@router.post('/models')
def models_create(payload: dict):
    return create_model(payload)

@router.post('/models/sync/{key_id}')
def models_sync(key_id: int):
    return sync_models(key_id)

@router.get('/recommendation-rules')
def recommendation_rules():
    return {'rules': get_rules()}
