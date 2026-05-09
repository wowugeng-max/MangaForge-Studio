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
    """Simple Chinese+English tokenizer: split on whitespace/punctuation, keep CJK chars."""
    if not text:
        return []
    # Keep CJK characters as individual tokens, split English words
    tokens = []
    for ch in text:
        if '\u4e00' <= ch <= '\u9fff' or '\u3040' <= ch <= '\u309f' or '\u30a0' <= ch <= '\u30ff':
            tokens.append(ch)
        elif ch.isalnum():
            tokens.append(ch.lower())
    # Also extract English words
    english = re.findall(r'[a-zA-Z]+', text)
    tokens.extend(w.lower() for w in english)
    # Remove very short tokens
    return [t for t in tokens if len(t) >= 1]


def compute_tfidf(documents: List[List[str]]) -> tuple:
    """Compute TF-IDF vectors for a list of documents (each doc is a list of tokens)."""
    n_docs = len(documents)
    if n_docs == 0:
        return [], {}

    # Document-Frequency
    df = Counter()
    for doc in documents:
        for token in set(doc):
            df[token] += 1

    # Vocabulary
    vocab = sorted(df.keys())
    token_to_idx = {t: i for i, t in enumerate(vocab)}

    # TF-IDF vectors (sparse: dict of token->score)
    vectors = []
    for doc in documents:
        tf = Counter(doc)
        vec: Dict[str, float] = {}
        for token, count in tf.items():
            if token in token_to_idx:
                idf = math.log((1 + n_docs) / (1 + df[token])) + 1
                vec[token] = count * idf
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vec = {t: v / norm for t, v in vec.items()}
        vectors.append(vec)

    return vectors, token_to_idx


def cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Cosine similarity between two sparse TF-IDF vectors."""
    common = set(a.keys()) & set(b.keys())
    if not common:
        return 0.0
    num = sum(a[t] * b[t] for t in common)
    # Vectors are already normalized
    return num


# ─── Database Schema ───

def init_db(conn: sqlite3.Connection):
    """Initialize the memory palace database."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            project_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '[]',
            category TEXT DEFAULT 'general',
            tokens TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
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
    conn.commit()


# ─── Memory CRUD ───

def store_memory(project_id: int, content: str, category: str, tags: List[str]) -> str:
    """Store a memory record. Returns memory ID."""
    conn = get_conn()
    try:
        mid = str(uuid.uuid4())[:12]
        tokens = tokenize(content)
        conn.execute(
            "INSERT INTO memories (id, project_id, content, tags, category, tokens, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
            (mid, project_id, content, json.dumps(tags, ensure_ascii=False), category, json.dumps(tokens, ensure_ascii=False)),
        )
        conn.commit()
        result = {"status": "ok", "memory_id": mid}
        print(json.dumps(result, ensure_ascii=False))
        return mid
    finally:
        conn.close()


def recall_memories(project_id: int, query: str, top_k: int = 5, category: Optional[str] = None) -> List[Dict]:
    """Recall memories by TF-IDF similarity to query."""
    conn = get_conn()
    try:
        # Fetch all relevant memories
        sql = "SELECT * FROM memories WHERE project_id = ?"
        params: List[Any] = [project_id]
        if category:
            sql += " AND category = ?"
            params.append(category)

        rows = conn.execute(sql, params).fetchall()
        if not rows:
            print(json.dumps({"status": "ok", "count": 0, "results": []}, ensure_ascii=False))
            return []

        # Build documents for TF-IDF
        docs = [[r["tokens"]] for r in rows] if rows[0]["tokens"] else []
        # Parse stored token arrays
        memories_docs: List[List[str]] = []
        for r in rows:
            try:
                t = json.loads(r["tags"]) if isinstance(r.get("tags"), str) else []
            except:
                t = []
            try:
                tok = json.loads(r["tokens"]) if isinstance(r.get("tokens"), str) else tokenize(r["content"])
            except:
                tok = tokenize(r["content"])
            memories_docs.append(tok)

        query_tokens = tokenize(query)

        # Compute TF-IDF
        all_docs = [query_tokens] + memories_docs
        vectors, _ = compute_tfidf(all_docs)
        query_vec = vectors[0]
        mem_vectors = vectors[1:]

        # Score each memory
        scored: List[tuple] = []
        for i, row in enumerate(rows):
            if i < len(mem_vectors):
                sim = cosine_similarity(query_vec, mem_vectors[i])
            else:
                sim = 0.0
            scored.append((sim, dict(row)))

        # Sort by similarity, take top_k
        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for sim, mem in scored[:top_k]:
            results.append({
                "id": mem["id"],
                "project_id": mem["project_id"],
                "content": mem["content"],
                "tags": json.loads(mem["tags"]) if isinstance(mem["tags"], str) else mem["tags"],
                "category": mem["category"],
                "timestamp": mem["created_at"],
                "similarity": round(sim, 4),
            })

        print(json.dumps({"status": "ok", "count": len(results), "results": results}, ensure_ascii=False))
        return results
    finally:
        conn.close()


