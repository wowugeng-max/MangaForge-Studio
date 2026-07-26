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
# 全题材扩库（默认每题材 10 本 × 3 免费章）
BOOKS_PER_GENRE=10 FREE_CHAPTERS_PER_BOOK=3 bun scripts/build-qidian-fingerprint-lib.ts

# 只扩某几个题材
ONLY_GENRES=urban,suspense,xianxia BOOKS_PER_GENRE=12 bun scripts/build-qidian-fingerprint-lib.ts
```

## 使用
- 全局写作门禁用 `contracts/active-contract.json`
- 题材特化提示词可读 `contracts/by-genre/<slug>.json` 与 `meta/prompt-directives.txt`
