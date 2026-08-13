# 网文人工指纹库（Fingerprint Library）

## 边界
- **只采集起点免费章节**（分类榜/排行榜作品的免费正文），不抓 VIP/付费章。
- AI 对照样本来自本项目朱雀战役 `zhuque-inputs/`。

## 题材分层（v2）
按 canonical 题材维护，便于扩库与分合同：

| slug | 题材 |
|------|------|
| urban | 都市 |
| xuanhuan | 玄幻 |
| xianxia | 仙侠 |
| scifi | 科幻 |
| suspense | 悬疑 |
| history | 历史 |
| game | 游戏 |
| lightnovel | 轻小说 |
| wuxia | 武侠 |
| fantasy | 奇幻 |
| multiverse | 诸天无限 |
| military | 军事 |

目录：
- `human/<genre_slug>/*.txt` 免费章样章
- `contracts/active-contract.json` 全局合同
- `contracts/by-genre/<genre_slug>.json` 分题材合同（样本≥3时生成）
- `meta/samples-catalog.json` 样本元数据（书名/章节/题材/子类）
- `meta/genre-catalog.json` 书籍题材目录与计数
- `index.json` 全库索引（含向量 + by_genre 计数）

## 构建 / 扩库
```bash
cd ui/server
# 全题材扩库：默认跳过已入库的书，按分类列表翻页补新书
# 默认每题材再抓 10 本 × 3 免费章；不会覆盖已富化的 active-contract.json
BOOKS_PER_GENRE=10 FREE_CHAPTERS_PER_BOOK=3 bun scripts/build-qidian-fingerprint-lib.ts

# 只扩弱题材，并提高每题材新书数
ONLY_GENRES=military,wuxia,multiverse,fantasy,scifi,game \
  BOOKS_PER_GENRE=20 MAX_CATEGORY_PAGES=10 MAX_TOTAL_BOOKS=200 \
  bun scripts/build-qidian-fingerprint-lib.ts
```

扩库完成后，在「指纹合同」页用离线重拟合生成新合同集，不要直接改内置合同。

## 使用
- 全局写作门禁用 `contracts/active-contract.json`
- 题材特化提示词可读 `contracts/by-genre/<slug>.json` 与 `meta/prompt-directives.txt`

## 合同集管理（UI）

前端「指纹合同」页面（`/fingerprint-contracts`）可以：

- 查看全部合同集，切换当前启用的一套，或强制锁定单份合同（绕过题材选择）。
- 触发生成新合同集：
  - **离线重拟合（默认）**：只用 `human/` 下已存样本重新测量并拟合，不联网。散文字段（`prompt_directives` / `avoid` / `prefer` / `narrative_hard`）从内置合同逐条继承 —— 这些是历史富化内容，`buildHumanFingerprintContract` 只能产出精简版，整体重生成会永久丢失。
  - **联网抓取**：页面「开始生成」会在服务端跑 `build-qidian-fingerprint-lib.ts` 扩库（只抓免费章、跳过已入库的书、不覆盖内置合同），成功后再离线拟合一套新合同集留档。
- 查看评分看板：章节入库时自动记录一条 `fingerprint_contract_score` 评审，按合同集聚合均分与 9 项统计指标各自的通过率。

注意：`human/` 下的样本因版权未入库，所以**离线重拟合只能在有样本的机器上进行**；缺样本时页面会标记为不可用。题材合同（`by-genre/`）目前只做数据预留，写作流水线仍统一使用全局合同。