def list_memories(project_id: int, category: Optional[str] = None) -> List[Dict]:
    """List all memories for a project."""
    conn = get_conn()
    try:
        sql = "SELECT * FROM memories WHERE project_id = ? ORDER BY created_at DESC"
        params: List[Any] = [project_id]
        if category:
            sql += " AND category = ?"
            params.append(category)

        rows = conn.execute(sql, params).fetchall()
        memories = []
        for r in rows:
            memories.append({
                "id": r["id"],
                "project_id": r["project_id"],
                "content": r["content"],
                "tags": json.loads(r["tags"]) if isinstance(r["tags"], str) else r["tags"],
                "category": r["category"],
                "timestamp": r["created_at"],
            })
        print(json.dumps({"status": "ok", "count": len(memories), "memories": memories}, ensure_ascii=False))
        return memories
    finally:
        conn.close()


def delete_memory(project_id: int, memory_id: str) -> bool:
    """Delete a memory."""
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM memories WHERE id = ? AND project_id = ?", (memory_id, project_id))
        conn.commit()
        ok = cur.rowcount > 0
        print(json.dumps({"status": "ok" if ok else "not_found", "deleted": ok}, ensure_ascii=False))
        return ok
    finally:
        conn.close()


# ─── Facts (Entity-Attribute-Value) ───

def extract_facts(content: str) -> List[Dict]:
    """
    Simple fact extraction from content.
    Looks for patterns like:
    - "X是Y" → entity=X, attribute=identity, value=Y
    - "X有Y能力" → entity=X, attribute=ability, value=Y
    - "X在Y位置" → entity=X, attribute=location, value=Y
    - "X的Y是Z" → entity=X, attribute=Y, value=Z
    """
    facts = []
    # Pattern: X有Y能力 / X能Y
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})有([\u4e00-\u9fff\w，、]{2,30})能力', content):
        facts.append({"entity": m.group(1), "attribute": "ability", "value": m.group(2)})
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})能([\u4e00-\u9fff\w]{2,20})', content):
        v = m.group(2)
        if v not in ('力', '不', '够', '够不'):
            facts.append({"entity": m.group(1), "attribute": "ability", "value": v})

    # Pattern: X在Y
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})在([\u4e00-\u9fff\w，、]{2,30})', content):
        v = m.group(2).rstrip('，、。')
        facts.append({"entity": m.group(1), "attribute": "location", "value": v})

    # Pattern: X的Y
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})的([\u4e00-\u9fff\w]{1,4})是([\u4e00-\u9fff\w，、]{2,30})', content):
        facts.append({"entity": m.group(1), "attribute": m.group(2), "value": m.group(3).rstrip('，、。')})

    # Pattern: X是Y
    for m in re.finditer(r'([\u4e00-\u9fff\w]{1,6})是([\u4e00-\u9fff\w，、]{2,30})', content):
        v = m.group(2).rstrip('，、。')
        if v and len(v) > 1:
            facts.append({"entity": m.group(1), "attribute": "identity", "value": v})

    return facts


def store_facts(project_id: int, content: str, source_memory_id: Optional[str] = None, chapter_no: Optional[int] = None) -> List[str]:
    """Extract and store facts from content."""
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
        result = {
            "status": "ok",
            "count": len(stored_ids),
            "facts": [{"id": fid, **fact} for fid, fact in zip(stored_ids, facts)],
        }
        print(json.dumps(result, ensure_ascii=False))
        return stored_ids
    finally:
        conn.close()


def query_facts(project_id: int, entity: Optional[str] = None, attribute: Optional[str] = None) -> List[Dict]:
    """Query facts by entity and/or attribute."""
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


def list_all_facts(project_id: int) -> List[Dict]:
    """List all facts for a project."""
    return query_facts(project_id)


# ─── Continuity Verification ───

