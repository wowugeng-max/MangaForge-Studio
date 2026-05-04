# 小说引擎后端落地计划 v0.1

## 目标

将小说引擎作为一个独立但可与现有系统协同的后端能力逐步落地，最终接入：

- 前端小说工作台
- 多 agent 协作
- 章节与长篇状态管理
- 小说到分镜转换
- 漫剧生产链路

---

## 推荐分阶段实施

### Phase 1：规划与数据结构
目标：先把小说引擎当成一个“作品管理系统”。

需要实现：
- 小说项目 CRUD
- 世界观状态存储
- 角色状态存储
- 大纲状态存储
- 章节状态存储
- 生成历史记录

### Phase 2：coordinator + worker 骨架
目标：先复用 `restored-src` 的多 agent 思路，不急于生成完整正文。

需要实现：
- 小说总控 coordinator
- 规划 worker
- 大纲 worker
- 章节 worker
- 审校 worker
- 结果汇总与持久化

### Phase 3：大纲 / 章节生成
目标：稳定产出结构化内容。

需要实现：
- 题材分析
- 作品定位
- 总纲 / 卷纲 / 章纲生成
- 章节细纲生成
- 章节正文草稿生成

### Phase 4：连续性与长篇支持
目标：支撑百万字级别长篇。

需要实现：
- 角色状态机
- 时间线管理
- 伏笔栈 / 回收机制
- 历史摘要压缩
- 章节续写接口

### Phase 5：市场吸收与分镜输出
目标：把小说能力与漫剧生产接起来。

需要实现：
- 热门题材分析
- 结构模式归纳
- 节奏/爆点模板
- 小说章节转场景
- 场景转分镜结构

---

## 建议的后端目录

```text
ui/server/
├── api/
│   └── novel.py
├── backend/
│   ├── novel/
│   │   ├── coordinator.py
│   │   ├── market_analysis.py
│   │   ├── worldbuilding.py
│   │   ├── characters.py
│   │   ├── outline.py
│   │   ├── chapters.py
│   │   ├── continuity.py
│   │   ├── storyboard.py
│   │   └── schemas.py
│   ├── services/
│   │   └── restored_adapter.py
│   └── storage/
│       └── novel_store.py
```

---

## 数据持久化建议

### 项目表
存储：
- 标题
- 题材
- 长度目标
- 风格
- 商业标签

### 世界观表
存储：
- 设定摘要
- 规则
- 势力
- 时间线

### 角色表
存储：
- 角色卡
- 当前状态
- 关系图

### 大纲表
存储：
- 总纲
- 卷纲
- 章纲

### 章节表
存储：
- 章节目标
- 冲突
- 结果
- 结尾钩子
- 分镜输入

### 运行历史表
存储：
- 执行步骤
- 耗时
- 失败原因
- 版本号

---

## 与 restored-src 的结合方式

### 借鉴其 coordinator 模式
- 一个总控调度多个 worker
- worker 返回结构化结果
- 支持继续、停止、恢复

### 小说引擎里对应为
- 主 coordinator：小说总编
- worker：世界观 / 角色 / 大纲 / 章节 / 审校
- task：具体的生成或修订任务
- history：作品创作历史

---

## 推荐 API 草案

### 作品
- `GET /api/novel/projects`
- `POST /api/novel/projects`
- `GET /api/novel/projects/:id`
- `PUT /api/novel/projects/:id`
- `DELETE /api/novel/projects/:id`

### 规划
- `POST /api/novel/analyze-market`
- `POST /api/novel/plan`
- `POST /api/novel/worldbuild`
- `POST /api/novel/characters`
- `POST /api/novel/outline`

### 章节
- `POST /api/novel/chapter`
- `POST /api/novel/chapter/revise`
- `POST /api/novel/chapter/continue`

### 审校与输出
- `POST /api/novel/review`
- `POST /api/novel/storyboard`
- `POST /api/novel/export`

---

## 实施优先级

### P0
- 项目结构与存储
- coordinator 骨架
- 作品 / 世界观 / 角色 CRUD

### P1
- 大纲生成
- 章节生成
- 审校与一致性检查

### P2
- 市场分析
- 分镜输出
- 漫剧衔接

---

## 记录原则

后续每次实现都应记录：
- 做了什么
- 影响了什么模块
- 有哪些接口变化
- 如何验证
- 是否影响后续链路

这样方便回溯整个小说引擎的演进过程。
