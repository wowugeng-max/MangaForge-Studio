# 小说工作台资产关系图谱设计

## 背景

设定资产已经能存角色、能力、境界、物品、势力、地点、剧情线、伏笔和章节调用，但每个资产仍主要以独立卡片存在。用户点开主角时，看不到年龄、能力、功法/境界、角色关系、势力关系、剧情线关系和这些关系在第几章开始、如何变化。这样会限制自动化写作：模型不能可靠判断哪些资产应该一起进入任务书，也不能检查关系是否合理。

## 外部参考

本轮用 GitHub API 搜索了开源小说/写作工具：

- `vkbo/novelWriter`：成熟开源小说编辑器，核心价值是文档结构、索引和标签引用，提示我们关系图不能脱离正文与章节结构。
- `andreafeccomandi/bibisco`：强调角色发展、章节组织、地点和写作结构，提示我们资产详情必须从“角色档案”扩展到“角色与世界/情节的关联档案”。
- `a-omukai/Writingway`：描述里包含动态上下文管理和 worldbuilding compendium，提示我们关系图要服务生成上下文，而不是只做浏览。
- `akarshkashyap4-ui/NovelWriter` 与 `denmurray10/Story-timeline-builder`：都明确提到 relationship mapping / character relationship mapping，提示我们需要可视化关系、时间线和 AI 分析结合。

这些参考共同指向一个结论：MangaForge 不应该只做静态人物关系图，而应该把关系作为“章节生成上下文、状态回填、合理性诊断”的中间层。

## 目标

- 在设定资产页提供资产级关系图谱，覆盖角色、能力、境界、物品、势力、地点、剧情线、伏笔和章节。
- 点选任意资产时，能看到它的结构化档案和相关资产，不再是孤立卡片；角色档案要优先展示年龄、技能/能力、功法、境界、势力和剧情线。
- 从已有字段自动推断关系：`related_entity_ids`、`related_character_ids`、`related_chapter_ids`、`state_json`、`constraints_json`、`payload_json`、章节调用记录、角色卡能力/关系。
- 给出基础诊断：孤立关键资产、能力缺拥有者、关系缺开始章节、引用不存在的资产。
- 给出关系合理性诊断：关系开始时间早于资产登场、能力拥有者与角色能力列表冲突、关系缺少可追踪开始章节。
- 关系边保留状态变化时间线，章节调用的 expected/actual state change 不能只停留在章节记录里。
- 设计成后端图谱模型，前端只负责展示，后续可直接接入模型分析和上下文包生成。

## 非目标

- 第一版不做关系拖拽后自动保存。
- 第一版不新增独立数据库表；先复用现有 JSON 字段和章节调用记录，避免迁移风险。
- 第一版不要求模型自动重写全部资产，只提供本地推断和诊断入口。

## 数据模型

新增一个派生图谱响应，不改变现有持久化结构：

```ts
type SettingRelationshipGraph = {
  nodes: SettingRelationshipNode[]
  edges: SettingRelationshipEdge[]
  diagnostics: SettingRelationshipDiagnostic[]
  summary: {
    node_count: number
    edge_count: number
    isolated_key_asset_count: number
    missing_owner_count: number
    missing_start_chapter_count: number
  }
}
```

节点来源：

- `setting_entities` 生成资产节点。
- `characters` 生成角色卡补充信息，但不重复生成第二套主节点；通过 `related_character_ids` 或同名匹配并入资产节点。
- `chapters` 只在被 `related_chapter_ids` 或章节调用命中时生成章节节点。

边来源：

- `related_entity_ids` 生成 `related` 边。
- 角色资产到能力、境界、势力、物品：从 `state_json.abilities`、`state_json.realm`、`state_json.faction`、`relationships` 等字段按名称匹配资产。
- 能力/物品到拥有者：从 `state_json.owner`、`payload_json.owner`、`constraints_json.owner_rule` 按名称匹配角色资产。
- 剧情线/伏笔到角色或势力：从 `payload_json.related_characters`、`payload_json.related_factions`、`related_entity_ids` 推断。
- 章节调用记录生成资产到章节的 `used_in_chapter`、`advanced_in_chapter`、`planted_in_chapter`、`paid_off_in_chapter` 等边。

边必须携带：

- `relation_type`
- `label`
- `confidence`: `explicit | inferred | usage`
- `start_chapter_no`
- `state`: 从当前状态或章节调用状态变化中提取
- `state_changes`: 关系在章节中的变化记录，包括章节号、调用类型、揭示级别、预期变化、实际变化
- `status`: 当前关系状态，例如信任建立、敌对、归属确认
- `evidence`: 说明来自哪个字段

## UI 设计

在“设定资产”工作区的统计卡下、设定工坊列表上方新增“资产关系图谱”面板。

面板结构：

- 左侧为 ReactFlow 关系图，可拖动节点、缩放和框选。
- 顶部为筛选：全部、角色中心、剧情线、风险。
- 顶部提供资产定位下拉，适合在大图里快速跳到主角、关键能力或剧情线。
- 右侧为选中资产档案：
  - 基础信息：类型、状态、可见性、初登/末次。
  - 角色信息：年龄、境界、技能/能力、功法、所属势力、关系摘要。
  - 生成相关：关联剧情线、关联章节、禁揭/约束、当前状态。
  - 关系时间线：开始章节、关系状态、章节调用产生的状态变化。
  - 合理性诊断：缺拥有者、孤立、关系缺起始章节、引用缺失、时间冲突、归属冲突。

## 后端接口

新增：

```http
GET /api/novel/projects/:id/settings/relationship-graph
```

响应为图谱模型。接口只读，不改变资产。

## 验收标准

- 设定资产页能看到资产关系图谱，不需要先进入全书一致性图谱。
- 主角或任意角色资产被点选后，右侧档案能展示其年龄/境界/技能或能力/功法/势力/剧情线/章节关系中已有的数据。
- 能力若没有拥有者，会出现在诊断中。
- `related_entity_ids` 指向不存在资产时，会出现在诊断中。
- 有章节调用的资产，会连到对应章节节点，并标明调用用途。
- 有 expected/actual 状态变化的章节调用，会在选中资产详情中显示状态变化记录。
- 关系开始时间早于任一资产登场时间时，会给出时间冲突诊断。
- 能力声明拥有者与其他角色能力列表冲突时，会给出归属冲突诊断。
- 前端图谱为空时有清晰空状态，不影响原设定工坊列表。
