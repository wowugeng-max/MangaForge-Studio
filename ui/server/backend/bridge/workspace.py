from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKSPACE_ROOT = ROOT / 'workspace'
ACTIVE_WORKSPACE = WORKSPACE_ROOT / 'default'


def _ensure_story_project(root: Path) -> None:
    story_root = root / '.story-project'
    story_root.mkdir(parents=True, exist_ok=True)
    (story_root / 'characters').mkdir(parents=True, exist_ok=True)
    (story_root / 'episodes').mkdir(parents=True, exist_ok=True)
    (story_root / 'series.yaml').write_text(
        'seriesTitle: Default Project\ngenre: 未设置\ntone: 未设置\nthemes: []\n',
        encoding='utf-8',
    )
    (story_root / 'style-guide.md').write_text(
        '# Default Project Style Guide\n\n- Visual Tone:\n- Character Consistency:\n- Panel Rhythm:\n',
        encoding='utf-8',
    )


def ensure_workspace() -> Path:
    ACTIVE_WORKSPACE.mkdir(parents=True, exist_ok=True)
    (ACTIVE_WORKSPACE / 'assets').mkdir(parents=True, exist_ok=True)
    (ACTIVE_WORKSPACE / 'episodes').mkdir(parents=True, exist_ok=True)
    (ACTIVE_WORKSPACE / 'templates').mkdir(parents=True, exist_ok=True)
    (ACTIVE_WORKSPACE / 'runs').mkdir(parents=True, exist_ok=True)
    (ACTIVE_WORKSPACE / 'logs').mkdir(parents=True, exist_ok=True)
    _ensure_story_project(ACTIVE_WORKSPACE)
    return ACTIVE_WORKSPACE


def set_active_workspace(path: str) -> Path:
    global ACTIVE_WORKSPACE
    ACTIVE_WORKSPACE = Path(path)
    return ensure_workspace()


def get_active_workspace() -> Path:
    return ensure_workspace()
