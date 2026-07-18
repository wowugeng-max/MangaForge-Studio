# 事件级正史锁（Established Event Canon）设计

## 背景与真实故障证据

项目《怪谈世界：我是超人，怪谈你随意》第 1 章已写清前两任天选者死亡方式：

- 林战：不该开门却开了 → 苍白带刺之手剥皮
- 楚弦：怪巴士、时钟慢 1 秒 → “非整点不能下车” → 被拧三下

第 2 章闪回改写为：

- 林战：回头 → 虚空钢丝剥皮
- 楚弦：多点油灯 → 拧成绳子

根因不是单次模型胡说，而是系统缺少**事件级正史账本**：

1. 上一章注入主要是章末 `ending_excerpt` ~800 字，章中关键事件容易丢失。
2. `story_state.canon_facts` / 长篇记忆胶囊有槽位和“不可矛盾改写”硬规则，但同步时不强制抽取事件事实，槽位经常为空。
3. 现有连续性检查偏专名/身份（`canonical-continuity`），抓不住闪回改写死法/规则机制。
4. 状态跟踪确定性检查能抓部分状态硬伤，但不是“已锁事件 vs 复述”对账。

oh-story 的目标链是：

> 写完 → 抽出“会写错就完蛋”的事实 → 下一章只召回这些硬事实 → 写后对账

MangaForge 已集成 `state-tracking`、`artifact-protocols`、`workflow-daily` 进度摘要、长篇记忆胶囊与故事状态同步；缺的是**事件级正史锁**这一层。

## 目标

1. 把“已经发生、后续不可改写”的事件沉淀为结构化正史。
2. 下一章写作时，只要涉及复述/闪回/引用，必须命中这些正史。
3. UI 清楚展示：锁了什么、为何会挡、怎么手动确认/同步。
4. 合并规则：**空不覆盖、弱不覆盖强；只有更完整且不矛盾才可更新。**
5. 先解决闪回改写类高损问题，再扩展到规则/能力代价/知识边界。

## 非目标

- 不整章回灌上一章正文。
- 不恢复低质量本地兜底编造。
- 不自动改用户已满意正文（只提示/校验冲突）。
- 不做成百科全书：只锁“会写错就完蛋”的事实。
- P0 不引入新的全局状态机页面；挂到现有故事状态/章节验收区。

## 核心概念

### EstablishedEvent（已成立事件）

一等公民事件卡。可兼容进入现有 `story_state.canon_facts`，结构从自由文本升级为事件卡。

```ts
type EstablishedEvent = {
  id: string
  chapter_no: number
  kind:
    | 'death'
    | 'injury'
    | 'rule_trigger'
    | 'ability_cost'
    | 'identity_reveal'
    | 'item_transfer'
    | 'promise'
    | 'secret_known'
    | 'other'
  subject: string
  predicate: string
  fact: string
  cause?: string
  mechanism?: string
  constraints?: string[]
  aliases?: string[]
  source_excerpt: string
  lock_level: 'soft' | 'hard'
  status: 'candidate' | 'confirmed' | 'superseded'
  mutable: false
  confidence: number
  last_seen_chapter?: number
  tags?: string[]
}
```

### 与现有字段关系

| 字段 | 角色 |
|---|---|
| `story_state.established_events` | 事件账本主存储 |
| `story_state.canon_facts` | 兼容层；可由 confirmed 事件投影/回填 |
| `longform_memory_capsule.canon_facts` | 写作前压缩召回 |
| `progress_summary.notes` / `daily_context_snapshot.writing_changes` | 下一章短提示，不替代事件账本 |
| `timeline` | 可引用 event id；时间线可压缩，hard 事件不可因压缩丢失 |

## 全链路

```text
第N章正文入库/质检通过
  → 事件抽取（故事状态同步主路径）
  → 与已有正史合并（防空/防弱/防矛盾覆盖）
  → candidate / 自动 confirmed
  → 记忆胶囊 + 状态过滤 + 任务书注入
  → 写第N+1章
  → 闪回敏感检测 + 正史注入
  → 生成后一致性校验
  → 冲突：warn/修订提示/人工 supersede
```

## 抽取

### 触发点

1. 故事状态同步（自动交稿后 / 手动“同步故事状态”）——主路径
2. 手动锁定本章正史事件（作者满意时）
3. 修订级联：若修订改了已锁事件，走 supersede，不静默覆盖

### 策略

**模型抽取（主）**  
在 `buildStoryStatePrompt` JSON 输出中新增 `established_events`：

- 只抽正文明确发生、后续复述必须一致的事实
- 优先：死亡/重伤/规则触发/能力代价/身份揭晓/关键物品易手/承诺/谁知道什么
- 每条必须带 `source_excerpt`
- 不知道不编

**确定性补强（辅）**  
仅从已有结构化结果补标签/归类，不编造新剧情。

### v1 必抽类型

1. 死亡与重伤方式
2. 规则触发条件与后果
3. 能力/代价边界
4. 关键承诺
5. 秘密可见性

## 合并规则

