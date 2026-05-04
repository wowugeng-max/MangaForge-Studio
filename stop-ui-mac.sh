#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
server_log="$repo_root/.mangaforge-server.log"
web_log="$repo_root/.mangaforge-web.log"

printf 'Stopping MangaForge Studio processes...\n'

pids="$(ps -axo pid=,command= | awk '
  /bun run dev/ || /vite/ || /ui\/server/ || /ui\/web/ {
    print $1
  }
')"

if [ -z "$pids" ]; then
  printf 'No matching UI processes found.\n'
else
  killed=0
  for pid in $pids; do
    if kill "$pid" >/dev/null 2>&1; then
      printf 'Stopped PID %s\n' "$pid"
      killed=$((killed + 1))
    fi
  done
  printf 'Done. Stopped %s process(es).\n' "$killed"
fi

rm -f "$server_log" "$web_log"
