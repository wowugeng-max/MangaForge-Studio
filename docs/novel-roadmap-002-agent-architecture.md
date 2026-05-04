# 小说引擎多 Agent 架构草案 v0.1

## 目的

借鉴 `restored-src` 中 coordinator / worker / tool 的组织方式，为小说引擎设计一个可扩展的多 Agent 协作架构。

---

## 核心原则

1. **一个总控，多 worker**
   - 主控负责策略、拆解、调度、验收
   - worker 负责子任务执行

2. **任务分层**
   - 规划任务
   - 生成任务
   - 审校任务
   - 归纳任务

3. **状态持久化**
   - 每个 agent 的结果都要落盘
   - 可回放、可追溯、可继续执行

4. **不要让单个模型承担全部责任**
   - 大纲、细纲、正文、校验、市场吸收都要拆开

---

## 推荐 agent 拆分

### 1. Story Coordinator
类似 `restored-src` 的 coordinator。
职责：
- 接收用户需求
- 判断作品长度、题材、风格
- 拆分任务
- 调度其他 agent
- 汇总结果

### 2. Market Analyst Agent
职责：
- 总结热门小说风格
- 提炼市场节奏
- 输出题材策略建议

### 3. Worldbuilding Agent
职责：
- 建立世界观框架
- 定义规则、势力、地图、科技/能力体系

### 4. Character Agent
职责：
- 生成角色卡
- 维护人物关系网
- 追踪角色成长与状态变化

### 5. Outline Agent
职责：
- 生成总纲
- 生成卷纲
- 生成章纲

### 6. Chapter Agent
职责：
- 根据章纲生成细纲
- 生成章节正文草稿
- 控制每章冲突与钩子

### 7. Consistency Agent
职责：
- 检查设定冲突
- 检查时间线
- 检查人物行为一致性
- 检查伏笔回收

### 8. Style Agent
职责：
- 统一文风
- 优化节奏
- 调整叙事镜头感

### 9. Storyboard Agent
职责：
- 将章节切成场景
- 输出可用于分镜的结构化结果

---

## 任务流建议

### 标准流程
1. 用户提出小说需求
2. Coordinator 分析需求
3. Market Analyst 输出策略
4. Worldbuilding / Character 构建基础
5. Outline 产出总纲与卷纲
6. Chapter Agent 按章生成
7. Consistency Agent 审校
8. Style Agent 统一
9. Storyboard Agent 输出分镜结构

---

## 长篇策略

### 分层产出
- 先总纲
- 再卷纲
- 再章纲
- 再场景
- 最后正文

### 记忆策略
- 全局摘要
- 卷摘要
- 章节摘要
- 角色状态摘要
- 伏笔状态摘要

### 续写策略
- 每章结束后写入状态
- 下一章从状态恢复
- 只读取必要摘要，不直接依赖全部正文

---

## 建议的数据对象

### Project
- 作品ID
- 名称
- 题材
- 字数目标
- 风格标签
- 受众标签

### WorldState
- 设定摘要
- 势力图
- 地点图
- 规则表
- 时间线

### CharacterState
- 角色卡
- 当前状态
- 关系变化
- 目标与动机

### OutlineState
- 总纲
- 卷纲
- 章纲
- 场景纲

### ChapterState
- 章节目标
- 冲突
- 结尾钩子
- 分镜切片

### ReviewState
- 设定问题
- 连续性问题
- 风格问题
- 修订建议

---

## 与 `restored-src` 的对照借鉴

### 借鉴点
- coordinator 统一调度
- worker 独立执行
- 工具权限分层
- 任务结果可继续
- 状态 / 历史可追踪

### 迁移到小说引擎的方式
- Coordinator = 小说总编
- Worker = 角色 / 大纲 / 章节 / 审校 agent
- Task = 章节 / 设定 / 修订任务
- Session history = 作品生成历史

---

## UI / 后端映射建议

### UI 页面
- 小说项目大厅
- 作品设定页
- 世界观页
- 角色页
- 大纲页
- 章节页
- 生成日志页
- 分镜输出页

### 后端接口
- `POST /api/novel/projects`
- `GET /api/novel/projects/:id`
- `POST /api/novel/plan`
- `POST /api/novel/generate-outline`
- `POST /api/novel/generate-chapter`
- `POST /api/novel/review`
- `POST /api/novel/storyboard`

---

## 第一版落地顺序

1. 先做小说项目数据结构
2. 再做 coordinator 调度模型
3. 再做大纲 / 角色 / 世界观 agent
4. 再做章节生成与校验
5. 最后接分镜输出

---

## 备注

这个架构是为了长篇与多题材泛化能力，不是为了让一个 prompt 硬扛全部创作。
