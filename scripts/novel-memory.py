#!/usr/bin/env python3
"""
novel-memory.py — Memory Palace for novel projects.
Stores, retrieves, verifies, and reconciles facts across chapters.
Uses SQLite + TF-IDF vector search (no external ML deps required).

Usage:
  python novel-memory.py init --palace-dir /path/to/data
  python novel-memory.py store --project 1 --content "..." --category character --tags name,protagonist
  python novel-memory.py recall --project 1 --query "主角能力" --top-k 5 --category character
  python novel-memory.py list --project 1 --category plot
  python novel-memory.py verify --project 1 --content "主角用了飞行能力" --category character
  python novel-memory.py reconcile --project 1 --category character
  python novel-memory.py dump --project 1
"""

import argparse
import html
import json
import math
import os
import re
import sqlite3
import sys
import time
import uuid
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ─── Constants ───

PALACE_DIR = os.environ.get("MEMPALACE_DIR", os.path.join(os.path.dirname(__file__), "..", "mempalace-data"))
DB_NAME = "memory.db"


def get_db_path() -> str:
    return os.path.join(PALACE_DIR, DB_NAME)


def get_conn() -> sqlite3.Connection:
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ─── TF-IDF Engine ───

def tokenize(text: str) -> List[str]:
    if not text:
        return []
    tokens = []
    for ch in text:
        if '\u4e00' <= ch <= '\u9fff' or '\u3040' <= ch <= '\u309f' or '\u30a0' <= ch <= '\u30ff':
            tokens.append(ch)
        elif ch.isalnum():
            tokens.append(ch.lower())
    english = re.findall(r'[a-zA-Z]+', text)
    tokens.extend(w.lower() for w in english)
    return [t for t in tokens if len(t) >= 1]


def compute_tfidf(documents: List[List[str]]) -> tuple:
    n_docs = len(documents)
    if n_docs == 0:
        return [], {}
    df = Counter()
    for doc in documents:
        for token in set(doc):
            df[token] += 1
    vocab = sorted(df.keys())
    token_to_idx = {t: i for i, t in enumerate(vocab)}
    vectors = []
    for doc in documents:
        tf = Counter(doc)
        vec: Dict[str, float] = {}
        for token, count in tf.items():
            if token in token_to_idx:
                idf = math.log((1 + n_docs) / (1 + df[token])) + 1
                vec[token] = count * idf
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vec = {t: v / norm for t, v in vec.items()}
        vectors.append(vec)
    return vectors, token_to_idx


def cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    common = set(a.keys()) & set(b.keys())
    if not common:
        return 0.0
    return sum(a[t] * b[t] for t in common)


# ─── Database Schema ───

def _get_columns(conn: sqlite3.Connection, table: str) -> set:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {r["name"] for r in rows}


def _ensure_column(conn: sqlite3.Connection, table: str, col: str, col_def: str):
    cols = _get_columns(conn, table)
    if col not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")


