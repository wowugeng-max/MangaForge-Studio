#!/usr/bin/env python3
import json
import os
import sqlite3
from pathlib import Path


def load_store_counts(workspace: Path):
    store_path = workspace / 'novel-store.json'
    data = json.loads(store_path.read_text(encoding='utf-8'))
    return {
        'projects': len(data.get('projects', [])) if isinstance(data.get('projects', []), list) else 0,
        'worldbuilding': len(data.get('worldbuilding', [])) if isinstance(data.get('worldbuilding', []), list) else 0,
        'characters': len(data.get('characters', [])) if isinstance(data.get('characters', []), list) else 0,
        'outlines': len(data.get('outlines', [])) if isinstance(data.get('outlines', []), list) else 0,
        'chapters': len(data.get('chapters', [])) if isinstance(data.get('chapters', []), list) else 0,
        'reviews': len(data.get('reviews', [])) if isinstance(data.get('reviews', []), list) else 0,
        'runs': len(data.get('runs', [])) if isinstance(data.get('runs', []), list) else 0,
    }


def load_db_counts(db_path: Path):
    conn = sqlite3.connect(str(db_path))
    try:
        counts = {}
        for table in ['projects', 'worldbuilding', 'characters', 'outlines', 'chapters', 'reviews', 'runs']:
            cur = conn.execute(f'SELECT COUNT(*) FROM {table}')
            counts[table] = int(cur.fetchone()[0])
        return counts
    finally:
        conn.close()


def main():
    workspace = Path(os.environ.get('NOVEL_WORKSPACE') or Path.cwd() / 'workspace')
    db_url = os.environ.get('SQLITE_DATABASE_URL') or os.environ.get('DATABASE_URL') or f'file:{workspace / "novel.sqlite"}'
    if not db_url.startswith('file:'):
        raise RuntimeError('This verification script currently expects a file: SQLite URL')
    db_path = Path(db_url[5:].split('?', 1)[0])

    store_counts = load_store_counts(workspace)
    db_counts = load_db_counts(db_path)
    mismatches = {table: {'store': store_counts[table], 'db': db_counts[table]} for table in store_counts if store_counts[table] != db_counts[table]}

    summary = {
        'ok': len(mismatches) == 0,
        'workspace': str(workspace),
        'dbPath': str(db_path),
        'storeCounts': store_counts,
        'dbCounts': db_counts,
        'mismatches': mismatches,
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if mismatches:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
