# 写作 Skill 完整逐轮精修（2026-08-13）

## 目标

把现有「精简规则 + 一轮切段合成」升级为：**每个开启的 skill 用原版 SKILL.md（加对口参考）对整章各跑一轮**。质量优先，允许多次模型请求。朱雀类检测器上的人工率是效果参照，不是入库硬门闩。

本 spec 取代 `2026-08-13-writing-skill-humanize-design.md` 里「一轮合成、轻改、±15%、切 1800 字、指纹一票否决」的决策。开关位置、修订只读项目默认、不进画布安装器、不改 4200 字数目标，继续有效。

## 已确认决策

- 每个开启的 skill **各跑一轮整章**，不合成进同一条提示。
- 固定顺序：`fiction-humanizer-zh` → `remove-ai-flavor` → `humanizer-zh`。关闭的跳过。
- `fiction-humanizer-zh` 默认 **精修**；设置里可选 **重写**。档位只作用于这一个 skill。
- 提示喂 **完整 SKILL.md + 对口参考**，运行时不拉 GitHub。
- 普通章整章一次请求；超过约 12000 字才允许切段。
- 字数按章节目标收，不按原文 ±15% 锁死。
- 某一轮失败或门闩不收：留下上一轮正文，继续后面的 skill，不挡入库。
- 指纹只记警告，不再整轮回退。
- 默认开关不变：fiction-humanizer 开、remove-ai-flavor 开、humanizer-zh 关。
- `humanizer-zh` 开启时必须套小说安全套。
- 生成：项目默认 + 本次覆盖。修订：只读项目默认。
- 现有润色 / humanize / deslop / 句壳正则保留，仍在 skill 轮之前。

## 流水线

生成：

`草稿 → 主编/网感润色 → 现有 humanize → 逐个整章 skill → 质检入库`

修订：

`修订候选准入 → 逐个整章 skill → 保存 → 质检`

修订 skill 轮仍在准入 checkpoint 写入之前改候选，避免冻结候选身份。整次取消（worker 停止 / 租约丢失）才回退已准入修订正文；单轮失败不回退整次修订。

进度事件名仍是 `writing_skill_humanize`。文案带当前 skill，例如「写作skill · 小说去AI味」。LLM 调用继续复用 `humanize` / `humanize_prose`，不新增 `ChapterTaskStage`。

## 配置

```
project.reference_config.writing_skills = {
  enabled: {
    "fiction-humanizer-zh": true,
    "remove-ai-flavor": true,
    "humanizer-zh": false
  },
  fiction_humanizer_mode: "polish"   // "polish" | "rewrite"
}
```

- `fiction_humanizer_mode` 缺省或非法值视为 `polish`。
- 生成请求可带 `writing_skills.enabled` 与 `writing_skills.fiction_humanizer_mode` 覆盖本次。
- 未知 id / 未知档位忽略。缺省键沿用上一层。
- 项目设置：「小说去AI味」旁加精修/重写；该 skill 关闭时档位禁用。
- GET/PUT `/api/novel/projects/:id/writing-skills-config` 读写上述结构。

## 提示拼装

规则目录（固化进仓库，不运行时抓取）：

```
ui/server/src/novel-writing/writing-skills/vendor/
  fiction-humanizer-zh/SKILL.md
  fiction-humanizer-zh/references/ai-fiction-patterns.md
  fiction-humanizer-zh/references/scene-rewrite.md
  fiction-humanizer-zh/references/chapter-checklist.md
  fiction-humanizer-zh/references/genre-notes.md
  remove-ai-flavor/SKILL.md
  humanizer-zh/SKILL.md
```

来源（实现时按当时 main 快照拷入，不在运行时访问网络）：

- `deedeekong07-alt/fiction-humanizer-zh`
- `B1lli/remove-ai-flavor-writing-skill`
- `op7418/Humanizer-zh`

每一轮提示只包含：

1. 任务行：按当前 skill + 档位改写，只输出正文。
2. 小说总合同：不改主线/人物关系/时间线/已有伏笔/关键设定；不编原文没有的经历；不输出分析或 markdown。精修额外写明：可重排段落、必须补铺垫/过程/余波。重写额外写明：可重构场景链，仍锁人物、设定和章节功能。
3. 该 skill 的完整 SKILL.md 正文（去掉 YAML frontmatter、star 仓库、本地 python 审计、Claude `allowed-tools` 等运行时无关段）。
4. 对口参考：
   - `fiction-humanizer-zh`：始终带 `ai-fiction-patterns.md`、`scene-rewrite.md`、`chapter-checklist.md`；项目有题材/类型时再带 `genre-notes.md`。
   - 另外两个 skill：不带 fiction-humanizer 参考。
5. `humanizer-zh` 开启时追加小说安全套：禁止第一人称作者旁白；禁止为「注入灵魂」编经历；不改主线。
6. 【原文】整章正文。

禁止再使用「轻改：保留原段落顺序」作为默认指令。

## 切段

