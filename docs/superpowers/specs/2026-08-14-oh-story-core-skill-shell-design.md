# oh-story 核心 Skill + 项目壳（方案 B）

日期：2026-08-14  
状态：已确认（用户批准 2026-08-14）  
前置：

- `2026-07-03-oh-story-director-layer-design.md`（导演层：合同编排，现改为调度 skill）
- `2026-08-13-writing-skill-full-pass-design.md`（写作 skill 整章 pass）
- `2026-08-14-writing-skill-marketplace-design.md`（GitHub 安装）
- 实测：run 920/931 显示「设计课 → 正文 must_fix → surgical_patch」会抬 AI 率

## 目标

把 [oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode) 当作**核心创作/审稿/去 AI skill**，MangaForge 回到当初迁移的真实目的：**项目级查阅、历史、导出、管理**。

不再把 oh-story 的设计课拆成正则、合同堆和一键正文补丁。已做的合同、回执、场景卡、导演层**不删除**，降级为大纲/材料字段和参考分。

B 做完后用第 1 章实跑验收。仍不行再评估方案 C（推倒合同层，工作台只当编辑器）。

## 已确认决策

1. **采用方案 B**，不采用现在继续「把 reference 迁进提示词」的台账方向。
2. **不放弃已有工作**：`conflict_structure_contract`、场景卡字段、delivery receipts、导演层、指纹库全部保留，只改它们能不能改字、能不能拦入库。
3. **朱雀 / 指纹只做参考分**。改不改正文完全听 oh-story 报告或用户点的 oh-story 动作。机器门不得回退、不得因检测失败拒绝入库、不得再触发自动修订。
4. **现有去 AI 味写作 skill 模块保留**（内置三项 + GitHub 市场 + 整章 pass）。B 期间默认不自动串进修订。何时启用等 B 验收后再定。
5. **字数目标 4200 不改**。字数/连续性可以警告，不得丢掉 oh-story 已采纳的正文。
6. **方案 C 是 B 验收失败后的后备**，本 spec 不实施。

## 问题（为什么迁了反而差）

oh-story 原包分层是：

| 阶段 | 原 skill | 产物 |
|---|---|---|
| 设计矛盾网 / 三层 / 阶梯 | `story-long-write` Phase 3 + `outline-conflict.md` | 卷纲 / 细纲 / 场景卡 |
| 审稿 | `story-review` | 报告，不是正文 |
| 去 AI | `story-deslop` | 新正文（能删先删） |

MangaForge 把设计课编进了：

- 正文生成提示（「交稿必须检查三层矛盾网是否同时运作」）
- 正文正则（`纵向矛盾|定地图|三层矛盾`）
- 质检 `must_fix`（「优先补三层矛盾网」）
- 一键 `surgical_patch`

同一句话在原包是设计师备忘，在我们这里是 Flash 执笔命令。第 1 章 run 931 已证实：质检修订先写入「三亿人 / 活火山 / 规则撕扯」，人工率到 0。

台账把 38 条 reference 标成 `integrated` 的标准是「提示词/检查/回执接上了」，不是「人工率变好」。这条验收会把系统推向规则堆叠。

## 分层

```
┌─────────────────────────────────────────────┐
│  oh-story 核心 skill（锁定版本的原版文件）     │
│  story-review / story-deslop / story-long-write │
└─────────────────────────────────────────────┘
                      │ 报告 / 细纲 / 新正文
                      ▼
┌─────────────────────────────────────────────┐
│  MangaForge 项目壳                           │
│  章节 · 版本 · reviews · runs · 导出 · 材料   │
└─────────────────────────────────────────────┘
                      │ 只展示，不改字
                      ▼
┌─────────────────────────────────────────────┐
│  参考分：指纹 / 朱雀 / 冲突合同自检            │
└─────────────────────────────────────────────┘
```

| 层 | 谁做 | 能否改正文 |
|---|---|---|
| 设计 | oh-story `story-long-write`（及 outline 类 skill） | 否，只改大纲/细纲/场景卡 |
| 审稿 | oh-story `story-review` | 否，只写 `reviews` |
| 去 AI / 按报告改句 | oh-story `story-deslop`，或用户从报告点选的可定位补丁 | 是 |
| 项目壳 | 现有章节、版本、运行、导出 | 存产物 |
| 参考分 | 现有指纹/朱雀/冲突正则 | 否 |
| 去 AI 味写作 skill | 现有模块，B 期间默认不自动跑 | 本 spec 不启用 |

## 核心 skill 如何落地（不是再迁一遍）

### 安装与锁定

