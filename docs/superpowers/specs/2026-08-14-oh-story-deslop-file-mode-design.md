# oh-story 去 AI 文件模式

日期：2026-08-14  
状态：已确认（用户批准 B，2026-08-14）  
前置：`2026-08-14-oh-story-core-skill-shell-design.md`

## 目标

`oh-story 去AI` 按上游 `story-deslop` 的文件模式跑完：脚本预检 → 主线程 inline Gate → 复扫 → 标点收尾。不再只做一次 Flash 调用。

## 已确认决策

1. 采用方案 B，不实现 `narrative-writer` 子代理。
2. 只安装 `skills/story-deslop/scripts/*.js`。`tests/`、`demo/`、其他 skill 的 scripts 仍跳过。
3. 必装脚本：`check-ai-patterns.js`、`check-degeneration.js`、`normalize-punctuation.js`。
4. 已装同一 revision 但缺脚本时，重新拉 zip 补齐。
5. 去 AI 至少 1 轮模型；若复扫仍有 blocking，再改，最多 3 轮。
6. 3 轮后仍有 blocking：仍写入最后一版，回执标注剩余项，不拦入库。
7. 朱雀 / 指纹仍只参考。不自动连跑审稿。

## 流水线

1. 把当前章写成套件临时文件。
2. `node check-ai-patterns.js --check --json --fail-on=blocking`
3. 拼提示：SKILL.md + references + 原文 + 脚本预检；主线程 inline，禁止 spawn。
4. 抽取 `### 润色后全文`，写回文件。
5. 复扫 `check-ai-patterns` + `check-degeneration`。还有 blocking 且未满 3 轮 → 回到第 3 步，只带 blocking。
6. `node normalize-punctuation.js <file>`（改文件）。
7. 读文件写入章节，`source: oh_story_deslop`。回执带 `file_mode`、`rounds`、脚本日志。

缺脚本视为套件未装齐，走现有安装重试。
