# 朱雀「真正下载报告」脚本

## 问题原因

官网「下载报告」并不是下载文件，而是：

1. 挂载隐藏的 `#report-container`
2. 复制 DOM 到临时 `iframe`
3. 调用 `iframe.contentWindow.print()`

所以浏览器会打开打印预览/打印机，而不是保存报告。

## 脚本位置

- `tools/zhuque-download-report.user.js`

## 使用方式

### A. Chrome 控制台（最快）

1. 打开 https://matrix.tencent.com/ai-detect/ai_gen
2. 切到「文本」，粘贴正文，点「立即检测」
3. 等结果出来后，打开 DevTools Console
4. 粘贴 `zhuque-download-report.user.js` 全文并回车
5. 任选其一：
   - 点页面右下角 **真正下载报告**
   - 点官网 **下载报告**（会被拦截并改为真实下载）
   - 控制台执行：
     ```js
     ZhuqueReportDownloader.downloadAll()   // html + json + md
     ZhuqueReportDownloader.downloadHtml()
     ZhuqueReportDownloader.downloadJson()
     ```

### B. Tampermonkey

1. 安装 Tampermonkey
2. 新建脚本，粘贴 `zhuque-download-report.user.js`
3. 保存后刷新朱雀页面

## 导出内容

- **HTML**：结论 + 比例 + 分段着色全文
- **JSON**：结构化 ratios / segments，便于后续对比
- **MD**：可选，`downloadAll()` 会一起导出

分段 class 映射：

| class | 含义 |
|---|---|
| `txt-segmentType-success` | 人工特征 |
| `txt-segmentType-warning` | 疑似 AI |
| `txt-segmentType-danger` | AI 特征 |

## 本次内置浏览器实测（ch1《带温尸体》）

- 人工特征：`0%`
- 疑似 AI：`77.31%`
- AI 特征：`22.69%`
- 结论：未发现明显的人工创作特征

报告已落到：

- `workspace/zhuque-reports/ch1-zhuque-*.html`
- `workspace/zhuque-reports/ch1-zhuque-*.json`
