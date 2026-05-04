import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from backend.bridge.workspace import get_active_workspace

ROOT = Path(__file__).resolve().parents[3]
RESTORED_SRC = ROOT / 'restored-src'


@dataclass
class ScriptRunResult:
    step: str
    status: str
    returncode: int | None
    stdout: str
    stderr: str
    duration_ms: int
    command: list[str]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_script_args(payload: dict) -> list[str]:
    args = [f"--workspace={get_active_workspace()}"]
    for key in ('episodeId', 'title', 'premise', 'framework', 'panels', 'style', 'consistency'):
        value = payload.get(key)
        if value is not None and value != '':
            args.append(f"--{key}={value}")
    return args


def run_restored_script(script_name: str, payload: dict, timeout_seconds: int = 300) -> dict:
    command = ['bun', 'run', script_name, *build_script_args(payload)]
    started = datetime.now(timezone.utc)
    proc = subprocess.run(
        command,
        cwd=str(RESTORED_SRC),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    ended = datetime.now(timezone.utc)
    duration_ms = int((ended - started).total_seconds() * 1000)
    return {
        'step': script_name.replace('manga-', '').replace('.ts', ''),
        'status': 'ok' if proc.returncode == 0 else 'error',
        'returncode': proc.returncode,
        'stdout': proc.stdout,
        'stderr': proc.stderr,
        'duration_ms': duration_ms,
        'command': command,
        'started_at': started.isoformat(),
        'ended_at': ended.isoformat(),
    }


def preflight_restored_workspace() -> dict:
    ws = get_active_workspace()
    story_root = ws / '.story-project'
    checks = {
        'workspace_exists': ws.exists(),
        'story_project_exists': story_root.exists(),
        'series_yaml_exists': (story_root / 'series.yaml').exists(),
        'style_guide_exists': (story_root / 'style-guide.md').exists(),
        'episodes_dir_exists': (story_root / 'episodes').exists(),
    }
    return {
        'ok': all(checks.values()),
        'workspace': str(ws),
        'checked_at': _now_iso(),
        'checks': checks,
        'missing': [name for name, ok in checks.items() if not ok],
    }