- 来源固定：`https://github.com/worldwonderer/oh-story-claudecode`。
- 安装时锁定 HEAD revision（与写作 skill 市场相同）。
- 磁盘与写作 skill 市场**分开**，避免被「只输出改写后正文」的通用 humanize 编译器吃掉：

```
{workspace}/.mangaforge/oh-story-core/
  pack.json          # source_url, revision, installed_at
  skills/            # 原仓库 skills/ 树（至少 story-review / story-deslop / story-long-write）
```

- 不把 oh-story 核心包注册进 `writing-skills` catalog，也不走 `compileWritingSkillPassPrompt`。
- 现有写作 skill 市场继续服务内置三项和其它 GitHub 包；oh-story 是另一条「核心套件」。
- 安装上限按套件放宽（原包 references + scripts 会超过写作 skill 的 8 份 / 4 MiB）。具体上限在实现计划里用一次真实 zip 校准，原则：能完整放下三个核心 skill 及其 `references/`，拒绝路径穿越。

### 运行时

新增 oh-story 核心 runner（独立于 `runWritingSkillHumanizePass`）：

| 动作 | skill | 模型输入 | 项目产物 |
|---|---|---|---|
| 审稿 | `story-review` | 原版 SKILL.md + 其对口 references + 当前章正文 + 必要上下文 | `reviews.review_type = oh_story_review`，不改正文 |
| 去 AI | `story-deslop` | 原版 SKILL.md + 其对口 references + 当前章正文 | 新 `chapter_text` + 版本 + 回执 |
| 设计/细纲 | `story-long-write` 的设计阶段 | 原版 skill + 现有大纲/场景卡 | 更新细纲/场景卡，不直接写正文 |

提示拼装规则：

- **原样加载 skill 文件**，不追加「只输出改写后正文」「补三层矛盾网」这类系统合同。
- 审稿允许（且应当）输出报告结构；去 AI 才要求正文。
- 不把 38 条已迁移 reference 再拼进同一条提示。导演层只决定「现在跑哪一个 skill」，不决定「把哪些合同段落塞进 Flash」。

### 工作台入口

现有「按质检报告修订」不再用系统 `must_fix` 里的理论句当硬优先级。改为三个明确动作（可挂在现有修订/质检区，不新开一套信息架构）：

1. **oh-story 审稿**：跑 `story-review`，打开报告。
2. **oh-story 去 AI**：跑 `story-deslop`，写新版本。
3. **按报告改这一处**：仅当报告条目带得着原文句子时，打一条补丁。

系统质检分、指纹分、冲突合同分继续显示，文案标明「参考，不自动改稿」。

## 已有工作如何降级（不删）

### 冲突结构 / 三层矛盾网

保留：

- `chapter_target.conflict_structure_contract`
- 场景卡上的 `conflict_ladder_step` 等字段
- `conflict-structure-basics.ts` 的检查函数（给大纲/场景卡/参考分用）

禁止：

- `prose-quality-delivery-link.ts` 把 `conflict_structure_sync` 编进 `revision_directives` / `must_fix`（与材料缺口一样 `excludeFromDirectives`）
- `conflictStructurePriority()` 的「优先补三层矛盾网」进入一键修订
- `buildConflictStructurePromptSection` 里要求**正文**自检「三层矛盾网 / 定地图定阵营」的句子
- 修订提示硬优先级出现「补三层矛盾网」「补冲突阶梯」「补有进无出」等设计课口令

生成提示仍可带**本章场景卡里已经写好的具体阻力**（谁在拦、拦什么），不得带理论词教学段。

### 导演层

`OhStoryDirector` 保留就绪态和主动作，但：

- `quality_revision_required` 不得再因冲突结构/指纹/朱雀自动派发正文修订。
- 主动作改为「跑 oh-story 审稿 / 去 AI / 补细纲」，而不是「把合同编进提示再 surgical_patch」。
- 提示预算：默认 `omit` 设计课全文；只有用户显式跑设计 skill 时才加载对应 reference。

### 指纹 / 朱雀

继续计算、写入 review / run 回执 / UI。行为改成：

| 旧行为 | 新行为 |
|---|---|
| `selectFingerprintSafeProse` 不通过则回退上一版 | 不回退；`accepted` 仅表示参考评估，正文保持 oh-story/用户采纳版 |
| 入库 `detector_resistance` 硬失败 | 不拦入库；记参考分和警告 |
| 质检环因抗检测再自动改一刀 | 停止 |
| 写作 skill humanize 警告「已回退」却留下更 AI 的稿 | B 期间 humanize 默认不跑；函数若被调用也不得回退 |

