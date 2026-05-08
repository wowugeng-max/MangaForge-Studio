#!/usr/bin/env bash
set -euo pipefail

# ── Ensure bun is on PATH (auto-load if installed but not found) ──
if ! command -v bun >/dev/null 2>&1; then
  bun_bin="$HOME/.bun/bin/bun"
  if [ -f "$bun_bin" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  fi
fi

# ── Ensure pyenv is on PATH (for Python 3.13 mempalace) ──
export PYENV_ROOT="$HOME/.pyenv"
if [ -d "$PYENV_ROOT/bin" ]; then
  export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init - bash 2>/dev/null)" 2>/dev/null || true
fi

repo_root="$(cd "$(dirname "$0")" && pwd)"
server_dir="$repo_root/ui/server"
web_dir="$repo_root/ui/web"
restored_dir="$repo_root/restored-src"
server_log="$repo_root/.mangaforge-server.log"
web_log="$repo_root/.mangaforge-web.log"
if [ -f "$repo_root/ui/server/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$repo_root/ui/server/.env"
  set +a
fi

llm_endpoint="${LLM_CLAUDE_ENDPOINT:-http://localhost:3001/llm}"
llm_local_endpoint="${LLM_LOCAL_ENDPOINT:-https://api.aicomic.site/v1}"
llm_local_api_key="${LLM_LOCAL_API_KEY:-REPLACE_ME}"
llm_local_model="${LLM_LOCAL_MODEL:-gpt-5.4}"

printf 'Starting MangaForge Studio (Server + Web)...\n'
printf 'Using LLM_CLAUDE_ENDPOINT=%s\n' "$llm_endpoint"
printf 'Using LLM_LOCAL_ENDPOINT=%s\n' "$llm_local_endpoint"
printf 'Using LLM_LOCAL_MODEL=%s\n' "$llm_local_model"

if ! command -v bun >/dev/null 2>&1; then
  printf 'Error: bun is not installed or not on PATH.\n' >&2
  exit 1
fi

if pgrep -f "bun run dev" >/dev/null 2>&1 || pgrep -f "vite" >/dev/null 2>&1; then
  printf 'Warning: UI processes already appear to be running. Use ./stop-ui-mac.sh first if needed.\n' >&2
fi

printf -v server_cmd 'cd %q && bun install && cd %q && bun install && LLM_CLAUDE_ENDPOINT=%q LLM_GEMINI_ENDPOINT=%q LLM_QWEN_ENDPOINT=%q LLM_LOCAL_ENDPOINT=%q LLM_LOCAL_API_KEY=%q LLM_LOCAL_MODEL=%q bun run dev' "$restored_dir" "$server_dir" "$llm_endpoint" "$llm_endpoint" "$llm_endpoint" "$llm_local_endpoint" "$llm_local_api_key" "$llm_local_model"
printf -v web_cmd 'cd %q && bun install && bun run dev' "$web_dir"

if command -v osascript >/dev/null 2>&1; then
  osascript <<EOF
 tell application "Terminal"
   do script "$server_cmd"
 end tell
EOF

  osascript <<EOF
 tell application "Terminal"
   do script "$web_cmd"
 end tell
EOF

  printf 'Launched two Terminal windows.\n'
else
  printf 'Warning: osascript not available, starting background shell processes instead.\n' >&2
  : > "$server_log"
  : > "$web_log"
  (cd "$restored_dir" && bun install && cd "$server_dir" && bun install && LLM_CLAUDE_ENDPOINT="$llm_endpoint" LLM_GEMINI_ENDPOINT="$llm_endpoint" LLM_QWEN_ENDPOINT="$llm_endpoint" LLM_LOCAL_ENDPOINT="$llm_local_endpoint" LLM_LOCAL_API_KEY="$llm_local_api_key" LLM_LOCAL_MODEL="$llm_local_model" bun run dev) >>"$server_log" 2>&1 &
  (cd "$web_dir" && bun install && bun run dev) >>"$web_log" 2>&1 &
  printf 'Launched two background processes. Logs:\n'
  printf ' - Server log: %s\n' "$server_log"
  printf ' - Web log:    %s\n' "$web_log"
fi

printf ' - Server: %s\n' "$server_dir"
printf ' - Web:    %s\n' "$web_dir"
printf 'Open the Vite URL shown in the web terminal.\n'
