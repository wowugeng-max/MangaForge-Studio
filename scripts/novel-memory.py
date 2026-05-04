#!/usr/bin/env python3
"""
Novel Memory Helper — MemPalace MCP Client for MangaForge Studio.

Architecture:
  ┌──────────────────┐     execFile      ┌──────────────────┐
  │ memory-service.ts│ ────────────────► │ novel-memory.py  │
  │    (TypeScript)  │                   │  (MCP Client)    │
  └──────────────────┘                   └──────┬───────────┘
                                                │ JSON-RPC
                                                ▼ stdio
                                         ┌──────────────────┐
                                         │ mempalace-mcp    │
                                         │ (MCP Server)     │
                                         └──────────────────┘

Each novel project gets its own "wing" (project_<id>) in the memory palace.
Categories map to "rooms": worldbuilding, character, plot, foreshadowing, prose.

Usage (via subprocess from TypeScript):
  python3 scripts/novel-memory.py store --project <id> --content "<text>" [--category <cat>]
  python3 scripts/novel-memory.py recall --project <id> --query "<text>" [--top-k <n>] [--category <cat>]
  python3 scripts/novel-memory.py list --project <id> [--category <cat>]
  python3 scripts/novel-memory.py init --palace-dir <dir>
"""
import argparse
import json
import os
import select
import sqlite3
import subprocess
import sys
import uuid
from datetime import datetime

PALACE_DIR = os.environ.get("MEMPALACE_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mempalace-data"))


def main():
    parser = argparse.ArgumentParser(description="Novel Memory Helper")
    sub = parser.add_subparsers(dest="command", required=True)

    # init
    init_p = sub.add_parser("init")
    init_p.add_argument("--palace-dir", default=PALACE_DIR)

    # store
    store_p = sub.add_parser("store")
    store_p.add_argument("--project", required=True, help="Project ID")
    store_p.add_argument("--content", required=True, help="Memory content text")
    store_p.add_argument("--tags", default="general", help="Comma-separated tags (informational)")
    store_p.add_argument("--category", default="general",
                         help="Room: worldbuilding|character|plot|foreshadowing|prose|general")

    # recall
    recall_p = sub.add_parser("recall")
    recall_p.add_argument("--project", required=True, help="Project ID")
    recall_p.add_argument("--query", required=True, help="Search query")
    recall_p.add_argument("--top-k", type=int, default=5, help="Top K results")
    recall_p.add_argument("--category", default=None, help="Filter by room")

    # list
    list_p = sub.add_parser("list")
    list_p.add_argument("--project", required=True, help="Project ID")
    list_p.add_argument("--tag", default=None, help="Filter by tag (informational)")
    list_p.add_argument("--category", default=None, help="Filter by room")

    # delete
    delete_p = sub.add_parser("delete")
    delete_p.add_argument("--project", required=True, help="Project ID")
    delete_p.add_argument("--memory-id", required=True, help="Drawer ID to delete")

    args = parser.parse_args()

    # Try MCP-first; fall back to lightweight SQLite on any failure
    try:
        use_mempalace_mcp(args)
    except Exception as exc:
        # mempalace not installed, server won't start, or communication fails
        # → degrade gracefully to local storage
        fallback_msg = str(exc).lower()
        if any(kw in fallback_msg for kw in ("no such file", "not found", "no mempalace", "spawn", "timeout", "mcp")):
            try:
                use_fallback(args)
                return
            except Exception:
                pass
        # If fallback also fails or the original error was unexpected, surface it
        print(json.dumps({"status": "error", "error": str(exc), "mode": "none"}))
        sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════
#  MCP Client — talks to mempalace-mcp via JSON-RPC over stdio
# ═══════════════════════════════════════════════════════════════════════