`2026-08-13-writing-skill-full-pass-design.md` 曾写「指纹只记警告」，实现仍会回退或谎称回退。本 spec 把「只参考、不改字」定为硬规则，覆盖那份文档的入库/回退表述。

### 字数与连续性

- 标准章目标仍是 4200。
- 低于/超过目标：警告，可提示用户，不自动扩写、不丢弃 deslop 结果。
- 连续性：警告与 `downstream_continuity_warning` 可留；不因此回退 oh-story 正文。

### 系统质检修订

一键修订若仍存在，硬优先级只允许**可定位**项，例如：

- 这一句接不上上一章钩子（带原文）
- 这个名字/能力与已写章矛盾（带原文）

不允许：三层矛盾网、矛盾网、冲突阶梯、有进无出、死亡赌注、压势不压人（除非报告里已经写成「把第 N 段改成……」且带原文锚点）。

`quality_audit` 材料缺口维持现状：可见，不进修订指令。

## 现有去 AI 味 skill（B 期间）

保留代码、设置 UI、catalog、安装/卸载。

修订流水线默认：

- `runWritingSkillHumanizePass` 在编辑器修订路径上跳过（或视为 `skipped: true, reason: 'deferred_until_oh_story_core_eval'`）。
- 项目里已打开的开关不删，只是 B 验收前不自动执行。
- 生成路径是否跳过与修订相同，避免两条路行为分裂。

B 验收后再单独决定：接在 deslop 之后、互斥、还是只手动。

## 分步（仍属方案 B，一次做完再测）

### 第 0 步：止血（必须先合）

不装新包也能先停伤害：

1. 冲突结构类指令 `excludeFromDirectives`。
2. 正文生成/修订提示去掉理论自检段。
3. 指纹/朱雀改为参考分（不回退、不拦入库、不自动改）。
4. 修订默认不跑写作 skill humanize 串。

合入后，再点「按质检报告修订」不得再出现「补三层矛盾网」。

### 第 1 步：核心套件

安装并锁定 oh-story；审稿/去 AI 两个动作能跑；报告和正文版本进项目。

### 第 2 步：导演改调度

导演主动作指向上述 skill；提示预算不再堆 38 条 reference。

第 0 步可单独上线。第 1–2 步按实现计划拆 PR。全部完成后再做第 1 章对比测试。

## 验收

用项目 3、第 1 章（或同级已写章）跑一轮：

1. 系统质检可以打出冲突结构参考分，但一键修订的 `must_fix` / 硬优先级不含理论口令。
2. 「oh-story 审稿」写出可打开的报告，正文未改。
3. 「oh-story 去 AI」写出新版本；指纹/朱雀可以变差或变好，**以 deslop 正文为准**，不得回退。
4. 修订 run 的 `writing_skill_humanize` 为跳过，或根本没有 pass。
5. 章节版本、reviews、runs 能导出/回看这次审稿和去 AI。
6. 人工率：对照 run 931（理论补丁后 0）应明显回升。具体数字作观察项，不设硬门槛；若仍接近 0，再开方案 C 讨论。

## 非目标

- 不删指纹库、冲突合同、场景卡、导演类型、写作 skill 市场。
- 不把 oh-story 再拆进 `conflict-structure-basics` 正则。
- 不在本 spec 决定内置 humanizer 的最终挂载点。
- 不实施方案 C。
- 不改服务器标准章 4200。
- 不把 oh-story 混进画布 skill 安装器。

## 风险

- 原版 `story-review` / `story-deslop` 按 Claude Code 工作流写（读 `.novel/`、spawn agent）。runner 必须把项目章节/大纲映射成 skill 能读的上下文，并明确 **solo 模式**（不 spawn 子 agent），否则会降级失败或空转。
- 原包 references 体积大于当前写作 skill 上限，必须走独立套件安装，不能复用 4 MiB 提取上限。
- 信任 oh-story 意味着朱雀分变差也入库。UI 必须写清「参考分，已按 oh-story 采纳」。
- 导演和质检 UI 改主动作后，旧「一键修订」入口要避免 silently 走回理论补丁。

## 与旧文档的关系

- 本 spec **覆盖** `docs/oh-story-adoption-progress.md` 里「继续把 reference 编进提示/门禁」的下一优先队列。台账的 `integrated` 含义改为：材料字段/参考分已落地，**不等于**可驱动正文修订。
- 本 spec **收窄** `2026-07-03-oh-story-director-layer-design.md`：导演调度 skill，不再把合同自动编进正文提示。
- 本 spec **暂停** `2026-08-13-writing-skill-full-pass-design.md` 在修订/生成上的自动执行，直到 B 验收后另开决策。
