# 小说引擎进度日志 v0.1

> 说明：本文件用于记录小说引擎的实际落地进度、验证结果和下一步动作。它与 `novel-roadmap-008-implementation-order.md` 配合使用，确保开发过程完整、可追溯。

---

## 2026-04-23

### 已完成
- 完成小说规划设计文档链（001~008）
- 将实现顺序从纯规划升级为“按阶段迭代的执行顺序”
- 在后端接入小说项目、世界观、角色、大纲、章节、运行记录的数据层和 CRUD
- 在前端 `NovelStudio` 中接入多面板工作台
- 补齐世界观 / 角色 / 大纲 / 章节 / 运行历史的展示能力
- 为世界观 / 角色 / 大纲 / 章节增加新增/编辑弹窗
- 将小说路由接入实际运行中的 `ui/server` Express 服务

### 验证结果
- `GET /api/novel/projects` 可用
- `POST /api/novel/projects` 可用
- `GET /api/novel/projects/:id/worldbuilding` 可用
- `GET /api/novel/projects/:id/characters` 可用
- `GET /api/novel/projects/:id/outlines` 可用
- `GET /api/novel/projects/:id/chapters` 可用
- `GET /api/novel/runs?project_id=:id` 可用
- `POST /api/novel/plan` 可用，并会写入运行记录

### 仍待推进
- 总纲 → 卷纲 → 章纲的层级扩展
- 章节链与续写机制
- 连续性 / 审校系统
- 市场偏好信号接入
- 分镜与画布联动

### 下一步动作
1. 设计并实现多层级大纲树
2. 增加卷纲与章纲的创建 / 展示 / 关联能力
3. 让 `plan` 输出由“单次种子生成”升级为“树状结构生成”

---

## 记录原则

- 每次实际落地一个可验证能力，就追加一条日志
- 每条日志至少包含：已完成、验证结果、仍待推进、下一步动作
- 日志内容应能与代码提交和 roadmap 顺序一一对应
