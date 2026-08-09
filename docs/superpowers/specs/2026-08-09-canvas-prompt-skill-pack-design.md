# 画布提示词 Skill Pack 支持设计

日期：2026-08-09
状态：方案已确认，待书面规格审阅
范围：画布绘画/视频节点的提示词型 Skill；不接入小说工作台

## 背景

当前画布的 `GenerateNode` 已经有“提示词优化大师”角色预设，但它只是短文本 system prompt：

```text
你是顶级 Prompt Engineer。把输入转化为极致详细的英文 Prompt，并给出负面 Prompt。
```

节点在 `ui/web/src/components/nodes/GenerateNode.tsx` 中组装请求，提交到 `ui/server/src/routes/generate.ts`。对于媒体路由，provider runtime 会把请求转换成媒体模型需要的 `prompt`；部分 OpenAI-compatible 媒体端点直接使用 `request.prompt`，不会使用节点的 system prompt。因此，当前角色预设并不能稳定地参与 T2I/I2I/T2V/I2V 的实际提示词生成。

`restored-src` 已还原 Claude Code 的 Skill 文件发现和解析能力，包括 `SKILL.md`、frontmatter、引用目录和参数元数据。但 Claude Code 的完整 Skill 执行器依赖其内部会话、ToolUseContext、权限和工具编排，不应直接嵌入画布的单节点 `/api/generate` 链路。

