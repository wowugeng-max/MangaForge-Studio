# Workspace 结构草案

## 目标

所有项目数据、资产、章节、运行历史和导出产物统一落在一个 workspace 规范中，避免前端与后端写入不同目录。

---

## 推荐结构

```text
workspace/
└── proj_001/
    ├── project.json
    ├── series.yaml
    ├── style-guide.md
    ├── assets/
    ├── canvas/
    ├── episodes/
    ├── templates/
    ├── runs/
    └── logs/
```

---

## 目录职责

### `project.json`
项目元信息。

### `series.yaml`
系列设定 / 宇宙设定 / 角色设定的主源文件。

### `style-guide.md`
风格指南。

### `assets/`
资产文件夹，包含图片、视频、提示词、工作流等资源。

### `canvas/`
画布状态与工作流保存。

### `episodes/`
章节级产物目录。

### `templates/`
模板导入导出内容。

### `runs/`
运行历史与每次 pipeline 的结果记录。

### `logs/`
调试日志、错误日志、执行日志。

---

## 章节文件建议命名

```text
episodes/
├── ep-001.episode.json
├── ep-001.storyboard.json
├── ep-001.prompts.json
├── ep-001.prompts.md
├── ep-001.export.json
├── ep-001.export.md
├── ep-001.export.csv
└── ep-001.export.zip
```

---

## 统一原则

- 前端只通过 API 访问 workspace
- restored-src 只通过统一约定写 workspace
- 不允许多套数据目录并存

---

## 待确认项

- workspace 根路径放在仓库根目录还是用户目录
- 是否允许多 workspace 切换
- 是否需要项目级 metadata 索引文件