- 阈值：本章输入 **超过 12000 字** 才切段。普通标准章（约 3000–5000）必须整章一次请求。
- 切段按空行 / 场景边界切，单段目标约 6000–8000 字，禁止再切成 1800 字小段。
- 同一 skill 内各段顺序请求，每段喂同一套完整 SKILL.md + 对口参考 + 该段正文，并注明「这是第 i/n 段，前后文已锁定，不要改本章未给出的情节」。
- 拼回整章后再跑字数 / 连续性 / 灵魂句门闩。任一段失败则整轮回退到该轮输入。
- `chunk_count` 记实际请求段数；未切段为 1。

## 字数门闩

每一轮相对**本轮输入**（上一轮收下的正文）计算：

- 下限：`max(800, ceil(输入 × 0.70))`。标准章（非 long/custom）再与 2700 取较高值，避免删成梗概。若输入本身低于 2700，精修必须往上补；只改语气、字数仍低于 2700 的候选拒本轮，留下原文。
- 上限：
  - 有章节字数目标且输入未超目标上限：`max(输入 × 1.30, 目标 max)`，精修可以补到目标附近。
  - 输入已超目标上限：只留约 5% 波动（至少 200 字），禁止明显注水。
  - 无目标：上限为输入 × 1.30。
- 空稿、聊天外壳：拒。
- 开篇连续性：复用现有 opening continuity 选择器；接不上则拒本轮。
- `humanizer-zh`：候选新引入作者灵魂句则拒。
- 指纹：`selectFingerprintSafeProse` 结果写入回执警告，不回退正文。

## 回执

`raw_payload.writing_skill_humanize`：

```
{
  version: "writing_skill_humanize_v2",
  fiction_humanizer_mode: "polish" | "rewrite",
  enabled_ids: [...],
  accepted: true,
  changed: true,
  before_chars: 4705,
  after_chars: 4300,
  warnings: [],
  passes: [
    {
      id: "fiction-humanizer-zh",
      mode: "polish",
      accepted: true,
      before_chars: 4705,
      after_chars: 4400,
      chunk_count: 1
    },
    {
      id: "remove-ai-flavor",
      accepted: true,
      before_chars: 4400,
      after_chars: 4300,
      chunk_count: 1
    }
  ]
}
```

- 顶层 `accepted`：这次 skill 流程跑完且有可入库正文（含全部跳过 / 全部回退）。取消中止时不写成功回执。
- 顶层 `changed`：`passes` 里至少有一轮 `accepted=true` 且该轮 `after_chars !== before_chars`（或正文与该轮输入不同）。全部跳过或全部回退时 `changed=false`，正文等于入口正文，仍入库。
- 每轮 `accepted`：该轮候选通过门闩并替换正文。
- 指纹警告写入顶层 `warnings`（字符串数组），不改变 `accepted` / `changed`。
- 修订 checkpoint 的 `writing_skill_humanize` 用同一结构。

## 失败

- 单轮 LLM 抛错、超时、空稿、门闩不收：该轮 `accepted=false`，正文回退到该轮输入，继续下一轮。
- 修订取消 / worker 停止 / 租约丢失：整次中止，不继续后面的 skill。
- 生成侧若带 `chapterTaskExecution` 且错误是任务取消：向上抛，不吞。

## 非目标

- 不改标准章服务端字数目标 4200。
- 不把这三个 skill 装进 `ui/server/src/skills` 画布安装器。
- 不新增 `ChapterTaskStage` 枚举。
- 不在 skill 轮之后再加 checklist 审判轮（可后续加）。
- 不以朱雀分数作为入库硬门闩。
- 不在运行时访问 GitHub。

## 测试要点

- 精修提示含完整 SKILL.md 标题/工作流，并含三份固定参考；有题材时含 `genre-notes`。
- 重写档位出现在提示里，且不再出现默认「轻改」指令。
- 关闭的 skill 不发请求；只开两个则恰好两轮，顺序固定。
- 原文 3500、目标上限 4620 的精修加到 4300 收下；删到 800 拒。
- 中间一轮抛错，下一轮输入仍是上一轮正文。
- 修订只读项目档位，忽略生成条覆盖。
- 设置 API 与项目设置能读写 `fiction_humanizer_mode`。
- 指纹失败不回退已收下的 skill 正文。

## Skill 模型（2026-08-14 增补）

- 所有写作 skill 轮次共用一个可选模型设置：`project.reference_config.writing_skills.model_id`（正整数）。
- 仅项目设置可配置；生成条的 `writing_skills` 覆盖 payload 永不携带 `model_id`，即使覆盖里出现该键也会被忽略（修订与 resolve 只读项目配置）。
- 设置时 skill LLM 轮使用该模型；未设置时保持原行为：修订阶段模型 → 项目首选模型。
- 生效范围：skill 模型在 model 执行源（`chapterTaskExecution.source === 'model'`）和无执行源（直接 executeAgent 回退）时生效；MCP 执行源由远端绑定决定模型，设置不生效。
- 入库回执 `writing_skill_humanize` 仅在设置真正可生效时记录 `model_id`（未设置、或 MCP 执行源下不写入该键）。
