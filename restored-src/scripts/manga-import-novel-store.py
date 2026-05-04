#!/usr/bin/env python3
import json
import os
import sqlite3
from pathlib import Path
from typing import Any


def parse_json_array(value: Any, fallback=None):
    if fallback is None:
        fallback = []
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else fallback
        except Exception:
            return fallback
    return fallback


def to_text(value: Any, fallback: str = "") -> str:
    return fallback if value is None else str(value)


def to_number(value: Any, fallback: int = 0) -> int:
    try:
        n = int(value)
        return n
    except Exception:
        try:
            n = float(value)
            return int(n)
        except Exception:
            return fallback


def now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def load_store(workspace: Path):
    store_path = workspace / "novel-store.json"
    with store_path.open("r", encoding="utf-8") as f:
        parsed = json.load(f)
    return {
        "projects": parsed.get("projects", []) if isinstance(parsed.get("projects", []), list) else [],
        "worldbuilding": parsed.get("worldbuilding", []) if isinstance(parsed.get("worldbuilding", []), list) else [],
        "characters": parsed.get("characters", []) if isinstance(parsed.get("characters", []), list) else [],
        "outlines": parsed.get("outlines", []) if isinstance(parsed.get("outlines", []), list) else [],
        "chapters": parsed.get("chapters", []) if isinstance(parsed.get("chapters", []), list) else [],
        "reviews": parsed.get("reviews", []) if isinstance(parsed.get("reviews", []), list) else [],
        "runs": parsed.get("runs", []) if isinstance(parsed.get("runs", []), list) else [],
    }


def connect_db() -> sqlite3.Connection:
    db_url = os.environ.get("SQLITE_DATABASE_URL") or os.environ.get("DATABASE_URL") or "file:../workspace/novel.sqlite"
    if db_url.startswith("file:"):
        db_path = db_url[5:]
        if "?" in db_path:
            db_path = db_path.split("?", 1)[0]
        return sqlite3.connect(db_path)

    return sqlite3.connect(db_url)


def main():
    workspace = Path(os.environ.get("NOVEL_WORKSPACE") or Path.cwd() / "workspace")
    store = load_store(workspace)
    imported_at = now_iso()
    conn = connect_db()
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    try:
        cur.execute("BEGIN")

        for project in store["projects"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO projects (id, title, genre, sub_genres, length_target, target_audience, style_tags, commercial_tags, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(project.get("id")),
                    to_text(project.get("title"), "未命名小说"),
                    to_text(project.get("genre")),
                    json.dumps(parse_json_array(project.get("sub_genres"))),
                    to_text(project.get("length_target"), "medium"),
                    to_text(project.get("target_audience")),
                    json.dumps(parse_json_array(project.get("style_tags"))),
                    json.dumps(parse_json_array(project.get("commercial_tags"))),
                    to_text(project.get("status"), "draft"),
                    to_text(project.get("created_at"), imported_at),
                    to_text(project.get("updated_at"), imported_at),
                ),
            )

        for item in store["worldbuilding"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO worldbuilding (id, project_id, world_summary, rules, factions, locations, systems, timeline_anchor, known_unknowns, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    to_text(item.get("world_summary")),
                    json.dumps(parse_json_array(item.get("rules"))),
                    json.dumps(parse_json_array(item.get("factions"))),
                    json.dumps(parse_json_array(item.get("locations"))),
                    json.dumps(parse_json_array(item.get("systems"))),
                    to_text(item.get("timeline_anchor")),
                    json.dumps(parse_json_array(item.get("known_unknowns"))),
                    to_number(item.get("version"), 1),
                    to_text(item.get("created_at"), imported_at),
                    to_text(item.get("updated_at"), imported_at),
                ),
            )

        for item in store["characters"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO characters (id, project_id, name, role_type, archetype, motivation, goal, conflict, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    to_text(item.get("name"), "未命名角色"),
                    to_text(item.get("role_type")),
                    to_text(item.get("archetype")),
                    to_text(item.get("motivation")),
                    to_text(item.get("goal")),
                    to_text(item.get("conflict")),
                    to_text(item.get("created_at"), imported_at),
                    to_text(item.get("updated_at"), imported_at),
                ),
            )

        for item in store["outlines"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO outlines (id, project_id, outline_type, title, summary, conflict_points, turning_points, hook, parent_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    to_text(item.get("outline_type"), "master"),
                    to_text(item.get("title"), "未命名大纲"),
                    to_text(item.get("summary")),
                    json.dumps(parse_json_array(item.get("conflict_points"))),
                    json.dumps(parse_json_array(item.get("turning_points"))),
                    to_text(item.get("hook")),
                    None if item.get("parent_id") is None else to_number(item.get("parent_id")),
                    to_text(item.get("created_at"), imported_at),
                    to_text(item.get("updated_at"), imported_at),
                ),
            )

        for item in store["chapters"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO chapters (id, project_id, outline_id, chapter_no, title, chapter_goal, chapter_summary, conflict, ending_hook, chapter_text, scene_breakdown, continuity_notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    None if item.get("outline_id") is None else to_number(item.get("outline_id")),
                    to_number(item.get("chapter_no"), 1),
                    to_text(item.get("title"), "第一章"),
                    to_text(item.get("chapter_goal")),
                    to_text(item.get("chapter_summary")),
                    to_text(item.get("conflict")),
                    to_text(item.get("ending_hook")),
                    to_text(item.get("chapter_text")),
                    json.dumps(parse_json_array(item.get("scene_breakdown"))),
                    json.dumps(parse_json_array(item.get("continuity_notes"))),
                    to_text(item.get("status"), "draft"),
                    to_text(item.get("created_at"), imported_at),
                    to_text(item.get("updated_at"), imported_at),
                ),
            )

        for item in store["reviews"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO reviews (id, project_id, review_type, status, summary, issues, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    to_text(item.get("review_type"), "continuity"),
                    to_text(item.get("status"), "ok"),
                    to_text(item.get("summary")),
                    json.dumps(parse_json_array(item.get("issues"))),
                    to_text(item.get("created_at"), imported_at),
                ),
            )

        for item in store["runs"]:
            cur.execute(
                """
                INSERT OR REPLACE INTO runs (id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    to_number(item.get("id")),
                    to_number(item.get("project_id")),
                    to_text(item.get("run_type"), "plan"),
                    to_text(item.get("step_name"), "step"),
                    to_text(item.get("status"), "pending"),
                    to_text(item.get("input_ref")),
                    to_text(item.get("output_ref")),
                    to_number(item.get("duration_ms"), 0),
                    to_text(item.get("error_message")),
                    to_text(item.get("created_at"), imported_at),
                ),
            )

        conn.commit()
        print("Import complete")
        print(f"Projects: {len(store['projects'])}")
        print(f"Worldbuilding: {len(store['worldbuilding'])}")
        print(f"Characters: {len(store['characters'])}")
        print(f"Outlines: {len(store['outlines'])}")
        print(f"Chapters: {len(store['chapters'])}")
        print(f"Reviews: {len(store['reviews'])}")
        print(f"Runs: {len(store['runs'])}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
