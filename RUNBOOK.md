# Manga Pipeline Runbook (3-minute quick start)

## 1) Start UI with one command

From repository root:

```powershell
.\start-ui.bat
```

This opens two terminals:
- API server: `ui/server`
- Web UI: `ui/web`

Open the Vite URL shown in the web terminal.

---

## 2) Basic usage flow

1. In UI, optionally switch workspace.
2. Click `Run All`.
3. Wait for completion.
4. In `Episode Board`, check `Release` column = `READY`.
5. Click `ZIP` to download episode bundle.

---

## 3) CLI release check (optional)

From `restored-src` directory:

```powershell
bun run manga:release-check --episodeId=ep-002
```

This runs export + verification for:
- `.export.json`
- `.export.md`
- `.export.csv`
- `.export.zip`

---

## 4) Troubleshooting

- If `storyboard` fails with `episode json not found`:
  - run `plot` first.
- If file preview/download fails:
  - ensure file is under `.story-project`.
- If web cannot reach API:
  - check server terminal is running on `http://localhost:8787`.
