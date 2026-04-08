# TASKS.md

## 接下来干什么（优先级）

## P0（当前冲刺）

- [ ] 统一项目名和包名（建议：`MangaForge Studio`）
- [ ] 补充 GitHub 首页 README（定位、特性、快速开始、路线图）
- [ ] 加入项目截图/GIF（UI v5）
- [ ] 补齐 `start-ui` 的停止脚本（stop-ui）

## P1（可交付强化）

- [ ] UI 添加 Release Ready 统计总览（READY 数量）
- [ ] 模板导入/导出 JSON（团队共享）
- [ ] 为 `manga:release-check` 增加更多断言（文件非空、结构校验）

## P2（智能增强）

- [ ] PromptPack 读取角色卡锚点，提升角色一致性
- [ ] DialoguePolishTool（对白风格校验）
- [ ] PlotBeat 支持可配置结构模板（3幕/5幕/自定义）

## P3（工程化）

- [ ] 引入 CI：PR 自动跑 `manga:release-check`
- [ ] 增加单元测试（services 层）
- [ ] 增加端到端回归测试（UI + API）

## 当前建议下一步（立刻可做）

1. 完成 README（GitHub 对外可读）
2. 完成 stop-ui 脚本
3. 完成模板导入/导出