def verify_content(project_id: int, content: str, category: str = "general") -> Dict:
    """
    Verify a piece of content against existing memories and facts.
    Returns potential continuity issues.
    """
    conn = get_conn()
    try:
        # 1. Extract facts from new content
        new_facts = extract_facts(content)
        new_fact_map: Dict[tuple, str] = {}
        for f in new_facts:
            key = (f["entity"], f["attribute"])
            new_fact_map[key] = f["value"]

        # 2. Query existing facts for same entities
        entities = list(set(f["entity"] for f in new_facts))
        existing_facts = []
        for entity in entities:
            rows = conn.execute(
                "SELECT * FROM facts WHERE project_id = ? AND entity = ? ORDER BY created_at DESC",
                (project_id, entity),
            ).fetchall()
            existing_facts.extend([dict(r) for r in rows])

        # 3. Check for contradictions
        issues = []
        for entity, attr in new_fact_map:
            val = new_fact_map[(entity, attr)]
            # Find existing facts with same entity+attribute but different value
            for ef in existing_facts:
                if ef["entity"] == entity and ef["attribute"] == attr and ef["value"] != val:
                    issues.append({
                        "type": "fact_contradiction",
                        "entity": entity,
                        "attribute": attr,
                        "new_value": val,
                        "existing_value": ef["value"],
                        "source_chapter": ef.get("chapter_from"),
                        "severity": "high",
                        "description": f"实体「{entity}」的{attr}冲突：旧值「{ef['value']}」vs 新值「{val}」",
                    })

        # 4. Recall similar memories for context
        memories = []
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT 20",
            (project_id,),
        ).fetchall()
        all_docs = [tokenize(content)]
        mem_docs = []
        for r in rows:
            try:
                tok = json.loads(r["tokens"]) if isinstance(r["tokens"], str) else tokenize(r["content"])
            except:
                tok = tokenize(r["content"])
            mem_docs.append(tok)

        all_docs.extend(mem_docs)
        if all_docs:
            vectors, _ = compute_tfidf(all_docs)
            query_vec = vectors[0]
            for i, row in enumerate(rows):
                if i < len(vectors) - 1:
                    sim = cosine_similarity(query_vec, vectors[i + 1])
                    if sim > 0.1:
                        memories.append({
                            "id": row["id"],
                            "content": row["content"][:300],
                            "category": row["category"],
                            "similarity": round(sim, 4),
                        })

        result = {
            "status": "ok",
            "issue_count": len(issues),
            "issues": issues,
            "related_memories": memories[:5],
            "is_consistent": len(issues) == 0,
        }
        print(json.dumps(result, ensure_ascii=False))
        return result
    finally:
        conn.close()


def log_continuity_issue(project_id: int, chapter_no: Optional[int], issue_type: str, description: str, severity: str = "medium", resolution: Optional[str] = None) -> str:
    """Log a continuity issue."""
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
    """List continuity issues."""
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


# ─── Reconcile: Find and flag contradictions ───

def reconcile(project_id: int, category: Optional[str] = None) -> Dict:
    """
    Reconcile all facts for a project. Find contradictions where
    the same entity+attribute has different values.
    """
    conn = get_conn()
    try:
        sql = "SELECT * FROM facts WHERE project_id = ?"
        params: List[Any] = [project_id]
        if category:
            # Filter by source memory category
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
                    contradictions.append({
                        "entity": entity,
                        "attribute": attr,
                        "values": [{"value": f["value"], "chapter": f.get("chapter_from"), "source_id": f.get("source_memory_id")} for f in fact_list],
                    })

        result = {
            "status": "ok",
            "total_facts": len(rows),
            "contradiction_count": len(contradictions),
            "contradictions": contradictions,
        }
        print(json.dumps(result, ensure_ascii=False))
        return result
    finally:
        conn.close()


# ─── Dump: Export all memories and facts ───

def dump_project(project_id: int) -> Dict:
    """Dump all memories and facts for a project."""
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

        result = {
            "status": "ok",
            "project_id": project_id,
            "memory_count": len(memories),
            "fact_count": len(facts_rows),
            "continuity_issue_count": len(continuity_rows),
            "memories": memories,
            "facts": [dict(r) for r in facts_rows],
            "continuity_log": [dict(r) for r in continuity_rows],
        }
        print(json.dumps(result, ensure_ascii=False))
        return result
    finally:
        conn.close()


# ─── CLI ───

