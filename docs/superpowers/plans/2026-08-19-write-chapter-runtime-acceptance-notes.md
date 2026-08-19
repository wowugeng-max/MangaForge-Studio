# 写本章真机验收笔记（write_chapter）

- Date: 2026-08-19
- Branch: `feat/write-chapter-runtime` @ `001574e0`（`docs(kernel): record write_chapter runtime as landed`）
- Workspace: `/Users/ruiyaosong/MangaForge-Studio/workspace`
- Server: `http://127.0.0.1:8788`（bun PID **45720**，IPv4 listen）。**未打** `8787` / `[::1]:8787`。模型 **304**，未用 302。
- Overall: **验收 1–5 PASS**。入口为 `POST /api/kernel/jobs`（工作台未点按钮）。cliproxy 未报 auth 失败。笔记未 commit。

## 目标项目

- Project **7** `开书验收-可删-收口`
- Chapter **id=204**，`chapter_no=1`，title `死账上的活人`，`outline_id=159`
- Outline **id=159**：`outline_type=chapter`，title `第 1 章：死账上的活人`，`raw_payload.chapter_no=1`，`kernel_rel_path` `大纲/细纲_第001章.md`

## Step 1 — 写前账本（PASS）

sqlite `workspace/novel.sqlite` @ 写前：

| 字段 | 值 |
| --- | --- |
| `chapters.id` | 204 |
| `length(chapter_text)` | **0** |
| `trim` 非空 | 0 |
| 含 `【占位正文】` | 0 |
| `has_prose` | **false** |

未发现已有正文，未 STOP。

## Step 2 — 创建并跑完 job（PASS）

```
POST http://127.0.0.1:8788/api/kernel/jobs
{"project_id":7,"subject_type":"chapter","subject_id":204,"verb":"write_chapter","model_id":304}
```

- HTTP **202** `Date: Wed, 19 Aug 2026 06:12:27 GMT`
- body: `{"ok":true,"job":{"id":"job-19099c66-188f-4a7a-9ecf-00297cf341f6","status":"queued"}}`

随后 `GET /api/kernel/jobs/job-19099c66-188f-4a7a-9ecf-00297cf341f6`：

| 字段 | 值 |
| --- | --- |
| verb | `write_chapter`（请求所发；job 行一致） |
| model_id | **304** |
| model_provider_id | `cliproxyapi_codex` |
| subject | `chapter` / **204** |
| capability | `rewrite` |
| candidate | `cand-0356e6a1-c49c-4b7d-b868-cca79ec7d99f` |
| contract | `oh-story-core.story-long-write.chapter` |
| skill | `story-long-write` |
| 创建 | `2026-08-19 06:12:28` |
| 候选/job 终态 | **committed**（`auto_if_single`，无手动 commit） |
| `finished_at` | `2026-08-19T06:31:38.731Z` |
| `error_code` | 空 |
| `error_message` | 空 |
| 耗时 | 约 19.2 min（`progress.elapsed_ms` **1154065**） |
| gates | `require_chapter_file` ok；`reject_outline_artifact` ok |

跑中约 5s 一轮轮询：`06:25:22Z` 起均为 `running` / candidate `running`，至 `06:31:41Z` 见 `committed`。未超时（上限 45 min）。

收获 artifact：`art-9602e49e-a5f1-4086-8d7e-9a0b83e63794`，`rel_path` `正文/第001章_死账上的活人.md`，`sha256` `506138cde16a928d31e0cf5f424aa658ef7e03105affe944c4f2078257278eb3`，`byte_size` 9892。

skill excerpt：正文实测 3345 字；未改大纲；追踪未提交（缺 `_tracking-state.json` / `tracking_commit.py`）。**未**当作写章失败。

## Step 3 — 入库（PASS）

`kernel_commits`：`commit-1debea1f-e693-4729-ae73-644722e5113f`，`domain_table=chapters`，`domain_row_id=204`，`created_at=2026-08-19 06:31:38`。

写后 `chapters` id=204：

| 字段 | 值 |
| --- | --- |
| `length(chapter_text)` | **3362**（trim 3361） |
| 含 `【占位正文】` | 0 |
| `has_prose` | **true** |
| utf-8 sha256 | `506138cde16a928d31e0cf5f424aa658ef7e03105affe944c4f2078257278eb3`（与 artifact 一致） |

`chapter_versions`：**id=247**，`version_no=1`，`source=oh_story_write`，`created_at=2026-08-19T06:31:38.671Z`。该行 `length(chapter_text)=0`（正文在 `chapters.chapter_text`，不在 version 行）。

## Step 4 — 再 POST 拒绝覆盖（PASS）

同一 body 再 POST `http://127.0.0.1:8788/api/kernel/jobs`：

- HTTP **400** `Date: Wed, 19 Aug 2026 06:32:12 GMT`
- `{"error":"本章已有正文，请用回炉或按建议改稿","code":"CHAPTER_HAS_PROSE"}`

再读 id=204：`length=3362`，sha256 仍为 `506138cde16a928d31e0cf5f424aa658ef7e03105affe944c4f2078257278eb3`；`chapter_versions` 仍 **1** 行（id 247）。未被覆盖。

## Step 5 — 本文件

路径：`docs/superpowers/plans/2026-08-19-write-chapter-runtime-acceptance-notes.md`。未改产品代码。按计划 **未 commit** 笔记。
