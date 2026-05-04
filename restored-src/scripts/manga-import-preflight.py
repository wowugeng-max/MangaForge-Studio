#!/usr/bin/env python3
import json
import os
import sqlite3
from pathlib import Path


def check_file(path: Path) -> bool:
    return path.exists()


def main():
    db_url = os.environ.get('SQLITE_DATABASE_URL') or os.environ.get('DATABASE_URL') or f"file:{Path.cwd().parent / 'workspace' / 'novel.sqlite'}"
    workspace = Path(os.environ.get('NOVEL_WORKSPACE') or Path.cwd() / 'workspace')
    store_path = workspace / 'novel-store.json'

    checks = {
        'workspaceExists': check_file(workspace),
        'storeExists': check_file(store_path),
        'dbConfigured': bool(db_url),
        'dbConnected': False,
        'storeReadable': False,
        'storeParsed': False,
        'schemaTables': False,
    }

    store = None
    if checks['storeExists']:
        try:
            raw = store_path.read_text(encoding='utf-8')
            checks['storeReadable'] = True
            store = json.loads(raw)
            checks['storeParsed'] = True
        except Exception:
            pass

    if db_url:
        if db_url.startswith('file:'):
            db_path = db_url[5:]
            if '?' in db_path:
                db_path = db_path.split('?', 1)[0]
        else:
            db_path = db_url
        conn = sqlite3.connect(db_path)
        try:
            conn.execute('SELECT 1')
            checks['dbConnected'] = True
            cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('projects','worldbuilding','characters','outlines','chapters','reviews','runs')")
            checks['schemaTables'] = len(cur.fetchall()) >= 7
        finally:
            conn.close()

    summary = {
        'ok': all(checks.values()),
        'workspace': str(workspace),
        'storePath': str(store_path),
        'dbUrl': db_url,
        'checks': checks,
        'counts': None if store is None else {
            'projects': len(store.get('projects', [])) if isinstance(store.get('projects', []), list) else 0,
            'worldbuilding': len(store.get('worldbuilding', [])) if isinstance(store.get('worldbuilding', []), list) else 0,
            'characters': len(store.get('characters', [])) if isinstance(store.get('characters', []), list) else 0,
            'outlines': len(store.get('outlines', [])) if isinstance(store.get('outlines', []), list) else 0,
            'chapters': len(store.get('chapters', [])) if isinstance(store.get('chapters', []), list) else 0,
            'reviews': len(store.get('reviews', [])) if isinstance(store.get('reviews', []), list) else 0,
            'runs': len(store.get('runs', [])) if isinstance(store.get('runs', []), list) else 0,
        }
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not summary['ok']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
