# 创建小说页 UI/流程重构设计

日期：2026-07-15  
状态：已确认  
范围：`NovelCreateWizard` 整页创建流程 + 深度孵化生成真实进度（SSE）

## 1. 背景与问题

当前创建小说弹窗（`ui/web/src/components/NovelCreateWizard.tsx`）在保留完整能力后，出现：

- 功能分区混乱：模式选择、类型引导、输入生成、评分、审阅、草稿操作挤在 Step 0
- 教学型说明过多，扫读成本高
- 深度孵化生成是长耗时多 pass，前端只见 loading，无法知道进行到哪一步
- 同功能入口重复，状态（未生成 / 生成中 / 可审阅 / 可开书）不够一眼可见

后端已具备分阶段生成能力（骨架、分卷/前30章、伏笔），但未对前端暴露真实进度。

## 2. 目标

1. **分区明显**：每块 UI 只做一件事，主操作唯一。
2. **信息连贯**：生成结果按基础→世界→人物→分卷→章纲→伏笔顺序展示。
3. **真实进度**：生成时通过 SSE 展示固定阶段推进，而不是假进度。
4. **去冗文案**：删除教学说明；仅在异常、缺口、风险时提示。
5. **能力保留**：类型引导、基础评分、模型细纲、草稿存取、三模式创建均保留。

## 3. 非目标

- 不改章节写作工作台 UI
- 不恢复「模型补强 foundation」功能
- 不把 6 步改成单页工作台
- 不删除兼容接口 `/api/novel/project-seed/derive`

## 4. 已确认决策

| 项 | 决策 |
|---|---|
| 范围 | 整页创建流程（Step 0–5） |
| 步骤骨架 | 保留现有 6 步 |
| 进度形态 | 固定步骤条 + 当前说明 |
| Step 0 布局 | 单列清晰分区 |
| 实现路径 | 方案 C：组件化重构 + SSE 真实进度 |

## 5. 信息架构

### 5.1 六步保留

1. 创作目标  
2. 商业钩子  
3. 长线承载  
4. 前30章  
5. 确认创建  
6. 创建完成  

### 5.2 Step 0 单列五区（深度孵化主路径）

1. **创建方式**：手动 / AI 快速 / 深度孵化（短标签，无长描述）  
2. **类型**：题材框架 chips；选中即写入表单与生成前缀  
3. **输入**：作品名、篇幅、创意、模型、生成按钮；草稿载入/保存  
4. **结果状态**（或生成进度）：  
   - 生成中：SSE 进度面板替换本区  
   - 已生成：计数 tags + 评分摘要 + 主操作（重新生成 / 保存 / 定稿开书）  
5. **审阅编辑**：基础 → 世界 → 人物 → 分卷 → 章纲 → 伏笔与待确认  

手动模式：仅展示必要基础字段，不出现生成进度与审阅大区。  
AI 快速：输入 + 一次生成结果摘要；详细审阅可弱化或只读摘要。

### 5.3 Step 1–4

统一结构：

- 顶部：本步标题 + 完成度 tags（已填/缺口）  
- 中部：表单字段（seed/launchpad 预填可改）  
- 去掉重复的「种子素材覆盖」长说明；用 tags 代替  

### 5.4 Step 5 确认创建

- 一张「开书摘要卡」：模式、类型、评分、分卷/细纲/伏笔计数、主要风险  
- 主按钮唯一：创建项目 / 我满意并开书  
- 次要：返回修改、保存草稿  

### 5.5 文案原则

- 不写教学腔（例如「这是 oh-story…」「系统不会…」），除非当前状态异常需要行动  
- 状态用标签：`分卷 4` `细纲 30` `伏笔 8` `评分 82`  
- Alert 仅用于：生成失败、细纲不足、评分不达标、需作者确认  

## 6. SSE 真实进度设计

### 6.1 新接口

`POST /api/novel/project-seed/derive-stream`

- Content-Type 请求：JSON（与 derive 相同字段：`idea` `title` `model_id` `length_target` `genre_framework?`）  
- 响应：`text/event-stream`  
- 旧接口 `POST /api/novel/project-seed/derive` 保留，内部复用同一核心逻辑  

### 6.2 事件协议

#### `stage`

```json
{
  "stage": "skeleton | outlines | volumes | foreshadowing | assemble",
  "status": "running | completed | error",
  "label": "生成分卷与前30章细纲",
  "progress": 0.0,
  "detail": "可选短说明，如 pass_a2 chapters=18",
  "outline_chapter_count": 0,
  "outline_volume_count": 0,
  "outline_foreshadowing_count": 0
}
```

#### `result`

```json
{
  "ok": true,
  "seed": {},
  "seed_diagnostics": {},
  "result": {}
}
```

#### `error`

```json
{
  "message": "人类可读错误",
  "seed": {},
  "seed_diagnostics": {}
}
```

