# oh-story 按建议改稿

日期：2026-08-14  
状态：已确认（用户批准 2026-08-14）  
前置：`2026-08-14-oh-story-core-skill-shell-design.md`（方案 B）

## 目标

审稿只出报告，去AI只去味。中间补回一步：**按当前正文对应的 oh-story 审稿建议改稿**。

整章重写已证实会把人工率打到 0。现改为只动「修改建议」里的可执行条目，见 `2026-08-14-oh-story-apply-surgical-design.md`。按报告逐条打补丁以后另开。

## 已确认决策

1. 质检栏三个并列动作：`oh-story 审稿`、`按建议改稿`、`oh-story 去AI`。
2. 按建议改稿吃最新匹配的 `oh_story_review`，输出新正文；不重开旧质检「按报告修订」，不把理论 `must_fix` 塞回提示。
3. 没有对应当前正文的审稿，就不能改。对不上必须先重新审稿。
4. 匹配用正文哈希，不用时间戳。
5. 改完不自动连跑审稿或去AI。旧审稿随正文变化失效。
6. 去AI仍随时可点，不检查审稿。
7. 字数目标 4200 不改：只警告，不丢已写入的改稿。
8. 指纹 / 朱雀仍只参考，不回退、不拦入库。
9. 章头「一键修订」本轮不动。

## 工作流

1. 用户点审稿 → 只写 `oh_story_review`，正文不变。
2. 报告哈希与当前正文一致时，才能点按建议改稿。
3. 按建议改稿写出新版本；该审稿不再匹配新正文。
4. 若要再改，必须先对**当前稿**再审一次。
5. 去AI独立，只去味。

## 匹配规则

审稿落库时，在 payload 写入：

```ts
chapter_text_hash: sha256Hex(chapter.chapter_text)
```

`sha256Hex` 对数据库里的 `chapter_text` 原文字节做 SHA-256，输出小写 hex。不 trim、不规范化空白。正文有任何改动（含去AI、按建议改稿、手改、空保存写出不同字符串）都算不匹配。

按建议改稿只接受同时满足：

- `review_type === 'oh_story_review'`
- `payload.chapter_id` 等于当前章
- 按 `created_at`、`id` 取本章最新一条
- `payload.chapter_text_hash` 存在，且等于当前 `sha256Hex(chapter_text)`

否则拒绝，不改正文。下列情况一律拒绝：

- 本章没有 `oh_story_review`
- 最新审稿没有 `chapter_text_hash`（本功能上线前的旧报告）
- 哈希与当前正文不一致

服务端必须再检一次，不能只靠前端。

## 服务端

新增 `POST /api/novel/oh-story/core/apply`，请求体与审稿/去AI相同：`project_id`、`chapter_id`、`model_id`。

动作名：`apply`。这不是 oh-story 上游 skill，不读 `story-review` / `story-deslop` / `story-long-write` 的 SKILL.md，也不拼它们的 references。因此**不因套件未安装而拒绝**；没有匹配审稿才拒绝。

提示只拼三段：

1. 执行说明：只改审稿「修改建议」里的可执行条目；未点名的句子原样保留；禁止整章重写；Findings 只作证据，不另加系统理论课；solo；不要 spawn 子 agent。
2. 当前正文。
3. 该份审稿全文（`report_text`）。

禁止追加「补三层矛盾网」等系统合同。审稿报告里若自己写了这类建议，按报告执行，那是 oh-story 审稿意见，不是 MangaForge `must_fix`。

输出约定：完整修订正文放在 `### 修订后全文` 之后。抽取规则对齐去AI：

- 有该标题：只收标题后的正文
- 没有标题，但全文看起来像审查/去AI报告（文首像 `故事审查报告`、`AI味检测报告` 等）：拒绝，错误码 `OH_STORY_CORE_NOT_PROSE`
- 没有标题、也不像报告：整段当作正文
- 空输出：拒绝，错误码 `OH_STORY_CORE_EMPTY_OUTPUT`

拒绝时不得调用 `updateChapterText`。

成功时：

- `updateChapterText`，`source: 'oh_story_apply'`
- 写 `reviews.review_type = 'oh_story_apply'`，payload 含 `source_review_id`、`chapter_id`、`chapter_no`、`chapter_text_hash`（改前哈希）、`report_text`（模型原始输出）
- 返回 `{ changed: true, review_id, chapter_text }`

错误码：

| 码 | 何时 | 用户文案 |
|---|---|---|
| `OH_STORY_APPLY_NO_REVIEW` | 本章没有审稿 | 先对本稿重新审稿 |
| `OH_STORY_APPLY_STALE_REVIEW` | 无哈希或哈希不一致 | 先对本稿重新审稿 |
| `OH_STORY_APPLY_REWROTE_TOO_MUCH` | 原段落保留不足 70% | 这次改动太大，像整章重写。请再试一次 |
| `OH_STORY_CORE_EMPTY_OUTPUT` | 模型空输出 | 这次没有改出正文 |
| `OH_STORY_CORE_NOT_PROSE` | 只出了报告 | 这次没有改出正文 |

模型沿用工作台当前选中的 `model_id`，与审稿/去AI相同。

## 界面

质检栏按钮顺序：`oh-story 审稿`、`按建议改稿`、`oh-story 去AI`。

`按建议改稿` 始终可见。无匹配审稿时仍可点，只 toast「先对本稿重新审稿」，不发会改正文的成功路径。前端可先拦；服务端仍是最终门禁。

摘要条与改稿门禁用同一套哈希规则：

- 无审稿：`尚未审稿`
- 最新审稿哈希匹配：`已审稿`
- 有审稿但无哈希或不匹配：`正文已改`

展开区只显示最新 oh-story 审稿全文。不恢复 MangaForge 质检分、问题列表、一键修订、复检。

改稿进行中复用现有 loading（与审稿/去AI同一套 `proseQualityLoading` 即可），不新开修订任务条。

## 明确不做

- 按报告逐条补丁
- 改完自动再审或自动去AI
- 重开 `editor_revision` / 理论 `must_fix` / 指纹回退
- 用 `story-long-write` 当改稿引擎
- 改章头「一键修订」
- 改导演层主动作

## 验收

1. 无审稿或旧报告无哈希：点按建议改稿，正文不变，提示先审稿。
2. 审稿后未改正文：按建议改稿写出新版本，回执为 `oh_story_apply`。
3. 改稿或去AI之后：再点按建议改稿被拒绝，直到重新审稿。
4. 模型只出报告或空输出：正文保持改前版本。
5. 去AI在无审稿时仍可运行。
6. 质检栏看不到旧参考分，也看不到一键修订。

## 测试

- runner：无审稿 / 无哈希 / 哈希不一致 → 抛对应错误，不写章。
- runner：匹配审稿 + 带 `### 修订后全文` 的输出 → 只写入该段，并保存 `oh_story_apply`。
- runner：报告型输出 → `OH_STORY_CORE_NOT_PROSE`，不写章。
- 审稿落库断言带 `chapter_text_hash`。
- 路由：注册 `POST /api/novel/oh-story/core/apply`；门禁错误映射到上述文案。
- 面板：有「按建议改稿」；无匹配审稿时点击不出现成功改稿；不出现「一键修订」「质检问题」「参考，不自动改稿」。
