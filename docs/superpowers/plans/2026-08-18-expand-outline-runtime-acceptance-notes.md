# 内核 C 真机验收笔记（expand_outline）

- Date: 2026-08-18
- Branch: `main` @ `7cdf4099`（C 已本地合入；ahead origin；未 push）
- Workspace: `/Users/ruiyaosong/MangaForge-Studio/workspace`
- Overall: **验收 1–6 PASS**。工作台无扩纲按钮。未打 8787。模型 **304**，未用 302。

## 目标项目

- Project **7** `开书验收-可删-收口`（open_book `job-f9b9d846` 已 committed）
- 扩纲前 5 份大纲，均有 `kernel_rel_path`（无 `kernel_full_text`，回放走 summary）
- 抽查行：id **156** 细纲第2章、id **159** 细纲第1章

## 投影（跑中快照，cleanup 前）

job `job-2f7d64e9-ab69-469b-9e06-d7cb979b04d6` / cand `cand-7b888e74-062f-4cbf-9e64-50d36e28b4e4`

`project/大纲/`：

- `大纲.md`、`卷纲_第一卷.md`
- `细纲_第001章.md`、`细纲_第002章.md`、`细纲_第003章.md`
- **没有** 合成的 `总纲.md` / `细纲.md`
- **没有** `正文/`

设定按开书原路径回放（`设定/世界观/*`、`设定/势力/*`、`设定/角色/*`）。追踪有 `追踪/伏笔.md`。

skill 计划第一步是「读取扩纲规范并盘点现有大纲」，不是重开书。

## Job

| 字段 | 值 |
| --- | --- |
| verb | `expand_outline` |
| model_id | 304 |
| 创建 | `2026-08-18T14:51:28Z` |
| 候选终态 | **succeeded** → 手动 commit 后 **committed** |
| job 终态 | **awaiting_selection** 再 **committed** |
| `error_code` | 空 |
| 耗时 | 约 10.5 min（`elapsed_ms` 633211） |

收获（相对快照有改动）：`大纲/大纲.md`、`大纲/卷纲_第一卷.md`、`大纲/细纲_第004–008章.md`，以及两份设定。**未收获** 第001–003章细纲（未改）。

## 采纳后账本

- 新细纲入库 id **160–164**（第4–8章），`kernel_full_text=true`
- 抽查 156 / 159：`summary_sha` **未变**（未被整份重写）。158 同样未变。
- 157《边城命簿》大纲 summary 变了（收获了 `大纲/大纲.md`，预期）
- 155 卷纲 summary 前 4000 字 sha 仍同，但已写入 `kernel_full_text`
- `chapters` 仍是 **3 行**（1/2/3），没有为第4–8章插空章行
- `kernel_commits` 只有 `outlines` + `worldbuilding`，无 `chapters`

未改产品代码。笔记未随 C 代码提交。
