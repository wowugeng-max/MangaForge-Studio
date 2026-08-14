# 写作 Skill 去 AI 味合成轮（2026-08-13）

> 已被 `2026-08-13-writing-skill-full-pass-design.md` 取代：不再使用一轮合成、轻改、±15%、切 1800 字、指纹一票否决。开关位置与非目标仍有效。

## 目标

在现有指纹检测 + humanize 之后，再加一层可独立开关的写作 skill 合成改写，降低小说正文的 AI 味。三个 skill 必须能单独开/关，后续加 skill 只新增模块和开关。

## 已确认决策

- 做法：小说侧 writing-skill 注册表 + **一轮合成 LLM 改写**（不开每 skill 一轮，不走画布 skill 安装器）。
- 规则固化进仓库，运行时不拉 GitHub。
- 开关：项目默认 + 本次生成可覆盖。编辑修订只读项目默认，不接受本次生成覆盖。
- 生成流水线：`草稿 → 主编/网感润色 → 现有 humanize → 写作 skill 合成轮（至少一个开启时）→ 质检入库`。
- 修订流水线：`修订候选准入 → 写作 skill 合成轮（项目默认）→ 保存 → 质检`。合成轮在准入 checkpoint 写入前改候选，避免冻结候选身份。失败回退已准入修订正文，不挡保存。
- 合成轮失败：回退上一版正文，不挡入库。
- 默认：`fiction-humanizer-zh` 开，`remove-ai-flavor` 开，`humanizer-zh` 关。
- `humanizer-zh` 开启时必须套小说安全合同：不改主线、不编经历、不用作者第一人称“灵魂”。
- 现有指纹合同、deslop、humanize、`sanitizeRemoveAiFlavorShells` 保留。指纹继续当检测，不再当唯一去 AI 味手段。

## 配置

```
project.reference_config.writing_skills.enabled = {
  "fiction-humanizer-zh": true,
  "remove-ai-flavor": true,
  "humanizer-zh": false
}
```

生成请求可带 `writing_skills.enabled` 覆盖本次。未知 id 忽略。缺省键沿用上一层。

## 合成轮门闩

- 长度：相对上一版约 ±15%，禁止塌缩/注水。
- 连续性：复用现有 opening continuity 选择器。
- 指纹：复用 `selectFingerprintSafeProse`；不通过则回退。
- `humanizer-zh` 开启时：若候选新引入作者灵魂句（如“我真的不知道该怎么看待”），回退。

## 非目标

- 不改标准章服务端字数目标 4200。
- 不把这三个 skill 装进 `ui/server/src/skills` 画布安装器。
- 不新增 `ChapterTaskStage` 枚举（LLM 调用复用 `humanize` / `humanize_prose`；进度事件用 `writing_skill_humanize`）。
