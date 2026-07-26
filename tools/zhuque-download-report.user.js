// ==UserScript==
// @name         朱雀AI检测 - 真正下载报告
// @namespace    mangaforge-studio
// @version      1.0.0
// @description  把朱雀「下载报告」从打印改成真正下载 HTML/JSON；也可在控制台直接运行本文件主体。
// @match        https://matrix.tencent.com/ai-detect/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * 用法：
 * 1) 在朱雀文本检测结果页打开 DevTools 控制台，整段粘贴运行；
 * 2) 或用 Tampermonkey 安装本脚本后刷新页面。
 *
 * 官网「下载报告」实际实现：
 *   挂载 #report-container → iframe.write(html) → contentWindow.print()
 * 所以会跳打印机，而不是下载文件。
 */

(function () {
  "use strict";

  const LABEL_MAP = {
    human: "人工特征",
    suspected_ai: "疑似AI",
    ai: "AI特征",
    unknown: "未标注",
  };

  function classifyClassName(cls) {
    const c = String(cls || "");
    if (/success|human/i.test(c)) return "human";
    if (/warning/i.test(c)) return "suspected_ai";
    if (/danger/i.test(c)) return "ai";
    return "unknown";
  }

  function collectReport() {
    const segs = [];
    document.querySelectorAll("[class*=txt-segmentType]").forEach((el, idx) => {
      const text = el.innerText || "";
      const label = classifyClassName(el.className);
      segs.push({
        index: idx + 1,
        className: String(el.className || ""),
        label,
        label_zh: LABEL_MAP[label] || label,
        text,
        length: text.length,
      });
    });

    // 兼容只剩整盒、没有分段 class 的情况
    if (!segs.length) {
      const box = document.querySelector(".txt-segment-box");
      if (box && box.innerText.trim()) {
        const text = box.innerText;
        segs.push({
          index: 1,
          className: "txt-segment-box",
          label: "unknown",
          label_zh: "未标注",
          text,
          length: text.length,
        });
      }
    }

    const total = segs.reduce((a, s) => a + s.length, 0) || 1;
    const summary = {
      human_chars: segs.filter((s) => s.label === "human").reduce((a, s) => a + s.length, 0),
      suspected_ai_chars: segs
        .filter((s) => s.label === "suspected_ai")
        .reduce((a, s) => a + s.length, 0),
      ai_chars: segs.filter((s) => s.label === "ai").reduce((a, s) => a + s.length, 0),
      unknown_chars: segs.filter((s) => s.label === "unknown").reduce((a, s) => a + s.length, 0),
    };
    const ratios = {
      human: +((summary.human_chars / total) * 100).toFixed(2),
      suspected_ai: +((summary.suspected_ai_chars / total) * 100).toFixed(2),
      ai: +((summary.ai_chars / total) * 100).toFixed(2),
    };

    const alertText = (
      document.querySelector(".el-alert__description")?.innerText ||
      document.querySelector(".el-alert")?.innerText ||
      ""
    )
      .replace(/下载报告/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 尽量从右侧面板读饼图百分比（页面结构会变，失败也不阻塞）
    const rightText = document.querySelector(".card-right")?.innerText || "";
    const piePercents = Array.from(
      new Set((rightText.match(/\d+(?:\.\d+)?%/g) || []).slice(0, 6))
    );

    return {
      tool: "mangaforge-zhuque-download-report",
      version: "1.0.0",
      detectedAt: new Date().toISOString(),
      sourceUrl: location.href,
      alert: alertText,
      piePercentsFromUi: piePercents,
      totalChars: total,
      segmentCount: segs.length,
      summary,
      ratios,
      segments: segs,
    };
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildHtml(report) {
    const color = {
      human: "#67C23A",
      suspected_ai: "#E6A23C",
      ai: "#F56C6C",
      unknown: "#909399",
    };
    const segs = report.segments
      .map(
        (s) => `<div class="seg ${s.label}">
  <div class="seg-h"><b>#${s.index} ${esc(s.label_zh)}</b> · ${s.length}字</div>
  <div class="seg-b">${esc(s.text)}</div>
</div>`
      )
      .join("\n");

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>朱雀AI检测报告 ${esc(report.detectedAt)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:24px;color:#222;line-height:1.65}
  h1{font-size:22px;margin:0 0 8px}
  .note{color:#888;font-size:13px;margin-bottom:16px}
  .meta{background:#f7f8fa;padding:12px 16px;border-radius:8px;margin-bottom:16px}
  .kpis{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 20px}
  .kpi{flex:1;min-width:140px;padding:12px;border-radius:8px;border:1px solid #eee;background:#fff}
  .kpi b{display:block;font-size:22px;margin-top:4px}
  .seg{margin:0 0 10px;padding:10px 12px;border-radius:6px}
  .seg-b{white-space:pre-wrap}
  .human{background:rgba(103,194,58,.12);border-left:4px solid #67C23A}
  .suspected_ai{background:rgba(230,162,60,.12);border-left:4px solid #E6A23C}
  .ai{background:rgba(245,108,108,.12);border-left:4px solid #F56C6C}
  .unknown{background:#f5f5f5;border-left:4px solid #909399}
  @media print {
    body{margin:12mm}
    .no-print{display:none !important}
  }
</style>
</head>
<body>
  <h1>朱雀 AI 检测报告</h1>
  <p class="note">本地脚本导出（非官网 print）。人工=${report.ratios.human}% / 疑似AI=${report.ratios.suspected_ai}% / AI=${report.ratios.ai}%</p>
  <div class="meta">
    <div><b>结论：</b>${esc(report.alert || "（页面未识别到结论文案）")}</div>
    <div><b>检测时间：</b>${esc(report.detectedAt)}</div>
    <div><b>来源：</b>${esc(report.sourceUrl)}</div>
    <div><b>总字数：</b>${report.totalChars}　段落块：${report.segmentCount}</div>
    ${
      report.piePercentsFromUi?.length
        ? `<div><b>页面饼图百分比原文：</b>${esc(report.piePercentsFromUi.join(" / "))}</div>`
        : ""
    }
  </div>
  <div class="kpis">
    <div class="kpi"><span>人工特征</span><b style="color:${color.human}">${report.ratios.human}%</b><small>${report.summary.human_chars} 字</small></div>
    <div class="kpi"><span>疑似AI</span><b style="color:${color.suspected_ai}">${report.ratios.suspected_ai}%</b><small>${report.summary.suspected_ai_chars} 字</small></div>
    <div class="kpi"><span>AI特征</span><b style="color:${color.ai}">${report.ratios.ai}%</b><small>${report.summary.ai_chars} 字</small></div>
  </div>
  <h2>分段标注</h2>
  ${segs || "<p>未找到分段标注节点（请确认已完成检测且页面仍在结果态）</p>"}
</body>
</html>`;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function downloadText(filename, text, mime) {
    downloadBlob(filename, new Blob([text], { type: mime || "text/plain;charset=utf-8" }));
  }

  function stamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  function downloadReportFiles(formats) {
    const report = collectReport();
    if (!report.segmentCount) {
      console.warn("[zhuque-download] 未提取到结果分段。请先完成检测，保持结果页再运行。");
      alert("未提取到朱雀结果分段。请先点「立即检测」并等结果出来后再下载。");
      return report;
    }
    const base = `zhuque-report_${stamp()}`;
    const want = new Set(formats || ["html", "json"]);
    if (want.has("json")) {
      downloadText(`${base}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
    }
    if (want.has("html")) {
      downloadText(`${base}.html`, buildHtml(report), "text/html;charset=utf-8");
    }
    if (want.has("md")) {
      const md = [
        `# 朱雀 AI 检测报告`,
        ``,
        `- 结论：${report.alert || ""}`,
        `- 时间：${report.detectedAt}`,
        `- 人工特征：${report.ratios.human}% (${report.summary.human_chars}字)`,
        `- 疑似AI：${report.ratios.suspected_ai}% (${report.summary.suspected_ai_chars}字)`,
        `- AI特征：${report.ratios.ai}% (${report.summary.ai_chars}字)`,
        ``,
        `## 分段`,
        ...report.segments.map(
          (s) => `### #${s.index} ${s.label_zh} (${s.length}字)\n\n${s.text}\n`
        ),
      ].join("\n");
      downloadText(`${base}.md`, md, "text/markdown;charset=utf-8");
    }
    console.log("[zhuque-download] exported", report.ratios, report);
    return report;
  }

  function patchOfficialDownloadButtons() {
    // 拦截官网「下载报告」点击，改为真实下载
    const handler = (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      const hit = t.closest("a.download-link, .download-link, button#html, [class*=download]");
      if (!hit) return;
      const text = (hit.textContent || "").trim();
      const isDownload =
        text.includes("下载报告") ||
        hit.classList.contains("download-link") ||
        hit.id === "html" ||
        hit.querySelector?.(".el-icon-download");
      if (!isDownload) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
      downloadReportFiles(["html", "json"]);
    };
    document.addEventListener("click", handler, true);

    // 把 iframe print 也拦掉，避免误触发打印机
    try {
      const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow");
      // 不硬改原型；改为包装 print 调用点较难。这里用 MutationObserver 清理动态 print iframe。
    } catch (_) {}

    // 覆盖 window.print：如果是我们没发起的 print，直接吞掉并提示
    try {
      const originalPrint = window.print.bind(window);
      window.print = function patchedPrint() {
        console.warn("[zhuque-download] 拦截 window.print()。请用脚本下载 HTML/JSON。");
        // 不调用 originalPrint，避免跳打印机
      };
      window.__zhuqueOriginalPrint = originalPrint;
    } catch (e) {
      console.warn("[zhuque-download] 无法覆盖 window.print（页面可能冻结了 window）", e);
    }

    return handler;
  }

  function ensureFloatingButton() {
    if (document.getElementById("mf-zhuque-download-fab")) return;
    const btn = document.createElement("button");
    btn.id = "mf-zhuque-download-fab";
    btn.textContent = "真正下载报告";
    btn.title = "导出 HTML + JSON（不走打印机）";
    Object.assign(btn.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      zIndex: "2147483646",
      padding: "10px 14px",
      borderRadius: "999px",
      border: "none",
      background: "linear-gradient(135deg,#3b82f6,#2563eb)",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow: "0 8px 24px rgba(37,99,235,.35)",
      cursor: "pointer",
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      downloadReportFiles(["html", "json"]);
    });
    document.body.appendChild(btn);
  }

  // 对外 API
  window.ZhuqueReportDownloader = {
    collect: collectReport,
    download: downloadReportFiles,
    downloadHtml: () => downloadReportFiles(["html"]),
    downloadJson: () => downloadReportFiles(["json"]),
    downloadAll: () => downloadReportFiles(["html", "json", "md"]),
  };

  patchOfficialDownloadButtons();
  ensureFloatingButton();

  console.log(
    "%c[zhuque-download] ready",
    "color:#2563eb;font-weight:bold",
    "可用：ZhuqueReportDownloader.downloadAll() / 点击右下角按钮 / 点击官网「下载报告」"
  );
})();