class MCPPalace:
    """Minimal MCP client that speaks JSON-RPC to mempalace-mcp."""

    _rpc_id = 0

    def __init__(self, palace_dir: str):
        self.palace_dir = palace_dir
        self.proc: subprocess.Popen | None = None
        self._rpc_id = 0

    # ── lifecycle ────────────────────────────────────────────────────

    def _start(self):
        """Launch mempalace-mcp subprocess."""
        self.proc = subprocess.Popen(
            [sys.executable or "python3", "-m", "mempalace", "mcp", "--palace", self.palace_dir],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        # Initialize the session
        self._request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "mangaforge-studio", "version": "1.0.0"},
        })
        self._notify("notifications/initialized", {})
        # Consume any init responses (serverCapabilities, etc.)
        self._drain(2)

    def _stop(self):
        if self.proc:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=3)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
            self.proc = None

    def __enter__(self):
        self._start()
        return self

    def __exit__(self, *exc):
        self._stop()

    # ── JSON-RPC primitives ─────────────────────────────────────────

    def _next_id(self) -> int:
        self._rpc_id += 1
        return self._rpc_id

    def _send(self, message: dict):
        if not self.proc or self.proc.stdin is None:
            raise RuntimeError("MCP server not started")
        line = json.dumps(message) + "\n"
        self.proc.stdin.write(line)
        self.proc.stdin.flush()

    def _read_line(self, timeout: float = 8.0) -> str | None:
        if not self.proc or self.proc.stdout is None:
            return None
        ready, _, _ = select.select([self.proc.stdout], [], [], timeout)
        if not ready:
            return None
        line = self.proc.stdout.readline()
        if not line:
            return None
        return line.strip()

    def _drain(self, max_lines: int = 5):
        """Consume lines from stdout (for init phase / notifications)."""
        for _ in range(max_lines):
            line = self._read_line(timeout=0.5)
            if not line:
                break

    def _request(self, method: str, params: dict) -> dict:
        rid = self._next_id()
        self._send({
            "jsonrpc": "2.0",
            "id": rid,
            "method": method,
            "params": params,
        })
        # Wait for matching response
        for _ in range(20):
            line = self._read_line(timeout=5.0)
            if not line:
                break
            try:
                resp = json.loads(line)
            except json.JSONDecodeError:
                continue
            if resp.get("id") == rid:
                if "error" in resp:
                    raise RuntimeError(f"MCP error: {resp['error']}")
                return resp.get("result", {})
        raise TimeoutError("MCP request timed out")

    def _notify(self, method: str, params: dict):
        self._send({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        })

    # ── tool call wrapper ───────────────────────────────────────────

    def call_tool(self, name: str, arguments: dict = None) -> dict:
        result = self._request("tools/call", {
            "name": name,
            "arguments": arguments or {},
        })
        return result

    # ── high-level operations ───────────────────────────────────────

    @staticmethod
    def _wing(project_id: int) -> str:
        return f"project_{project_id}"

    def init(self) -> dict:
        """Check or initialize the palace."""
        try:
            status = self.call_tool("mempalace_status")
            return {"status": "initialized", "palace_dir": self.palace_dir, "mode": "mcp", "total_drawers": status.get("total_drawers", 0)}
        except Exception:
            # Palace doesn't exist yet; add_drawer will create it
            return {"status": "initialized", "palace_dir": self.palace_dir, "mode": "mcp", "note": "will-create-on-first-write"}

    def store(self, project_id: int, content: str, category: str = "general", tags: list = None) -> dict:
        """Store content via mempalace_add_drawer."""
        wing = self._wing(project_id)
        result = self.call_tool("mempalace_add_drawer", {
            "wing": wing,
            "room": category,
            "content": content,
            "added_by": "mangaforge-studio",
        })
        return {
            "status": "stored",
            "memory_id": result.get("drawer_id", str(uuid.uuid4())),
            "mode": "mcp",
            "wing": wing,
            "room": category,
        }

    def recall(self, project_id: int, query: str, top_k: int = 5, category: str = None) -> dict:
        """Recall via mempalace_search."""
        wing = self._wing(project_id)
        args = {
            "query": query,
            "limit": min(top_k, 100),
            "wing": wing,
        }
        if category:
            args["room"] = category
        result = self.call_tool("mempalace_search", args)
        raw_results = result.get("results", [])
        # Normalize to our MemoryRecord shape
        records = []
        for r in raw_results:
            records.append({
                "id": r.get("source_file", ""),
                "project_id": project_id,
                "content": r.get("text", ""),
                "tags": [],
                "category": r.get("room", category or "general"),
                "timestamp": r.get("created_at", ""),
                "similarity": r.get("similarity"),
                "distance": r.get("distance"),
            })
        return {
            "status": "ok",
            "count": len(records),
            "results": records,
            "mode": "mcp",
        }

    def list_memories(self, project_id: int, category: str = None) -> dict:
        """List via mempalace_list_drawers."""
        wing = self._wing(project_id)
        args = {"wing": wing, "limit": 100}
        if category:
            args["room"] = category
        result = self.call_tool("mempalace_list_drawers", args)
        raw = result.get("drawers", [])
        records = []
        for d in raw:
            records.append({
                "id": d.get("drawer_id", ""),
                "project_id": project_id,
                "content": d.get("content_preview", ""),
                "tags": [],
                "category": d.get("room", "general"),
                "timestamp": "",
            })
        return {
            "status": "ok",
            "count": len(records),
            "memories": records,
            "mode": "mcp",
        }

    def delete(self, project_id: int, memory_id: str) -> dict:
        """Delete via mempalace_delete_drawer."""
        result = self.call_tool("mempalace_delete_drawer", {
            "drawer_id": memory_id,
        })
        return {"status": "deleted" if result.get("success") else "error", "memory_id": memory_id, "mode": "mcp"}