1. 空不覆盖非空
2. candidate 不覆盖 confirmed
3. 低置信不覆盖高置信
4. 无 `source_excerpt` 不入库
5. 同 `subject + predicate`：
   - 语义等价 → 合并增强（补 cause/mechanism/constraints）
   - 矛盾 → 冲突队列，不自动改 confirmed
6. hard 事件修改只能：
   - 作者手动 supersede，或
   - 修订流程显式 cascade impact

## 召回

### 状态过滤

`status_filter_receipts` 增加 `established_events`：

- 本章是否可能复述/闪回/解释前史
- 触发信号：回忆|闪回|前两任|当初|那时|死法|规则是|细纲相关标记

### 注入策略

优先级：

1. hard + flashback_sensitive
2. 与本章角色/地点/规则相关的 confirmed 事件
3. 近 5 章新增事件

默认上限 8–12 条，总字符约 1.5k–2.5k。

注入位置：

- `longform_memory_capsule.canon_facts`
- `chapter_target.established_events_contract`
- 正文 prompt 硬规则：复述已锁事件时不得改写 cause/mechanism/constraints，只能同义转述

章末 `ending_excerpt` 继续负责开篇承接；事件正史负责中段事实。二者分工，不互相替代。

## 校验

新增 `established_event_consistency`：

### 触发

- 正文出现 subject/alias 或相关 tags，且
- 存在对应 hard confirmed 事件

### 方法（P0 务实）

1. 约束词/机制词是否被明显矛盾说法替换
2. 可选模型对账回执：`event_id, restated, consistent, conflict_span, fix`
3. 冲突时：
   - 质量结果记高优先级 warn（P0 默认不 block，避免卡死写作）
   - 修订优先：“恢复已锁死亡方式/规则机制”
   - UI 展示冲突双方

## UI

挂到现有章节验收/故事状态区，不新开大页面。

### 正史事件状态

- 状态灯：已锁定 n / 待确认 n / 冲突 n
- 列表：事件短句 + 来源章 + hard/soft
- 操作：
  - 同步故事状态（同步时抽取事件）
  - 确认锁定（P1）
  - 手动新增/编辑（P1）
  - supersede（P1）

### 写作前说明

若下一章可能闪回但相关事件未锁：

> 故事状态未包含“前两任死亡方式”等正史事件，继续写容易闪回改写。建议先同步上一章正史。

若有冲突：

> 本章复述与已锁正史冲突：xxx。可按正史修订，或以本章为准 supersede。

原则：

- 不重复同功能入口
- 状态与动作一一对应
- “未同步”要说清缺哪类正史

## 决策（已确认）

1. **冲突默认策略（P0）**：高优先级 warn + 明确修复入口；不默认 block 入库。
2. **自动确认门槛**：`death` / `rule_trigger` 且 `confidence >= 0.85` 且有 `source_excerpt` → 自动 `confirmed`；其余 `candidate`。
3. **兼容**：保留 `canon_facts` 字符串投影，避免旧 UI/测试断裂。

## 分阶段

### P0 止血闭环

- 同步时强制抽取 `established_events`
- 合并防空覆盖
- 注入记忆胶囊 + 写作 prompt
- 基础冲突检测（关键词/约束）
- 章节页展示已锁正史事件摘要 + 同步引导

### P1 体验

- 闪回敏感自动召回增强
- 冲突 UI 与一键按正史修订
- 手动增改 / supersede
- revision cascade 打通

### P2 长跑

- 分层归档展示，hard 事件永不丢
- 跨卷索引
- 更强语义一致性（控成本）

## 验收（怪谈世界）

1. 第 1 章同步后至少得到林战/楚弦两条 hard confirmed 死亡事件，带 `source_excerpt`。
2. 写第 2 章时，记忆胶囊/任务书可见上述事件。
3. 若复述改写成另一套死法，一致性检查报警。
4. 空同步不会抹掉已锁事件。
5. UI 能解释未同步/冲突/下一步动作。

## 风险

| 风险 | 应对 |
|---|---|
| 抽太多，上下文膨胀 | 高损类型优先 + 条数/字符上限 + status filter |
| 抽错锁死 | death/rule 高置信自动确认；其余 candidate；支持 supersede |
| 作者故意改设定 | 显式 supersede，不静默覆盖 |
| 与现有状态同步抢戏 | 事件账本是 story_state 子集，不平行另起状态机 |
| 误伤创作自由 | soft 提示；hard 才强约束 |

## 相关现有代码锚点

- `ui/server/src/novel-writing/story-state-prompt.ts`：状态同步抽取 prompt
- `ui/server/src/routes/novel-writing-service.ts`：`mergeStoryState`、`buildLongformMemoryCapsule`、`updateStoryStateMachine`、正文 prompt 硬规则
- `ui/server/src/novel-writing/canonical-continuity.ts`：专名连续性（不覆盖事件账本）
- `ui/server/src/novel-writing/state-tracking-basics.ts`：状态硬伤
- `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`：`buildStoryStatePanel`
- `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`：故事状态 UI
- `docs/novel-usage-guide.md`：长篇记忆胶囊 / 正史事实说明
- `docs/oh-story-adoption-progress.md`：`state-tracking` / `artifact-protocols` / `workflow-daily`