### 6.3 前端固定 4 步展示

映射：

1. 整理故事骨架 ← `skeleton`  
2. 生成分卷与前30章细纲 ← `outlines` + `volumes`  
3. 生成伏笔计划 ← `foreshadowing`  
4. 汇总审阅材料 ← `assemble`  

展示规则：

- 已完成：✅  
- 进行中：⏳ + `detail` 一行  
- 未开始：灰色  
- 失败：当前步标红 + 重试按钮  
- 顶部 progress 条使用 `progress` 字段（0–1）  

### 6.4 后端挂点

在现有链路中注入 `onProgress?: (event) => void`：

1. `deriveProjectSeedWithModel` 开始/结束 → skeleton  
2. `expandThinProjectSeedWithModel`（如发生）→ skeleton/assemble 细节  
3. `generateProjectSeedFirst30OutlinesWithModel`  
   - Pass A 前/后 → outlines  
   - Pass A2 前/后 → outlines（带 chapter count）  
   - Pass A3 前/后 → volumes  
   - Pass B 前/后 → foreshadowing  
4. 最终 `attachProjectSeedDirector` / 响应组装 → assemble  
5. stream 路由写 SSE；异常写 `error` 事件  

连接中断：

- 服务端不保证客户端收到最终结果；不自动落半残 DB 草稿  
- 前端允许用户「重试生成」  

## 7. 组件结构

```
ui/web/src/components/
  NovelCreateWizard.tsx                 # 壳：Steps、导航、跨步状态
  novel-entry/create/
    CreateModeSection.tsx
    GenreGuideSection.tsx
    SeedInputSection.tsx
    GenerationProgressPanel.tsx
    SeedStatusBar.tsx
    DeepDraftReviewSection.tsx
    CreateStepHeader.tsx                # Step1-4 标题+完成度
    CreateSummaryCard.tsx               # Step5 摘要
    useProjectSeedStream.ts             # fetch SSE 解析
    createWizardCopy.ts                 # 精简文案常量
```

状态仍由 Wizard 持有（seed、diagnostics、launchpad、score、mode），子组件以 props/回调通信，避免过早引入全局 store。

## 8. 交互与状态机（Step 0 深度孵化）

```
idle
  → generating (SSE)
      → ready_for_review
      → needs_model_outline / needs_author_review（可编辑 + 提示）
      → failed（可重试）
ready_for_review
  → generating（重新生成）
  → finalizing（定稿/开书）
  → saved_draft
```

主按钮规则：

- 未生成：主按钮 = 生成详细草稿  
- 生成中：主按钮禁用，显示进度  
- 已生成且可开书：主按钮 = 生成确定版并开书（或下一步）  
- 评分不足：允许「我满意，以当前版本开书」显式确认  

同功能入口不重复：

- 生成：仅输入区主按钮 + 状态区「重新生成」  
- 保存草稿：状态区一处  
- 开书：状态区/Step5 主按钮，不在审阅每块重复  

## 9. 样式与视觉语言

- 沿用现有 Ant Design + 当前蓝/灰体系，不新引入设计系统  
- 分区 Card：`border-radius: 10–12`、轻背景区分生成中状态  
- 模式选择：三等分短卡片，选中描边高亮  
- 生成进度面板：信息蓝底，仅 generating 时出现  

## 10. 测试计划

### 前端

- `useProjectSeedStream`：解析 stage/result/error、中断与重试  
- 进度面板：stage 映射到 4 步 UI  
- Wizard 模式切换不串 seed  
- 文案组件无旧教学长文（快照/字符串断言可选）  

### 后端

- derive-stream 发出至少 skeleton → outlines → foreshadowing → assemble → result  
- onProgress 在 generate first30 各 pass 被调用  
- 旧 derive 行为回归（单测现有 novel-core-routes）  

### 手动验收

1. 深度孵化生成：可见 4 步真实推进，完成后审阅区有分卷/细纲/伏笔  
2. 失败重试可用  
3. 手动/快速/深度切换 UI 正确  
4. Step1–5 无重复说明墙，确认页可开书  

## 11. 实现顺序建议

1. 后端 `onProgress` 钩子 + `derive-stream`  
2. 前端 `useProjectSeedStream` + `GenerationProgressPanel`  
3. 拆分 Step0 五区组件并替换文案  
4. 统一 Step1–5 头部/摘要卡  
5. 回归测试与手工验收  

## 12. 验收标准（DoD）

- [ ] Step0 无大段教学文案；可见分区 ≤ 5  
- [ ] 生成中可见 4 步真实推进（SSE）  
- [ ] 生成后分卷/细纲/伏笔计数与审阅内容一致  
- [ ] 同功能主入口不重复  
- [ ] 三模式切换不串状态  
- [ ] 类型引导、评分、模型细纲能力保留  
- [ ] 旧 `/derive` 仍可用  