目标参考仓库为 [MiniMax-H3](https://github.com/MiniMax-AI/MiniMax-H3)：

- [`h3-prompt-writing`](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing) 是纯提示词型 Skill，使用一个 `SKILL.md` 和两个 `references/*.txt` 指南，适合直接支持；
- 仓库中的其他 Skill 是多阶段视频生产工作流，包含确认卡、图片/视频/音频生成、编辑、Canvas 文档和 Hub 专用工具，不属于本期执行范围。

## 目标

- 允许用户通过 GitHub URL 或本地目录安装一个完整 Skill Pack；
- 自动发现 Pack 中所有 `skills/<name>/SKILL.md`；
- 支持提示词型 Skill 的 `SKILL.md`、YAML frontmatter、参数替换和 `references/` 引用读取；
- 将 Skill 作为画布媒体节点的生图/视频前置提示词编译步骤；
- 支持显式 Skill 选择和 `/skill-name` 调用；
- 将原始输入、编译后的正向提示词、负向提示词、Skill 名称和版本保存到节点运行结果，保证可复现；
- 根据媒体模式和 Skill 能力显示兼容性，避免把 H3 视频 Skill 误用于静态生图；
- 不改变小说工作台、小说 Agent、MCP 章节链路或现有媒体 Provider 适配器的职责。

## 非目标

- 不执行 Skill 中的 shell、脚本、Hook、MCP 或 Claude Code 专用工具；
- 不实现 Claude Code 的完整 Skill Tool、fork Agent、Task、权限审批和会话恢复；
- 不保证 MiniMax-H3 仓库中的多阶段生产 Skill 在画布中原样跑完；
- 不把复杂工作流 Skill 静默降级成“一次提示词调用”并声称完整交付；
- 不修改小说工作台提示词、Agent 计划、小说工具或 MCP 任务；
- 不把所有 Skill 内容预加载进每次请求，避免上下文和缓存膨胀。

## 术语与能力分级

### Skill Pack

一个外部仓库或本地目录，包含一个或多个 Skill 目录。标准布局为：

```text
<pack>/skills/<skill-name>/SKILL.md
<pack>/skills/<skill-name>/references/...
<pack>/skills/<skill-name>/agents/openai.yaml   # 可选展示元数据
```

### Prompt Skill

只依赖 Markdown 指令、frontmatter、参数和引用文件，输入文本/图片上下文，输出提示词或结构化文本。不需要外部工具即可执行。`h3-prompt-writing` 属于此类。

### Workflow Skill

依赖多阶段状态、用户确认、工具调用、媒体生成、编辑或 Canvas 编排。第一期只索引并标记能力，不自动执行完整流程。

### 兼容状态

每个 Skill 必须在索引时被标记为以下之一：

- `prompt_ready`：可用于当前节点模式的提示词编译；
- `prompt_partial`：可以读取，但包含未支持的 workflow 约束；本期只允许预览兼容性说明，不进入媒体运行；
- `workflow_only`：依赖工具/状态/审批，当前节点不执行；
- `invalid`：frontmatter、目录或引用不合法。

## 方案比较

### 方案 A：直接注入 SKILL.md 到媒体请求

把 Skill 正文拼接到现有 system prompt。

优点：改动最小。缺点：媒体端点经常只消费 `prompt` 或 user message；复杂 Skill 不会被可靠执行；引用文件、输出格式和模式选择都无法稳定落地。放弃。

### 方案 B：生图/视频前置提示词编译器（采用）

在媒体调用前，使用用户明确配置的文本/视觉文本模型执行 Prompt Skill，输出规范化提示词，再把结果提交给现有 T2I/I2I/T2V/I2V/ComfyUI 路径。

优点：复用现有媒体执行链；不依赖图片模型是否支持 system prompt；可以完整处理 `h3-prompt-writing` 的引用规则；失败和成本边界清晰。缺点：每次生图/视频可能增加一次文本模型调用，需要配置可用的文本模型。

### 方案 C：新增 Skill 画布节点

画布显式显示 `[Skill] -> [Generate]`。

优点：DAG 语义清楚，编译结果可单独复用。缺点：增加节点类型、连线、状态和 UI 复杂度；对用户现有“在绘画节点里写提示词”的习惯侵入较大。本期先不采用，但后续可复用方案 B 的服务层扩展。

## 总体架构

```text
GitHub URL / 本地目录
  -> Skill Pack Installer
  -> Skill Registry
       -> SKILL.md frontmatter 索引
       -> references/ 目录索引
       -> 能力与媒体模式分类
  -> /api/skills
  -> GenerateNode Skill 选择器

用户原始提示词 + 连线文本/图片 + 媒体模式
  -> Prompt Skill Compiler
       -> 选择一个 prompt_ready Skill
       -> 加载 SKILL.md 明确引用的 references
       -> 调用文本模型
       -> 解析 PromptCompileResult
  -> 现有 /api/generate 媒体执行链
  -> 图片/视频结果
```

### 组件职责

#### Skill Pack Installer

- 第一期只接受公开的 `https://github.com/<owner>/<repo>[.git]` URL 或用户明确选择的受控本地目录；
- 下载浅克隆或归档到当前 workspace 的 Skill Pack 缓存目录；
- 记录来源 URL、解析后的 revision/commit、安装时间和校验状态；
- 默认不自动更新已安装 revision；更新必须显式触发；
- 不执行仓库中的脚本或安装钩子。

#### Skill Registry

- 扫描 Pack 下的 `SKILL.md`；
- 解析 `name`、`description`、`when_to_use`、`arguments`、`user-invocable`、`paths`、`allowed-tools` 等已有字段；
- 规范化 `metadata.trigger-words` 等扩展字段；
- 建立 `skill_name -> manifest` 索引；
- 计算引用文件列表和能力状态；
- 缓存索引，文件变更或 Pack 更新时失效；
- 索引键使用 `(pack_id, skill_name)`；同名 Skill 不静默覆盖，UI 显示 Pack 前缀并要求用户选择具体来源。

#### Prompt Skill Compiler

- 输入：Skill 名称、用户输入、连线文本素材、参考图片元数据、当前媒体模式、节点参数；
- 加载 Skill 正文明确引用的文件，引用读取限定在该 Skill 根目录内；
- 使用文本模型而非媒体模型执行 Skill；
- 使用 workspace 级 `skill_compiler_model_id`，节点可显式覆盖；未配置时停止并提示选择，不自动猜测模型；
- 需要分析参考图片时，编译模型必须声明 Vision 能力；
- 要求模型输出结构化 `PromptCompileResult`；
- 解析失败、空提示词、模式不兼容或引用缺失时返回 typed error；
- 不执行 `allowed-tools`、shell、Hook、MCP、Task 或 Agent fork；
- 将编译过程摘要和最终提示词返回给节点用于预览和审计。

#### GenerateNode Skill UI

- 保留现有提示词输入框；
- 在“角色与提示”/媒体配置中增加 Skill 选择器；
- 显示 Skill Pack、Skill 名称、兼容状态和版本；
- 支持显式 `/skill-name` 语法，显式调用优先于节点选择；
- 只把对当前 `mode` 标记为 `prompt_ready` 的 Skill 放入默认列表；
- 默认不选择 Skill；一旦用户显式选择 Skill 或写出 `/skill-name`，运行节点时必须自动执行编译；
- 提供“预览编译提示词”入口；预览结果输入未变化时，正式运行复用同一编译结果，避免重复文本模型调用；
- 编译后的正向/负向提示词可折叠查看，原始输入保持可编辑。

## Skill 文件兼容规则

### 目录发现

默认支持：

```text
<workspace>/.mangaforge/skills/<name>/SKILL.md
<workspace>/.claude/skills/<name>/SKILL.md
<workspace>/.codex/skills/<name>/SKILL.md
```

用户安装的外部 Pack 存放在：

```text
<workspace>/.mangaforge/skill-packs/<pack-id>/<revision>/skills/<name>/SKILL.md
```

本期不默认读取宿主机全局目录，除非用户在设置中显式开启并选择目录，以避免不同项目之间出现不可见 Skill 漂移。

### Frontmatter

必须支持：

- `name`
- `description`
- `when_to_use`
- `arguments`
- `argument-hint`
- `user-invocable`
- `metadata.trigger-words`
- `metadata.media_modes`（MangaForge 扩展，可选）

可识别但不执行：

- `allowed-tools`
- `context: fork`
- `agent`
- `hooks`
- `shell`

可识别但只用于能力分类：

- `model`
- `effort`
- `paths`

### 引用读取

- Skill 正文中的相对引用按照 Skill 根目录解析；
- 允许读取 `references/`、模板和纯文本/Markdown/JSON/YAML 文件；
- 路径必须经过 realpath 校验，不得跳出 Skill 根目录；
- Registry 只索引 Skill 正文显式提及的相对引用，不递归猜测或读取整个仓库；
- 编译时一次性加载该 Skill 明确引用的全部文件；模型不获得文件读取工具；
- 默认限制为：`SKILL.md` 256 KiB、单个引用 512 KiB、单个 Skill 全部引用 2 MiB、单次编译装载 512 KiB；超限返回可诊断错误。

### `agents/openai.yaml`

如果存在，只读取 `display_name`、`short_description`、`default_prompt` 作为 UI 展示和显式调用建议。它不赋予工具权限，也不改变 Skill 执行模型。Skill 目录名和 frontmatter `name` 都保留：前者用于来源路径和安装稳定性，后者用于显示与调用。

## 能力与模式分类

分类优先级如下：

1. frontmatter 中的显式 `metadata.media_modes`/能力字段；
2. Skill 描述和正文中的模式关键词；
3. 用户在节点中手动覆盖；
4. 无法确定时标记为 `prompt_partial`，不自动用于媒体生成。

示例：

| Skill | T2I/I2I | T2V/I2V | 说明 |
|---|---:|---:|---|
| `h3-prompt-writing` | 否 | 是 | H3 视频提示词结构 |
| 一般构图/风格 Prompt Skill | 是 | 可选 | 需明确输出媒体类型 |
| 品牌宣传片 Workflow | 否 | 否 | 索引并显示说明，不进入媒体运行 |
| 依赖 `hub_generate_*` 的 Skill | 否 | 否 | 需要未来工具适配 |

## PromptCompileResult 合同

编译器要求文本模型优先返回 JSON：

```json
{
  "skill_name": "h3-prompt-writing",
  "skill_version": "installed-revision-or-frontmatter-version",
  "mode": "I2VA",
  "prompt": "...",
  "negative_prompt": "...",
  "parameters": {},
  "references_used": [
    "references/base-en.txt",
    "references/ref-en.txt"
  ],
  "warnings": []
}
```

规则：

- `prompt` 必须为非空字符串；
- `negative_prompt` 可为空，但字段必须存在；
- `mode` 必须与节点媒体模式兼容；
- `references_used` 必须是 Skill 根目录内已读取的相对路径；
- `parameters` 只允许传递白名单媒体参数，不允许注入 URL、凭据或任意请求字段；
- 若 Provider 不支持独立负向提示词，编译器将其合并到主提示词，并在 `warnings` 记录转换。
- Skill 自身要求的精确纯文本格式保存在 `prompt` 字符串内部；外层 JSON 只作为 MangaForge 传输合同，不改写 Skill 的字段顺序和格式。

模型无法输出 JSON 时，可以进行一次严格 JSON 重试；仍失败则不提交媒体生成。

## 执行数据流

### 无 Skill

保持现有行为：节点构造原始请求并提交 `/api/generate`。

### 显式 Skill

```text
GenerateNode
  -> POST /api/generate (skill + prompt + mode + assets)
  -> Prompt Skill Compiler
  -> PromptCompileResult
  -> 同一请求继续媒体执行
  -> image/video provider
```

API 边界固定为：

- `GET /api/skills`：列出 Skill Pack、Skill 和兼容状态；
- `POST /api/skills/packs`：安装 GitHub Skill Pack；
- `POST /api/skills/compile-preview`：预览并缓存编译结果；
- `POST /api/generate`：携带 Skill 选择时在同一请求内编译并继续媒体执行。

预览缓存键由 Pack revision、Skill 名称、原始输入、媒体模式、引用 asset lineage 和影响提示词的节点参数共同计算。键未变化时，正式运行复用预览结果；任一输入变化立即失效。

### `/skill-name` 调用

- 只在用户明确写出 `/skill-name` 时触发；
- 参数文本传入 Skill 的 `arguments` 替换上下文；
- 如果多个 Pack 存在同名 Skill，必须使用 `/pack-id:skill-name` 或通过 UI 选择 Pack；不允许根据安装顺序猜测；
- 若 Skill 不存在、不可调用或与当前模式不兼容，返回可见错误；
- 本期不做基于关键词的隐式自动选择，避免误触发和额外费用。

## 媒体 Provider 适配

- 编译器输出的 `prompt` 覆盖原始媒体请求的 `prompt`；
- `negative_prompt` 根据 Provider/Model 的参数 schema 写入对应字段；
- 不再依赖媒体 Provider 是否消费 system prompt；
- T2I/I2I 保留现有参考图片和 asset lineage；
- T2V/I2V 保留现有镜头参数、比例和参考帧；
- ComfyUI 工作流只有在其输入映射声明支持 `compiled_prompt`/`negative_prompt` 时才注入，否则提示用户手动绑定节点字段；
- Skill 编译不会改变 Provider 选择、Key 路由、SSE、取消或现有任务状态。

## 错误处理

- Pack 下载失败：不改变现有已安装版本，返回来源和网络错误；
- Pack 校验失败：拒绝激活该 Pack，不执行任何仓库文件；
- Skill frontmatter 无法解析：保留文件在索引中但标记 `invalid`；
- 引用缺失/越界/超限：编译失败，不提交媒体请求；
- 无可用文本模型：提示用户配置文本模型，允许关闭 Skill 后继续原始生图；
- 编译结果格式错误：一次 JSON 修复重试，仍失败则停止；
- 媒体生成失败：沿用现有错误、SSE 和取消语义；
- Skill 版本变化：节点运行记录使用安装 revision，避免同一画布重跑得到不可解释的不同提示词。

## 安全边界

- 第一期只下载公开 GitHub HTTPS URL 或读取用户明确选择的本地目录；不调用 `npx skills add`，不执行外部安装器；
- 记录并锁定 commit/revision；
- 解包和引用读取防止路径穿越、符号链接跳出和超大文件；
- 不执行仓库中的脚本、shell、Hook、MCP 配置或安装命令；
- Skill 正文视为不可信提示词输入，不能覆盖系统安全规则、Key、workspace 或权限；
- 编译器向文本模型发送前，对 workspace 路径、Key、内部请求字段和凭据做过滤；
- 日志记录 Skill 名称、Pack revision、模式和引用文件，不记录 API Key。

## UI 与持久化

节点数据新增字段：

```ts
{
  skillPackId?: string
  skillName?: string
  skillRevision?: string
  skillCompileEnabled?: boolean
  skillCompilerModelId?: number
  skillArguments?: Record<string, string>
  compiledPrompt?: string
  compiledNegativePrompt?: string
  compiledReferences?: string[]
  compiledInputHash?: string
}
```

现有 `prompt` 保留为用户原始输入，不被编译结果覆盖。这样用户可以关闭 Skill、修改原始描述或重新选择 Skill，而不丢失输入。

节点结果和资产溯源中保留：

- 原始 prompt；
- 编译后的 prompt/negative prompt；
- Skill Pack 来源和 revision；
- 文本模型和媒体模型；
- 使用的 references；
- 编译 warnings。

workspace 设置保存默认 `skill_compiler_model_id`。节点没有覆盖时继承该设置；两者均为空时不允许启动 Skill 编译。含参考图片的编译要求所选模型具备 Vision 能力。

## 测试设计

### Registry/Installer

- 能扫描单个 Skill Pack 中多个 `SKILL.md`；
- 能读取嵌套 `references/`；
- 同名 Skill 有稳定优先级；
- Git URL revision 被记录并可重复加载；
- 非法 YAML、路径穿越、符号链接和超大文件被拒绝；
- 不执行仓库中的脚本和 Hook。

### Compiler

- `h3-prompt-writing` 的两个显式引用都被安全加载，T2VA/I2VA/FL2VA/L2VA 与 Ref2VA 输出分别遵守对应指南；
- 参数替换和引用路径保持在 Skill 根目录；
- 输入图片和连线文本正确传入文本模型；
- 编译结果满足 `PromptCompileResult`；
- 非 JSON 输出触发一次修复重试；
- 缺少引用、空输出和模式不兼容返回 typed error。

### GenerateNode/API

- 不选择 Skill 时现有请求完全不变；
- 选择 Skill 后媒体请求使用 compiled prompt，而不是 system prompt 拼接；
- T2I/T2V 模式过滤正确；
- 参考图片、比例、模型参数、SSE、取消和 asset lineage 不回归；
- 编译失败不会创建媒体任务或消耗媒体模型调用。

### 真实验收

1. 安装 MiniMax-H3 Skill Pack；
2. 在 T2V/I2V 节点选择 `h3-prompt-writing`；
3. 分别测试无参考图、首帧、首尾帧和全参考输入；
4. 检查编译结果的字段顺序、标签、时间格式和 references_used；
5. 确认媒体模型收到 compiled prompt；
6. 确认同一节点重复运行锁定相同 Pack revision；
7. 选择品牌宣传片等 workflow Skill 时，只显示兼容性说明，不错误触发 Hub 工具。

## 交付标准

- 可通过 GitHub URL 安装一个包含多个 Skill 的 Pack；
- `h3-prompt-writing` 可在画布视频模式中完整完成提示词编译；
- Prompt Skill 能读取自身 references 并输出结构化结果；
- Workflow/Tool Skill 被正确标记，不被误当成单次 Prompt Skill 执行；
- 无 Skill 时现有画布生成行为不变；
- 小说工作台、MCP 章节链路和完整 `restored-src` Claude Code 会话不受影响；
- Server/Web 测试、构建和 Skill 真实验收通过。
