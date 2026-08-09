# Canvas 多参考 Skill 与多参生视频设计

## 背景

画布 GenerateNode 已能把连接的图片和文本素材送入 Prompt Skill 编译器，但当前最终媒体请求仍可能退化为单个 `image_url`。MiniMax H3 的提示词 Skill 支持多参考模式（I2VA、FL2VA、L2VA、Ref2VA），因此“多参”必须同时覆盖：

1. Skill 只生成多参提示词的预览/编译场景；
2. 真实视频生成场景；
3. 编译、审计、缓存和最终 Provider 之间的同一份引用清单。

## 目标

- 最多传递 9 张图片参考，保持稳定顺序、角色和 `source_asset_ids` lineage。
- Skill 编译器看到全部参考，而不是只看到第一张；每张参考有明确标签。
- 真实媒体生成只有在 Provider 或 Comfy 工作流显式支持多参考时才发送全部参考；不支持时明确失败，禁止静默丢图。
- 预览编译不依赖最终视频 Provider 的多参考能力。
- 兼容现有单图节点、无 Skill 请求和旧节点数据。
- 为视频/音频参考预留类型和序列化字段，但本轮只执行图片与文本参考。

## 非目标

- 本轮不接入视频/音频参考的上传、节点端口或 Provider 传输。
- 不自动根据 trigger words 选择 Skill。
- 不接入小说工作台、Agent、MCP、Claude Code/restored-src 执行器。
- 不为不支持多参考的 Provider 自动退化成第一张图。

## 统一引用模型

在 GenerateNode 数据和请求边界使用可序列化的 `referenceBindings`：

```ts
type CanvasReferenceRole =
  | 'general'
  | 'first_frame'
  | 'last_frame'
  | 'character'
  | 'scene'
  | 'style'
  | 'full_reference'
  | 'prompt_context'

type CanvasReferenceBinding = {
  reference_index: number       // 1..9 for media references
  reference_id: string          // stable within the node data
  role: CanvasReferenceRole
  type: 'image' | 'prompt' | 'video' | 'audio'
  url?: string
  content?: string
  source_asset_ids?: number[]
}
```

本轮可执行的媒体参考是 `image`，文本上下文是 `prompt`；`video` 和 `audio` 仅保留类型位并在执行时返回有类型的不支持错误。图片顺序与角色变化会改变编译 fingerprint。首帧和尾帧各最多一张；其它角色可重复。图片总数最多 9 张，文本素材继续使用既有文本大小限制。

旧节点迁移规则：没有 `referenceBindings` 时，按现有 incoming asset 顺序生成绑定；单张旧图片默认 `general`。无 Skill 请求继续走原有 payload 路径。

## 数据流

```text
upstream image/text nodes
        │
        ▼
GenerateNode: ordered bindings + roles + lineage (persisted)
        │
        ├── compile-preview: all bindings → Skill compiler
        │                    → labeled multimodal prompt context
        │                    → compiled prompt + references + hash
        │
        └── /api/generate: same bindings + compiled prompt
                             ├── multimodal Provider with explicit multi-ref support
                             └── Comfy with explicit per-index/array mapping
```

编译器在每个图片部分前加入确定性标签，例如：

```text
REFERENCE IMAGE 1
ROLE: first_frame
SOURCE ASSET IDS: [42]
```

之后才附加 `image_url` part。这样 Skill 可以将参考映射到 `<Picture 1>`、`<Subject 1>` 等自身格式，而不必猜测图片顺序。文本参考也保留 `reference_index` 和 lineage。

## H3 语义提示

角色只作为选定 H3 Skill 的输入提示，不会触发 Skill 自动选择：

| 输入引用角色 | H3 子模式提示 | 规范化 MangaForge mode |
| --- | --- | --- |
| 无图片 | T2VA | `text_to_video` |
| 一张 `first_frame` | I2VA | `image_to_video` |
| `first_frame` + `last_frame` | FL2VA | `image_to_video` |
| 仅 `last_frame` | L2VA | `image_to_video` |
| 多角色/`full_reference` | Ref2VA | `image_to_video` |

H3 alias 归一化严格限定于 `h3-prompt-writing`；其它 Skill 返回 H3 alias 或未知 mode 时仍按普通 mode 校验失败。编译结果对外使用 canonical MangaForge mode，审计中另外保存子模式提示。

## Provider 与 Comfy 边界

内部请求保留向后兼容的单图 `image_url`，同时增加有序的 `reference_images` 集合（含 URL、角色、序号和 lineage）。

- 支持多图消息的 Provider：按原顺序发送全部 image parts。
- 通过 Provider/route DSL 显式声明数组或按序字段的 Provider：只按声明映射 `reference_images`，不猜参数名。
- 只支持单个 `image_url` 的 Provider：当引用数大于 1 时返回 `MULTI_REFERENCE_UNSUPPORTED`。
- Comfy：必须为每个引用序号或引用数组提供显式 mapping；缺 mapping 返回 `MULTI_REFERENCE_MAPPING_REQUIRED`，不得猜节点。
- `compile-preview` 只需要编译模型具备 chat/vision 能力，不因目标媒体 Provider 不支持多参而阻止提示词生成。

统一错误包括：`REFERENCE_LIMIT_EXCEEDED`、`REFERENCE_ROLE_INVALID`、`REFERENCE_MEDIA_UNSUPPORTED`、`MULTI_REFERENCE_UNSUPPORTED`、`MULTI_REFERENCE_MAPPING_REQUIRED`。错误必须在创建媒体 task/provider 执行前返回。

## UI 与持久化

Skill 面板列出所有连接参考，显示序号、缩略图/文本摘要、lineage 和角色选择；支持调整顺序、清除角色和预览编译。编译结果展示实际使用的 references、角色、warnings 和 hash。任何参考 URL、顺序、角色、lineage、Skill、prompt、模式、编译模型或相关参数变化都会清除旧编译结果。

Provider 不兼容时在 UI 显示 typed error 并禁用运行，但仍允许用户预览并复制多参编译提示词。

## 安全与限制

- 只读取显式参考资产；不执行 Skill 中的脚本、hooks、tools、MCP 或 Agent。
- 继续使用现有 URL/path allow-list、引用大小限制和模型视觉能力检查。
- 不接受 `file://` 或外部未允许的本地路径作为浏览器资产。
- 参考数量、字节数和 lineage 都在客户端、路由和编译器边界分别校验。

## 验证计划

### 单元/模型

- 9 张图片按顺序、角色、lineage 全部进入 compiler request；第 10 张返回 `REFERENCE_LIMIT_EXCEEDED`。
- 角色变化、重排、asset lineage 变化都会产生不同 hash；相同清单重复编译命中 cache。
- H3 五种子模式提示与 canonical mode 映射正确，其他 Skill 不会绕过校验。
- 编译器可在没有视频 Provider 的情况下完成多参 prompt preview。

### 路由/Provider

- `/api/generate` 编译成功后，最终请求仍包含全部参考，不只保留第一张。
- 多图消息 Provider、显式数组 Provider、单图 Provider 和 Comfy 显式 mapping 分别覆盖成功/失败路径。
- Provider 不支持或 mapping 缺失时，provider/task 调用计数均为零。
- `source_asset_ids` 在编译审计、结果和下游 asset provenance 中保持完整。

### UI/回归

- GenerateNode payload、排序、角色持久化、旧节点迁移和立即失效。
- 无 Skill 和单图请求保持现有快照/行为。
- 小说/MCP/Agent 范围搜索无 Skill 接入。
- H3 acceptance harness 支持多个本地 image asset id；默认仍 skip，live 只在显式 flag 和配置齐全时运行。

