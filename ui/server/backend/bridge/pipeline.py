import json
from datetime import datetime, timezone

from .workspace import get_active_workspace
from backend.core.restored_runner import preflight_restored_workspace, run_restored_script


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_steps(payload: dict, step_names: list[str]) -> list[dict]:
    mapping = {
        'init': 'manga-init.ts',
        'plot': 'manga-plot.ts',
        'storyboard': 'manga-storyboard.ts',
        'promptpack': 'manga-promptpack.ts',
        'export': 'manga-export.ts',
    }
    return [run_restored_script(mapping[name], payload) for name in step_names]


def run_all(payload: dict | None = None) -> dict:
    ws = get_active_workspace()
    payload = payload or {}

    preflight = preflight_restored_workspace()
    missing = set(preflight.get('missing', []))
    auto_steps: list[str] = []

    if missing.intersection({'story_project_exists', 'series_yaml_exists', 'style_guide_exists', 'episodes_dir_exists'}):
        auto_steps.append('init')

    steps: list[dict] = []
    if auto_steps:
        steps.extend(_run_steps(payload, auto_steps))

    # Canonical chain, but skip init if we already auto-repaired it.
    canonical_steps = ['init', 'plot', 'storyboard', 'promptpack', 'export']
    if auto_steps:
        canonical_steps = ['plot', 'storyboard', 'promptpack', 'export']
    steps.extend(_run_steps(payload, canonical_steps))

    run_record = {
        'ok': all(step.get('status') == 'ok' for step in steps),
        'message': 'run-all completed',
        'workspace': str(ws),
        'payload': payload,
        'preflight': preflight,
        'autoRepair': auto_steps,
        'created_at': _now_iso(),
        'steps': steps,
    }
    runs_dir = ws / 'runs'
    runs_dir.mkdir(parents=True, exist_ok=True)
    (runs_dir / f"run-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.json").write_text(
        json.dumps(run_record, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    return run_record