def use_mempalace_mcp(args: argparse.Namespace):
    """Route through mempalace-mcp (MCP protocol over stdio)."""
    palace_dir = PALACE_DIR

    if args.command == "init":
        palace_dir = args.palace_dir or PALACE_DIR
        # Try to connect; if mempalace isn't installed, raise so fallback kicks in
        with MCPPalace(palace_dir) as palace:
            result = palace.init()
        print(json.dumps(result))
        return

    with MCPPalace(palace_dir) as palace:
        project_id = int(args.project)

        if args.command == "store":
            tags = args.tags.split(",") if args.tags else []
            result = palace.store(project_id, args.content, args.category or "general", tags)
            print(json.dumps(result))

        elif args.command == "recall":
            result = palace.recall(project_id, args.query, args.top_k, args.category)
            print(json.dumps(result))

        elif args.command == "list":
            result = palace.list_memories(project_id, args.category)
            print(json.dumps(result))

        elif args.command == "delete":
            result = palace.delete(project_id, args.memory_id)
            print(json.dumps(result))


# ═══════════════════════════════════════════════════════════════════════
#  Fallback: Lightweight local storage (SQLite + keyword matching)
#  Used when mempalace is not installed or MCP communication fails.
# ═══════════════════════════════════════════════════════════════════════

def _get_db(palace_dir: str) -> sqlite3.Connection:
    os.makedirs(palace_dir, exist_ok=True)
    db_path = os.path.join(palace_dir, "memory.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT 'general',
            timestamp TEXT NOT NULL,
            embedding TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_project ON memories(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON memories(category)")
    return conn


def use_fallback(args: argparse.Namespace):
    """Fallback storage when mempalace is not installed."""
    palace_dir = PALACE_DIR

    if args.command == "init":
        palace_dir = args.palace_dir or PALACE_DIR
        conn = _get_db(palace_dir)
        conn.commit()
        conn.close()
        print(json.dumps({
            "status": "initialized",
            "palace_dir": palace_dir,
            "mode": "fallback_sqlite",
        }))
        return

    conn = _get_db(palace_dir)
    project_id = str(args.project)

    if args.command == "store":
        tags = args.tags.split(",") if args.tags else [args.category or "general"]
        memory_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO memories (id, project_id, content, tags, category, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (memory_id, project_id, args.content, json.dumps(tags), args.category or "general", datetime.utcnow().isoformat()),
        )
        conn.commit()
        conn.close()
        print(json.dumps({"status": "stored", "memory_id": memory_id, "mode": "fallback_sqlite"}))

    elif args.command == "recall":
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?",
            (project_id, args.top_k * 3),
        ).fetchall()
        query_words = set(args.query.lower().split())
        scored = []
        for row in rows:
            content = row["content"].lower()
            tag_words = set()
            try:
                tag_words = set(json.loads(row["tags"]))
            except (json.JSONDecodeError, TypeError):
                pass
            score = len(query_words & set(content.split())) + len(query_words & tag_words) * 2
            if score > 0:
                scored.append((score, dict(row)))
        scored.sort(key=lambda x: -x[0])
        results = [r for _, r in scored[:args.top_k]]
        if args.category:
            results = [r for r in results if r["category"] == args.category]
        conn.close()
        print(json.dumps({
            "status": "ok",
            "count": len(results),
            "results": results,
            "mode": "fallback_sqlite",
        }))

    elif args.command == "list":
        query = "SELECT * FROM memories WHERE project_id = ?"
        params: list = [project_id]
        if args.category:
            query += " AND category = ?"
            params.append(args.category)
        query += " ORDER BY timestamp DESC"
        rows = conn.execute(query, params).fetchall()
        conn.close()
        print(json.dumps({
            "status": "ok",
            "count": len(rows),
            "memories": [dict(r) for r in rows],
            "mode": "fallback_sqlite",
        }))

    elif args.command == "delete":
        conn.execute("DELETE FROM memories WHERE id = ?", (args.memory_id,))
        conn.commit()
        conn.close()
        print(json.dumps({"status": "deleted", "memory_id": args.memory_id, "mode": "fallback_sqlite"}))


if __name__ == "__main__":
    main()