def main():
    global PALACE_DIR
    parser = argparse.ArgumentParser(description="Novel Memory Palace")
    parser.add_argument("--palace-dir", default=PALACE_DIR, help="Memory palace data directory")
    sub = parser.add_subparsers(dest="command")

    # init
    p_init = sub.add_parser("init")
    p_init.add_argument("--palace-dir")

    # store
    p_store = sub.add_parser("store")
    p_store.add_argument("--project", type=int, required=True)
    p_store.add_argument("--content", default=None, help="Content string (use --content-file for long text)")
    p_store.add_argument("--content-file", default=None, help="Path to file containing content")
    p_store.add_argument("--category", default="general")
    p_store.add_argument("--tags", default="")
    p_store.add_argument("--chapter", type=int, default=None)

    # recall
    p_recall = sub.add_parser("recall")
    p_recall.add_argument("--project", type=int, required=True)
    p_recall.add_argument("--query", required=True)
    p_recall.add_argument("--top-k", type=int, default=5)
    p_recall.add_argument("--category", default=None)

    # list
    p_list = sub.add_parser("list")
    p_list.add_argument("--project", type=int, required=True)
    p_list.add_argument("--category", default=None)

    # delete
    p_delete = sub.add_parser("delete")
    p_delete.add_argument("--project", type=int, required=True)
    p_delete.add_argument("--memory-id", required=True)

    # store-facts
    p_sf = sub.add_parser("store-facts")
    p_sf.add_argument("--project", type=int, required=True)
    p_sf.add_argument("--content", default=None, help="Content string (use --content-file for long text)")
    p_sf.add_argument("--content-file", default=None, help="Path to file containing content")
    p_sf.add_argument("--source-id", default=None)
    p_sf.add_argument("--chapter", type=int, default=None)

    # query-facts
    p_qf = sub.add_parser("query-facts")
    p_qf.add_argument("--project", type=int, required=True)
    p_qf.add_argument("--entity", default=None)
    p_qf.add_argument("--attribute", default=None)

    # list-facts
    p_lf = sub.add_parser("list-facts")
    p_lf.add_argument("--project", type=int, required=True)

    # verify
    p_verify = sub.add_parser("verify")
    p_verify.add_argument("--project", type=int, required=True)
    p_verify.add_argument("--content", default=None, help="Content string (use --content-file for long text)")
    p_verify.add_argument("--content-file", default=None, help="Path to file containing content")
    p_verify.add_argument("--category", default="general")

    # reconcile
    p_recon = sub.add_parser("reconcile")
    p_recon.add_argument("--project", type=int, required=True)
    p_recon.add_argument("--category", default=None)

    # log-continuity
    p_lc = sub.add_parser("log-continuity")
    p_lc.add_argument("--project", type=int, required=True)
    p_lc.add_argument("--chapter", type=int, default=None)
    p_lc.add_argument("--issue-type", required=True)
    p_lc.add_argument("--description", required=True)
    p_lc.add_argument("--severity", default="medium")
    p_lc.add_argument("--resolution", default=None)

    # list-continuity
    p_lco = sub.add_parser("list-continuity")
    p_lco.add_argument("--project", type=int, required=True)
    p_lco.add_argument("--status", default=None)

    # dump
    p_dump = sub.add_parser("dump")
    p_dump.add_argument("--project", type=int, required=True)

    args = parser.parse_args()

    if args.palace_dir:
        PALACE_DIR = args.palace_dir

    os.makedirs(PALACE_DIR, exist_ok=True)

    if args.command == "init":
        conn = get_conn()
        try:
            init_db(conn)
            print(json.dumps({"status": "ok", "palace_dir": PALACE_DIR}))
        finally:
            conn.close()

    elif args.command == "store":
        tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []
        store_memory(args.project, args.content, args.category, tags)

    elif args.command == "recall":
        recall_memories(args.project, args.query, args.top_k, args.category)

    elif args.command == "list":
        list_memories(args.project, args.category)

    elif args.command == "delete":
        delete_memory(args.project, args.memory_id)

    elif args.command == "store-facts":
        store_facts(args.project, args.content, args.source_id, args.chapter)

    elif args.command == "query-facts":
        query_facts(args.project, args.entity, args.attribute)

    elif args.command == "list-facts":
        list_all_facts(args.project)

    elif args.command == "verify":
        verify_content(args.project, args.content, args.category)

    elif args.command == "reconcile":
        reconcile(args.project, args.category)

    elif args.command == "log-continuity":
        log_continuity_issue(args.project, args.chapter, args.issue_type, args.description, args.severity, args.resolution)

    elif args.command == "list-continuity":
        list_continuity_issues(args.project, args.status)

    elif args.command == "dump":
        dump_project(args.project)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
