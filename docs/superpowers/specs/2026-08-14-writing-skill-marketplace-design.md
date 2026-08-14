# 写作 Skill 市场：GitHub 安装与卸载 设计

日期：2026-08-14
状态：已确认（用户批准）
前置：`2026-08-13-writing-skill-full-pass-design.md`（顺序全章 pass、v2 回执、skill 模型）

## 目标

把「去 AI 味写作 skill」区块做成和画布工作台一样的可扩展市场：

- 从公开 GitHub 仓库安装新的写作 skill；
- 测试效果不好的安装包可以卸载；
- 内置三个 skill（fiction-humanizer-zh / remove-ai-flavor / humanizer-zh）保持现状，不可卸载，只能开关。

## 已确认的决策

1. **内置不可卸载**：内置 skill 有专属逻辑（精修/重写模式、humanizer 安全套、灵魂泄漏门闩），只能启用/停用；只有 GitHub 安装包可卸载。
2. **工作区全局安装**：安装包对全工作区可见；启用开关仍是项目级（`project.reference_config.writing_skills.enabled`，key 为 skill id）。
3. **固定顺序**：内置按现有固定序在前，安装包按 `installed_at` 升序排在后。不做手动排序。
4. **来源格式**：仅 `https://github.com/{owner}/{repo}`（可带 `.git`），仓库根目录必须有 `SKILL.md`，可选 `references/*.md`。锁定安装时的 HEAD revision。

## 磁盘布局（磁盘即注册表，无数据库表）

```
{workspace}/.mangaforge/writing-skill-packs/{id}/
  pack.json        # { id, source_url, owner, repo, revision, installed_at, name, description }
  SKILL.md
  references/*.md  # 可选
```

- `id` = 仓库名小写规范化，限 `[a-z0-9][a-z0-9-]{0,63}`；与内置 id 或既有安装 id 冲突的处理见 API 节。
- `name`/`description` 取自 SKILL.md 的 YAML frontmatter；缺失时 name 用仓库名，description 为空。
- 写入必须原子（临时目录 + rename），与画布安装器一致。

## 服务端

### 新模块（`ui/server/src/novel-writing/writing-skills/`）

- `installed-store.ts`：扫描/读取已安装包。带内存缓存，按目录 mtime 失效。读取时执行边界校验（超限包跳过并在日志警告，不进目录）。
- `install-github.ts`：安装流程——URL 校验（仅 github.com 公开仓库，无路径/查询/认证/端口）→ 通过 GitHub API（或 codeload 跳转兜底）解析 HEAD sha → 下载 `codeload.github.com/{owner}/{repo}/zip/{sha}` → 只提取根 `SKILL.md` 和 `references/*.md` → 原子落盘。路径穿越/符号链接拒绝。通用的路径安全校验优先复用 `ui/server/src/skills/path-safety.ts` 中已有的通用帮助函数（仅 import 帮助函数，安装器本体与画布完全分离；不把写作 skill 注册进画布安装器，反之亦然）。
- 同一仓库重复安装：revision 相同则幂等返回；revision 不同则整目录替换为新 revision（更新语义）。

### 大小与数量上限（对齐画布）

| 项 | 上限 |
| --- | --- |
| zip 归档 | 128 MiB |
| SKILL.md | 256 KiB |
| 单个 reference | 512 KiB |
| references 数量 | 8 个 |
| references 总量 | 2 MiB |
| 提取总量 | 4 MiB（写作 skill 只有 markdown，无需画布的 20 MiB） |

### API（新路由文件 `ui/server/src/routes/novel-writing-skill-routes.ts`）

- `GET /api/novel/writing-skills/catalog`
  → `{ ok, skills: [{ id, label, description, builtin, supports_mode, revision?, source_url?, installed_at? }] }`
  内置在前（固定序），安装包按 installed_at 升序。`supports_mode` 仅 `fiction-humanizer-zh` 为 true。
- `POST /api/novel/writing-skills/install`，body `{ url }`
  → 成功 `{ ok, skill }`；失败 400/502 带错误码：`INVALID_URL`、`ID_CONFLICT_BUILTIN`、`SKILL_MD_MISSING`、`BOUNDS_EXCEEDED`、`DOWNLOAD_FAILED`。
- `DELETE /api/novel/writing-skills/:id`
  → 安装包：删除目录，`{ ok }`；内置 id：400 `BUILTIN_NOT_REMOVABLE`；不存在：404。
  卸载**不**修改任何项目配置；项目 enabled 里的陈旧 id 由 resolve 静默过滤。

### 注册表与运行时改造

- `WritingSkillId` 从字面量联合放宽为 `string`；内置字面量保留为常量，专属逻辑（模式、套、门闩）仍按字面量 id 绑定。
- `resolveWritingSkillsEnabled` 接受动态 id：enabled map = 内置默认值 + 项目配置 + 生成覆盖，安装包**默认关闭**；`ids` 输出顺序 = 内置固定序 → 安装包 installed_at 序；未知/已卸载 id 过滤。resolve 需要注入已安装目录（参数传入，避免在纯函数里做 IO；调用方从 installed-store 取）。
- `compile-pass-prompt`：安装包走通用路径——去 frontmatter 的全量 SKILL.md + 全部 references（按文件名排序）；不注入模式行与安全套。
- 进度标签：安装包用 pack `name`（服务端从磁盘重算；`revision-run-view` 对安装包 id 校验存在性后用重算的 name，长度截断，不信任存储值）。
- v2 回执结构不变（pass id 为 string）；存储归一化的 id 校验放宽为「有界字符串」。

## 前端

- `writingSkillsModel.ts`：目录改为从 `GET catalog` 水合；内置三项保留硬编码兜底（接口失败时 UI 仍可用）。
- `ProjectSettingsModal` 「去 AI 味写作 skill」区块：
  - 列出全部 skill：开关 + 名称 + 描述；安装包一行多一个「卸载」按钮（Popconfirm 确认），并显示锁定的 revision 短 sha；
  - 底部「从 GitHub 安装」：URL 输入框 + 安装按钮（仿画布工作台 UX），装完刷新目录；
  - 精修/重写 Select 与写作 skill 模型 Select 保持现状。
- 生成条开关：同一 catalog 渲染（内置 + 已安装），临时覆盖语义不变。

## 失败与安全

- 仅公开 github.com；锁定 revision，之后不自动更新。
- 只提取 markdown，永不执行任何脚本；SKILL.md 内容进入提示词属用户自选风险，与内置同级。
- 安装/卸载并发：安装用临时目录 + 原子 rename；卸载用 rename 到临时目录再删除。
- 运行中卸载：runner 在 pass 开始时读取不到该 skill 即按「未启用」跳过（resolve 阶段已过滤）；已在跑的 pass 使用内存中已读文本，不受影响。

## 测试

- install-github：URL 校验矩阵、sha 解析、zip 提取（路径穿越/符号链接/超限拒绝）、幂等与更新、原子性（mock fetch/zip fixture）。
- installed-store：扫描、缓存失效、坏包跳过。
- resolve：动态 id 顺序、默认关闭、陈旧 id 过滤。
- compile：安装包通用编译（frontmatter 去除、references 注入）。
- 路由：catalog 合并顺序、install 错误码、delete 内置拒绝/成功。
- runner：安装 skill 参与顺序执行与回执。
- web：model 水合与兜底、modal 安装/卸载交互（源码级测试，沿用现有风格）。

## 非目标

- 私有仓库 / 认证下载；
- skill 内脚本、agents、工具执行（只取 markdown）；
- 手动排序；
- 安装包的自动更新检查；
- 改动画布安装器本身。
