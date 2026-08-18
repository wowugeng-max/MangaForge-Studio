# 内核 D 真机验收笔记（探针 ④ + full 审稿）

- Date: 2026-08-18
- Branch: `main` @ `69f0b453`（D 三项已本地合入；ahead origin 15；未 push）
- Workspace: `/Users/ruiyaosong/MangaForge-Studio/workspace`
- Overall: **①–④ PASS**（含新 `$HOME` 隔离）；**full 审稿 PASS**（未误 `NO_SPAWN`）。事后：同日 C 扩纲已合入 `7cdf4099`；本笔记只记录 D 验收当时。

本笔记只记录实际跑到的证据。未发明 job id。未点工作台按钮。未打 `8787`（该进程 11:08 启动，早于 D 合入，无 `isolatedHome` / `NO_SPAWN`）。

## 环境

- Codex：`codex-cli 0.147.0`（探针 binary ok）
- 模型：**304** `kernel-codex-gpt-5.6-luna` / `cliproxyapi_codex` / `reasoning_effort: xhigh`。**未使用 302。**
- 四 reviewer 已部署：`workspace/.mangaforge/oh-story-core/agents/codex/{story-architect,character-designer,narrative-writer,consistency-checker}.toml`
- 验收方式：主仓 `ui/server` 内 `bun -e` 调当前源码（`isolatedHome: jobDir`）
- 本机 UI server `bun` PID 监听 `[::1]:8787`，cwd `ui/server`，**未用于本次验收**
- 用户 `~/.codex/auth.json` 仅空 `OPENAI_API_KEY`（26 bytes），HOME 隔离并未切掉可用 ChatGPT 登录态

## Probe ①–④

命令：`cd ui/server && bun -e` → `runKernelProbe(workspace, { modelId: 304 })`。

写入：`workspace/.mangaforge/kernel/probe.json`

| 次 | `checked_at` | ①–③ | ④ agents_spawn | 耗时 |
| --- | --- | --- | --- | --- |
| 1（上游挂） | `2026-08-18T08:14:59Z` | PASS | FAIL `turn=failed` | 109316 ms |
| 2（上游挂） | `2026-08-18T08:19:09Z` | PASS | FAIL 同文案 | 56043 ms |
| 3（账号已修） | `2026-08-18T08:33:19Z` | PASS | **PASS** | 26333 ms |

`cliproxyapi_codex` / `tokenrhythm_codex` toml translate **ok**；普通 `cliproxyapi` 等仍 `PROVIDER_TRANSLATE_FAILED`（与 8/17 开书探针一致）。

### ④ 失败根因（第 1–2 次，不是 spawn 形状、不是 HOME 隔离）

对照 8/17 绿探针 `kernel-probe4-y0RyCR`：有 `collabAgentToolCall` / `spawnAgent`，子 thread 回复 `OK`。

第 1 次 `.../T/kernel-probe4-jvWtXj`：401 token invalidated → 503 `auth_unavailable`（`providers=codex`, `gpt-5.6-luna`），零 spawn。

第 2 次 `.../T/kernel-probe4-Z6JtXF`：五次 reconnect 全 503，零 spawn。

当时未开 full 审稿、未摘 `require_spawn_evidence`、未改代码。

## full 审稿（验收 7）

④ 第三次绿之后，用当前 `ui/server` 源码 `createAndRunKernelJob`（**不是** 8787）：

- project **3**，chapter **62** `违背规则的绝对防御`（`chapter_text` 4723 字）
- `verb: review_chapter`，默认合同 `oh-story-core.story-review.full`（`loadKernelContracts` 会 seed builtin，gates 含 `require_spawn_evidence`）
- `model_id: 304`

| 字段 | 值 |
| --- | --- |
| job | `job-1ce1db8e-0b13-4910-b238-ffbba50a2bd8` |
| candidate | `cand-05449769-4e51-40a4-8f3a-a86e812f6b46` |
| 创建 | `2026-08-18 08:35:36` UTC |
| 结束 | `2026-08-18T08:58:00.402Z`（约 22.4 min） |
| job status | **committed** |
| candidate status | **committed** |
| `error_code` | 空（**不是** `NO_SPAWN` / `gated`） |
| commit | `commit-d8978080-9c0b-4fb5-bd3f-f91002fa5eab` → `reviews` row **13587** |

`gate_results`：

```json
[
  {"gate":"reject_solo_fallback","ok":true},
  {"gate":"require_spawn_evidence","ok":true},
  {"gate":"require_reviewer_agents","ok":true,"message":"checked before start"},
  {"gate":"require_chapter_file","ok":true},
  {"gate":"reject_chapter_text_artifact","ok":true}
]
```

`metadata.spawn_evidence.subagent_threads` **4 条**（均 `parent_thread_id=01a01403-06db-7a72-bd42-a028783ceeaf`）：

- `01a01408-2c4c-7fd1-9938-17cb48d13f78`
- `01a01408-2d1e-78e0-9e30-6f768cebf1d6`
- `01a01408-2dd1-7763-9071-0265ea14d530`
- `01a01408-2f4d-74a1-8650-0d076af27218`

`agent` / `agent_hints` 为空（门只看 `subagent_threads.length >= 1`，不影响）。事件里 08:41:15Z 连续 4 次 `collabAgentToolCall`/`spawnAgent` completed。过程中有一次 stream reconnect 1/5（`stream closed before response.completed`），随后恢复，未导致失败。

reviews **13587**：`project_id=3`，`review_type=oh_story_review`，`status=ok`，payload `chapter_id=62`，`kernel_job_id` 与上表一致。

未摘门。未改产品代码。

## C

未开始 `expand_outline`。D 真机验收 7 已满足，可以开 C。
