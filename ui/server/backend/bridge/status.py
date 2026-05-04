from .workspace import get_active_workspace
from .projects import get_projects
from .assets import list_assets


def get_status() -> dict:
    return {
        'workspace': str(get_active_workspace()),
        'projects': get_projects(),
        'assets': list_assets(),
        'runs': [],
    }