def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            project_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '[]',
            category TEXT DEFAULT 'general'
        );
        CREATE INDEX IF NOT EXISTS idx_project ON memories(project_id);
        CREATE INDEX IF NOT EXISTS idx_category ON memories(category);
        CREATE INDEX IF NOT EXISTS idx_project_category ON memories(project_id, category);

        CREATE TABLE IF NOT EXISTS facts (
            id TEXT PRIMARY KEY,
            project_id INTEGER NOT NULL,
            entity TEXT NOT NULL,
            attribute TEXT NOT NULL,
            value TEXT NOT NULL,
            source_memory_id TEXT,
            chapter_from INTEGER,
            chapter_to INTEGER,
            confidence REAL DEFAULT 1.0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (source_memory_id) REFERENCES memories(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_facts_project ON facts(project_id);
        CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity);
        CREATE INDEX IF NOT EXISTS idx_facts_entity_attr ON facts(entity, attribute);

        CREATE TABLE IF NOT EXISTS continuity_log (
            id TEXT PRIMARY KEY,
            project_id INTEGER NOT NULL,
            chapter_no INTEGER,
            issue_type TEXT,
            description TEXT,
            severity TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            resolution TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            resolved_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_continuity_project ON continuity_log(project_id);
        CREATE INDEX IF NOT EXISTS idx_continuity_status ON continuity_log(status);
    """)

    _ensure_column(conn, "memories", "timestamp", "TEXT DEFAULT ''")
    _ensure_column(conn, "memories", "tokens", "TEXT DEFAULT '[]'")
    _ensure_column(conn, "memories", "created_at", "TEXT DEFAULT ''")
    _ensure_column(conn, "memories", "updated_at", "TEXT DEFAULT ''")

    conn.execute("UPDATE memories SET created_at = datetime('now') WHERE created_at IS NULL OR created_at = ''")
    conn.execute("UPDATE memories SET updated_at = datetime('now') WHERE updated_at IS NULL OR updated_at = ''")
    conn.execute("UPDATE memories SET timestamp = COALESCE(created_at, timestamp, datetime('now')) WHERE timestamp IS NULL OR timestamp = ''")
    conn.commit()


# ─── Memory CRUD ───

def store_memory(project_id: int, content: str, category: str, tags: List[str]) -> str:
    conn = get_conn()
    try:
        mid = str(uuid.uuid4())[:12]
        tokens = tokenize(content)
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            "INSERT INTO memories (id, project_id, content, tags, category, tokens, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (mid, project_id, content, json.dumps(tags, ensure_ascii=False), category, json.dumps(tokens, ensure_ascii=False), now, now, now),
        )
        conn.commit()
        print(json.dumps({"status": "ok", "memory_id": mid}, ensure_ascii=False))
        return mid
    finally:
        conn.close()


def recall_memories(project_id: int, query: str, top_k: int = 5, category: Optional[str] = None) -> List[Dict]:
    conn = get_conn()
    try:
        sql = "SELECT * FROM memories WHERE project_id = ?"
        params: List[Any] = [project_id]
        if category:
            sql += " AND category = ?"
            params.append(category)
        rows = conn.execute(sql, params).fetchall()
        if not rows:
            print(json.dumps({"status": "ok", "count": 0, "results": []}, ensure_ascii=False))
            return []
        memories_docs = []
        for r in rows:
            row = dict(r)
            try:
                tok = json.loads(row["tokens"]) if isinstance(row.get("tokens"), str) else tokenize(row["content"])
            except:
                tok = tokenize(row["content"])
            memories_docs.append(tok)
        query_tokens = tokenize(query)
        all_docs = [query_tokens] + memories_docs
        vectors, _ = compute_tfidf(all_docs)
        query_vec = vectors[0]
        scored = []
        for i, row in enumerate(rows):
            sim = cosine_similarity(query_vec, vectors[i + 1]) if i < len(vectors) - 1 else 0.0
            scored.append((sim, dict(row)))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for sim, mem in scored[:top_k]:
            results.append({
                "id": mem["id"], "project_id": mem["project_id"], "content": mem["content"],
                "tags": json.loads(mem["tags"]) if isinstance(mem["tags"], str) else mem["tags"],
                "category": mem["category"], "timestamp": mem["created_at"], "similarity": round(sim, 4),
            })
        print(json.dumps({"status": "ok", "count": len(results), "results": results}, ensure_ascii=False))
        return results
    finally:
        conn.close()


def list_memories(project_id: int, category: Optional[str] = None) -> List[Dict]:
    conn = get_conn()
    try:
        sql = "SELECT * FROM memories WHERE project_id = ?"
        params: List[Any] = [project_id]
        if category:
            sql += " AND category = ?"
            params.append(category)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        memories = [{"id": r["id"], "project_id": r["project_id"], "content": r["content"],
                      "tags": json.loads(r["tags"]) if isinstance(r["tags"], str) else r["tags"],
                      "category": r["category"], "timestamp": r["created_at"]} for r in rows]
        print(json.dumps({"status": "ok", "count": len(memories), "memories": memories}, ensure_ascii=False))
        return memories
    finally:
        conn.close()


def delete_memory(project_id: int, memory_id: str) -> bool:
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM memories WHERE id = ? AND project_id = ?", (memory_id, project_id))
        conn.commit()
        ok = cur.rowcount > 0
        print(json.dumps({"status": "ok" if ok else "not_found", "deleted": ok}, ensure_ascii=False))
        return ok
    finally:
        conn.close()


# ─── Facts ───

def extract_facts(content: str) -> List[Dict]:
    facts = []
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})有([\u4e00-\u9fff\w，、]{2,30})能力', content):
        facts.append({"entity": m.group(1), "attribute": "ability", "value": m.group(2)})
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})能([\u4e00-\u9fff\w]{2,20})', content):
        v = m.group(2)
        if v not in ('力', '不', '够', '够不'):
            facts.append({"entity": m.group(1), "attribute": "ability", "value": v})
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})在([\u4e00-\u9fff\w，、]{2,30})', content):
        facts.append({"entity": m.group(1), "attribute": "location", "value": m.group(2).rstrip('，、。')})
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})的([\u4e00-\u9fff\w]{1,4})是([\u4e00-\u9fff\w，、]{2,30})', content):
        facts.append({"entity": m.group(1), "attribute": m.group(2), "value": m.group(3).rstrip('，、。')})
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})是([\u4e00-\u9fff\w，、]{2,30})', content):
        v = m.group(2).rstrip('，、。')
        if v and len(v) > 1:
            facts.append({"entity": m.group(1), "attribute": "identity", "value": v})
    return facts


def store_facts(project_id: int, content: str, source_memory_id: Optional[str] = None, chapter_no: Optional[int] = None) -> List[str]:
    conn = get_conn()
    try:
        facts = extract_facts(content)
        stored_ids = []
        for fact in facts:
            fid = str(uuid.uuid4())[:12]
            conn.execute(
                "INSERT INTO facts (id, project_id, entity, attribute, value, source_memory_id, chapter_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                (fid, project_id, fact["entity"], fact["attribute"], fact["value"], source_memory_id, chapter_no),
            )
            stored_ids.append(fid)
        conn.commit()
        print(json.dumps({"status": "ok", "count": len(stored_ids), "facts": [{"id": fid, **fact} for fid, fact in zip(stored_ids, facts)]}, ensure_ascii=False))
        return stored_ids
    finally:
        conn.close()


def query_facts(project_id: int, entity: Optional[str] = None, attribute: Optional[str] = None) -> List[Dict]:
    conn = get_conn()
    try:
        sql = "SELECT * FROM facts WHERE project_id = ?"
        params: List[Any] = [project_id]
        if entity:
            sql += " AND entity = ?"
            params.append(entity)
        if attribute:
            sql += " AND attribute = ?"
            params.append(attribute)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        facts = [dict(r) for r in rows]
        print(json.dumps({"status": "ok", "count": len(facts), "facts": facts}, ensure_ascii=False))
        return facts
    finally:
        conn.close()


# ─── Continuity Verification ───

def verify_content(project_id: int, content: str, category: str = "general") -> Dict:
    conn = get_conn()
    try:
        new_facts = extract_facts(content)
        new_fact_map = {(f["entity"], f["attribute"]): f["value"] for f in new_facts}
        entities = list(set(f["entity"] for f in new_facts))
        existing_facts = []
        for entity in entities:
            rows = conn.execute("SELECT * FROM facts WHERE project_id = ? AND entity = ? ORDER BY created_at DESC", (project_id, entity)).fetchall()
            existing_facts.extend([dict(r) for r in rows])
        issues = []
        for entity, attr in new_fact_map:
            val = new_fact_map[(entity, attr)]
            for ef in existing_facts:
                if ef["entity"] == entity and ef["attribute"] == attr and ef["value"] != val:
                    issues.append({"type": "fact_contradiction", "entity": entity, "attribute": attr,
                                   "new_value": val, "existing_value": ef["value"], "severity": "high",
                                   "description": f"实体「{entity}」的{attr}冲突：旧值「{ef['value']}」vs 新值「{val}」"})
        result = {"status": "ok", "issue_count": len(issues), "issues": issues, "is_consistent": len(issues) == 0}
        print(json.dumps(result, ensure_ascii=False))
        return result
    finally:
        conn.close()


def log_continuity_issue(project_id: int, chapter_no: Optional[int], issue_type: str, description: str, severity: str = "medium", resolution: Optional[str] = None) -> str:
    conn = get_conn()
    try:
        lid = str(uuid.uuid4())[:12]
        conn.execute(
            "INSERT INTO continuity_log (id, project_id, chapter_no, issue_type, description, severity, status, resolution, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (lid, project_id, chapter_no, issue_type, description, severity, "resolved" if resolution else "open", resolution),
        )
        conn.commit()
        print(json.dumps({"status": "ok", "log_id": lid}, ensure_ascii=False))
        return lid
    finally:
        conn.close()


def list_continuity_issues(project_id: int, status: Optional[str] = None) -> List[Dict]:
    conn = get_conn()
    try:
        sql = "SELECT * FROM continuity_log WHERE project_id = ?"
        params: List[Any] = [project_id]
        if status:
            sql += " AND status = ?"
            params.append(status)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        issues = [dict(r) for r in rows]
        print(json.dumps({"status": "ok", "count": len(issues), "issues": issues}, ensure_ascii=False))
        return issues
    finally:
        conn.close()


def reconcile(project_id: int, category: Optional[str] = None) -> Dict:
    conn = get_conn()
    try:
        sql = "SELECT * FROM facts WHERE project_id = ?"
        params: List[Any] = [project_id]
        if category:
            sql += " AND source_memory_id IN (SELECT id FROM memories WHERE category = ?)"
            params.append(category)
        sql += " ORDER BY entity, attribute, chapter_from"
        rows = conn.execute(sql, params).fetchall()
        facts_by_key: Dict[tuple, List[Dict]] = defaultdict(list)
        for r in rows:
            dr = dict(r)
            facts_by_key[(dr["entity"], dr["attribute"])].append(dr)
        contradictions = []
        for (entity, attr), fact_list in facts_by_key.items():
            if len(fact_list) > 1:
                values = set(f["value"] for f in fact_list)
                if len(values) > 1:
                    contradictions.append({"entity": entity, "attribute": attr,
                                           "values": [{"value": f["value"], "chapter": f.get("chapter_from")} for f in fact_list]})
        print(json.dumps({"status": "ok", "total_facts": len(rows), "contradiction_count": len(contradictions), "contradictions": contradictions}, ensure_ascii=False))
        return {"contradictions": contradictions}
    finally:
        conn.close()


def dump_project(project_id: int) -> Dict:
    conn = get_conn()
    try:
        memories_rows = conn.execute("SELECT * FROM memories WHERE project_id = ? ORDER BY created_at", (project_id,)).fetchall()
        facts_rows = conn.execute("SELECT * FROM facts WHERE project_id = ? ORDER BY entity, attribute", (project_id,)).fetchall()
        continuity_rows = conn.execute("SELECT * FROM continuity_log WHERE project_id = ? ORDER BY created_at", (project_id,)).fetchall()
        memories = []
        for r in memories_rows:
            dr = dict(r)
            try:
                dr["tags"] = json.loads(dr["tags"]) if isinstance(dr["tags"], str) else dr["tags"]
            except:
                pass
            memories.append(dr)
        print(json.dumps({"status": "ok", "project_id": project_id, "memory_count": len(memories), "fact_count": len(facts_rows),
                          "continuity_issue_count": len(continuity_rows), "memories": memories,
                          "facts": [dict(r) for r in facts_rows], "continuity_log": [dict(r) for r in continuity_rows]}, ensure_ascii=False))
        return {}
    finally:
        conn.close()


def purge_project(project_id: int) -> Dict:
    conn = get_conn()
    try:
        mem_count = conn.execute("SELECT COUNT(*) FROM memories WHERE project_id = ?", (project_id,)).fetchone()[0]
        fact_count = conn.execute("SELECT COUNT(*) FROM facts WHERE project_id = ?", (project_id,)).fetchone()[0]
        cont_count = conn.execute("SELECT COUNT(*) FROM continuity_log WHERE project_id = ?", (project_id,)).fetchone()[0]
        conn.execute("DELETE FROM continuity_log WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM facts WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM memories WHERE project_id = ?", (project_id,))
        conn.commit()
        result = {"status": "ok", "project_id": project_id, "deleted_memories": mem_count, "deleted_facts": fact_count, "deleted_continuity": cont_count}
        print(json.dumps(result, ensure_ascii=False))
        return result
    finally:
        conn.close()


# ─── Knowledge Table (Project-scoped Writing Knowledge Base) ───

def _ensure_knowledge_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS knowledge (
            id TEXT PRIMARY KEY, category TEXT NOT NULL DEFAULT 'writing_style',
            project_id INTEGER DEFAULT 0, project_title TEXT DEFAULT '',
            source TEXT NOT NULL DEFAULT '', source_title TEXT DEFAULT '',
            title TEXT DEFAULT '', content TEXT NOT NULL,
            tags TEXT DEFAULT '[]', weight INTEGER DEFAULT 3,
            genre_tags TEXT DEFAULT '[]', trope_tags TEXT DEFAULT '[]',
            use_case TEXT DEFAULT '', evidence TEXT DEFAULT '', chapter_range TEXT DEFAULT '',
            entities TEXT DEFAULT '[]', confidence REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    for col_name, col_def in [
        ("source_title", "TEXT DEFAULT ''"),
        ("title", "TEXT DEFAULT ''"),
        ("weight", "INTEGER DEFAULT 3"),
        ("project_id", "INTEGER DEFAULT 0"),
        ("project_title", "TEXT DEFAULT ''"),
        ("genre_tags", "TEXT DEFAULT '[]'"),
        ("trope_tags", "TEXT DEFAULT '[]'"),
        ("use_case", "TEXT DEFAULT ''"),
        ("evidence", "TEXT DEFAULT ''"),
        ("chapter_range", "TEXT DEFAULT ''"),
        ("entities", "TEXT DEFAULT '[]'"),
        ("confidence", "REAL DEFAULT 0"),
    ]:
        _ensure_column(conn, "knowledge", col_name, col_def)
    conn.executescript("""
        CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge(project_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_project_category ON knowledge(project_id, category);
        CREATE INDEX IF NOT EXISTS idx_knowledge_project_title ON knowledge(project_title);
    """)
    conn.commit()


def _parse_json_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v).strip() for v in parsed if str(v).strip()]
        except:
            pass
        return [t.strip() for t in re.split(r"[,，\n]", value) if t.strip()]
    return []


def _normalize_knowledge_row(row: sqlite3.Row) -> Dict:
    d = dict(row)
    for key in ("tags", "genre_tags", "trope_tags", "entities"):
        d[key] = _parse_json_list(d.get(key))
    try:
        d["confidence"] = float(d.get("confidence") or 0)
    except:
        d["confidence"] = 0
    return d


def _knowledge_project_filters(project_id: Optional[int] = None, project_title: Optional[str] = None) -> tuple[List[str], List[Any]]:
    clauses: List[str] = []
    params: List[Any] = []
    if project_id is not None:
        clauses.append("project_id = ?")
        params.append(int(project_id))
    elif project_title:
        clauses.append("project_title = ?")
        params.append(project_title)
    return clauses, params


def store_knowledge(
    category: str,
    content: str,
    source: str,
    source_title: str = "",
    title: str = "",
    tags: List[str] = None,
    weight: int = 3,
    project_id: int = 0,
    project_title: str = "",
    genre_tags: List[str] = None,
    trope_tags: List[str] = None,
    use_case: str = "",
    evidence: str = "",
    chapter_range: str = "",
    entities: List[str] = None,
    confidence: float = 0,
) -> str:
    conn = get_conn()
    try:
        _ensure_knowledge_table(conn)
        kid = str(uuid.uuid4())[:12]
        tags = tags or []
        genre_tags = genre_tags or []
        trope_tags = trope_tags or []
        entities = entities or []
        conn.execute(
            "INSERT INTO knowledge (id, category, project_id, project_title, source, source_title, title, content, tags, weight, genre_tags, trope_tags, use_case, evidence, chapter_range, entities, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (
                kid, category, int(project_id or 0), project_title or "", source, source_title, title, content,
                json.dumps(tags, ensure_ascii=False), weight,
                json.dumps(genre_tags, ensure_ascii=False), json.dumps(trope_tags, ensure_ascii=False),
                use_case or "", evidence or "", chapter_range or "",
                json.dumps(entities, ensure_ascii=False), float(confidence or 0),
            ),
        )
        conn.commit()
        print(json.dumps({"status": "ok", "knowledge_id": kid, "project_id": int(project_id or 0), "project_title": project_title or ""}, ensure_ascii=False))
        return kid
    finally:
        conn.close()


def query_knowledge(
    query: str,
    category: Optional[str] = None,
    top_k: int = 10,
    project_id: Optional[int] = None,
    project_title: Optional[str] = None,
) -> List[Dict]:
    conn = get_conn()
    try:
        _ensure_knowledge_table(conn)
        sql = "SELECT * FROM knowledge"
        params: List[Any] = []
        clauses, project_params = _knowledge_project_filters(project_id, project_title)
        params.extend(project_params)
        if category:
            clauses.append("category = ?")
            params.append(category)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        if not rows:
            print(json.dumps({"status": "ok", "count": 0, "results": []}, ensure_ascii=False))
            return []
        query_tokens = tokenize(query)
        all_docs = [query_tokens] + [tokenize(r["content"]) for r in rows]
        vectors, _ = compute_tfidf(all_docs)
        scored = []
        for i, r in enumerate(rows):
            sim = cosine_similarity(vectors[0], vectors[i + 1]) if i < len(vectors) - 1 else 0.0
            d = _normalize_knowledge_row(r)
            scored.append((sim, d))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = [{**entry, "similarity": round(sim, 4)} for sim, entry in scored[:top_k]]
        print(json.dumps({"status": "ok", "count": len(results), "results": results}, ensure_ascii=False))
        return results
    finally:
        conn.close()


def list_knowledge(
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    project_title: Optional[str] = None,
) -> Dict:
    conn = get_conn()
    try:
        _ensure_knowledge_table(conn)
        sql = "SELECT * FROM knowledge"
        params: List[Any] = []
        clauses, project_params = _knowledge_project_filters(project_id, project_title)
        params.extend(project_params)
        if category:
            clauses.append("category = ?")
            params.append(category)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        entries = []
        for r in rows:
            entries.append(_normalize_knowledge_row(r))
        print(json.dumps({"status": "ok", "count": len(entries), "entries": entries}, ensure_ascii=False))
        return {"entries": entries}
    finally:
        conn.close()


def purge_knowledge(ids: Optional[List[str]] = None, source: Optional[str] = None) -> Dict:
    conn = get_conn()
    try:
        _ensure_knowledge_table(conn)
        if ids:
            placeholders = ",".join("?" for _ in ids)
            cur = conn.execute(f"DELETE FROM knowledge WHERE id IN ({placeholders})", ids)
        elif source:
            cur = conn.execute("DELETE FROM knowledge WHERE source = ?", (source,))
        else:
            print(json.dumps({"status": "error", "message": "Must provide ids or source"}, ensure_ascii=False))
            return {"status": "error"}
        conn.commit()
        print(json.dumps({"status": "ok", "deleted": cur.rowcount}, ensure_ascii=False))
        return {"deleted": cur.rowcount}
    finally:
        conn.close()


# ─── Local File Read ───

def read_local_file(file_path: str) -> Dict:
    """Read a local file (TXT or PDF) and return extracted text."""
    try:
        if not os.path.isfile(file_path):
            return {"status": "error", "message": f"文件不存在: {file_path}"}
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                text = f.read()
            return {"status": "ok", "text": text, "length": len(text), "source": os.path.basename(file_path)}
        elif ext == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    pages_text = []
                    for page in reader.pages:
                        p_text = page.extract_text()
                        if p_text:
                            pages_text.append(p_text)
                    text = '\n\n'.join(pages_text)
                return {"status": "ok", "text": text, "length": len(text), "source": os.path.basename(file_path), "pages": len(reader.pages)}
            except ImportError:
                return {"status": "error", "message": "PDF 解析需要 PyPDF2，请在 scripts/venv 中运行: pip install PyPDF2"}
            except Exception as e:
                return {"status": "error", "message": f"PDF 解析失败: {str(e)}"}
        else:
            return {"status": "error", "message": f"不支持的文件格式: {ext}（支持 .txt 和 .pdf）"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ─── URL Fetch ───

def fetch_url_text(url: str) -> Dict:
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; MangaForge/1.0)"})
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        text = re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<p[^>]*>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        text = html.unescape(text)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        clean_text = '\n'.join(lines)
        return {"status": "ok", "text": clean_text, "length": len(clean_text)}
    except HTTPError as e:
        return {"status": "error", "message": f"HTTP {e.code}: {e.reason}"}
    except URLError as e:
        return {"status": "error", "message": f"URL Error: {e.reason}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ─── CLI ───

def main():
    global PALACE_DIR
    parser = argparse.ArgumentParser(description="Novel Memory Palace")
    parser.add_argument("--palace-dir", default=PALACE_DIR, help="Memory palace data directory")
    sub = parser.add_subparsers(dest="command")

    # init
    p_init = sub.add_parser("init")
    p_init.add_argument("--palace-dir", default=None)

    # store
    p = sub.add_parser("store")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--content", default=None)
    p.add_argument("--content-file", default=None)
    p.add_argument("--category", default="general")
    p.add_argument("--tags", default="")
    p.add_argument("--chapter", type=int, default=None)

    # recall
    p = sub.add_parser("recall")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--query", required=True)
    p.add_argument("--top-k", type=int, default=5)
    p.add_argument("--category", default=None)

    # list
    p = sub.add_parser("list")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--category", default=None)

    # delete
    p = sub.add_parser("delete")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--memory-id", required=True)

    # store-facts
    p = sub.add_parser("store-facts")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--content", default=None)
    p.add_argument("--content-file", default=None)
    p.add_argument("--source-id", default=None)
    p.add_argument("--chapter", type=int, default=None)

    # query-facts
    p = sub.add_parser("query-facts")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--entity", default=None)
    p.add_argument("--attribute", default=None)

    # list-facts
    p = sub.add_parser("list-facts")
    p.add_argument("--project", type=int, required=True)

    # verify
    p = sub.add_parser("verify")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--content", default=None)
    p.add_argument("--content-file", default=None)
    p.add_argument("--category", default="general")

    # reconcile
    p = sub.add_parser("reconcile")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--category", default=None)

    # log-continuity
    p = sub.add_parser("log-continuity")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--chapter", type=int, default=None)
    p.add_argument("--issue-type", required=True)
    p.add_argument("--description", required=True)
    p.add_argument("--severity", default="medium")
    p.add_argument("--resolution", default=None)

    # list-continuity
    p = sub.add_parser("list-continuity")
    p.add_argument("--project", type=int, required=True)
    p.add_argument("--status", default=None)

    # dump
    p = sub.add_parser("dump")
    p.add_argument("--project", type=int, required=True)

    # purge-project
    p = sub.add_parser("purge-project")
    p.add_argument("--project", type=int, required=True)

    # ── Knowledge subcommands ──
    p = sub.add_parser("store-knowledge")
    p.add_argument("--category", default="writing_style")
    p.add_argument("--content", default=None)
    p.add_argument("--content-file", default=None)
    p.add_argument("--source", default="")
    p.add_argument("--source-title", default="")
    p.add_argument("--title", default="")
    p.add_argument("--tags", default="[]")
    p.add_argument("--weight", type=int, default=3)
    p.add_argument("--project-id", type=int, default=0)
    p.add_argument("--project-title", default="")
    p.add_argument("--genre-tags", default="[]")
    p.add_argument("--trope-tags", default="[]")
    p.add_argument("--use-case", default="")
    p.add_argument("--evidence", default="")
    p.add_argument("--chapter-range", default="")
    p.add_argument("--entities", default="[]")
    p.add_argument("--confidence", type=float, default=0)

    p = sub.add_parser("query-knowledge")
    p.add_argument("--query", required=True)
    p.add_argument("--category", default=None)
    p.add_argument("--top-k", type=int, default=10)
    p.add_argument("--project-id", type=int, default=None)
    p.add_argument("--project-title", default=None)

    p = sub.add_parser("list-knowledge")
    p.add_argument("--category", default=None)
    p.add_argument("--project-id", type=int, default=None)
    p.add_argument("--project-title", default=None)

    p = sub.add_parser("purge-knowledge")
    p.add_argument("--ids", default=None)
    p.add_argument("--source", default=None)

    # ── URL Fetch ──
    p = sub.add_parser("fetch-url")
    p.add_argument("--url", required=True)

    # ── Local File Read ──
    p = sub.add_parser("read-local-file")
    p.add_argument("--file", required=True)

    args = parser.parse_args()
    if args.palace_dir:
        PALACE_DIR = args.palace_dir
    os.makedirs(PALACE_DIR, exist_ok=True)

    def get_content(args):
        """Resolve content from --content or --content-file."""
        if args.content:
            return args.content
        if args.content_file:
            with open(args.content_file, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    if args.command == "init":
        conn = get_conn()
        try:
            init_db(conn)
            print(json.dumps({"status": "ok", "palace_dir": PALACE_DIR}))
        finally:
            conn.close()

    elif args.command == "store":
        tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []
        content = get_content(args)
        store_memory(args.project, content, args.category, tags)

    elif args.command == "recall":
        recall_memories(args.project, args.query, args.top_k, args.category)

    elif args.command == "list":
        list_memories(args.project, args.category)

    elif args.command == "delete":
        delete_memory(args.project, args.memory_id)

    elif args.command == "store-facts":
        content = get_content(args)
        store_facts(args.project, content, args.source_id, args.chapter)

    elif args.command == "query-facts":
        query_facts(args.project, args.entity, args.attribute)

    elif args.command == "list-facts":
        query_facts(args.project)

    elif args.command == "verify":
        content = get_content(args)
        verify_content(args.project, content, args.category)

    elif args.command == "reconcile":
        reconcile(args.project, args.category)

    elif args.command == "log-continuity":
        log_continuity_issue(args.project, args.chapter, args.issue_type, args.description, args.severity, args.resolution)

    elif args.command == "list-continuity":
        list_continuity_issues(args.project, args.status)

    elif args.command == "dump":
        dump_project(args.project)

    elif args.command == "purge-project":
        purge_project(args.project)

    elif args.command == "store-knowledge":
        content = args.content or ""
        if args.content_file:
            with open(args.content_file, "r", encoding="utf-8") as f:
                content = f.read()
        tags = _parse_json_list(args.tags)
        genre_tags = _parse_json_list(args.genre_tags)
        trope_tags = _parse_json_list(args.trope_tags)
        entities = _parse_json_list(args.entities)
        store_knowledge(
            args.category,
            content,
            args.source,
            args.source_title,
            args.title,
            tags,
            args.weight,
            args.project_id,
            args.project_title,
            genre_tags,
            trope_tags,
            args.use_case,
            args.evidence,
            args.chapter_range,
            entities,
            args.confidence,
        )

    elif args.command == "query-knowledge":
        query_knowledge(args.query, args.category, args.top_k, args.project_id, args.project_title)

    elif args.command == "list-knowledge":
        list_knowledge(args.category, args.project_id, args.project_title)

    elif args.command == "purge-knowledge":
        ids = None
        if args.ids:
            try:
                ids = json.loads(args.ids)
            except:
                ids = [t.strip() for t in args.ids.split(",") if t.strip()]
        purge_knowledge(ids, args.source)

    elif args.command == "fetch-url":
        result = fetch_url_text(args.url)
        print(json.dumps(result, ensure_ascii=False))

    elif args.command == "read-local-file":
        result = read_local_file(args.file)
        print(json.dumps(result, ensure_ascii=False))

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
