#!/usr/bin/env python3
"""
playwright-fetch.py — SPA-aware URL fetcher using Playwright + system Chrome.
Supports:
  - fetch-url: fetch a single URL's rendered text
  - fetch-serial: fetch a novel chapter and follow "next chapter" links automatically

Usage:
  python playwright-fetch.py fetch-url --url <url>
  python playwright-fetch.py fetch-serial --url <url> --max-chapters 500 --start-chapter 1
"""

import argparse
import html
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def _launch_browser():
    """Launch Chrome browser via Playwright. Returns (page, browser)."""
    from playwright.sync_api import sync_playwright

    p = sync_playwright().start()

    # Try multiple launch strategies
    browser = None

    # Strategy 1: channel="chrome" — recommended for macOS
    try:
        browser = p.chromium.launch(
            channel="chrome",
            headless=True,
        )
    except Exception:
        pass

    # Strategy 2: executable_path with headless=new
    if not browser:
        chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if os.path.exists(chrome_path):
            try:
                browser = p.chromium.launch(
                    executable_path=chrome_path,
                    headless="new",
                )
            except Exception:
                pass

    # Strategy 3: Try Firefox as fallback
    if not browser:
        try:
            browser = p.firefox.launch(headless=True)
        except Exception:
            pass

    # Strategy 4: Non-headless (for debugging)
    if not browser:
        try:
            chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            browser = p.chromium.launch(
                executable_path=chrome_path,
                headless=False,
            )
        except Exception:
            p.stop()
            raise RuntimeError("Cannot launch any browser. Install Chrome or run: playwright install chromium")

    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )
    page = context.new_page()
    return page, browser, p


def _navigate(page, url: str):
    """Navigate to URL with fallback strategies."""
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)
        return
    except Exception:
        pass
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        return
    except Exception:
        pass
    page.goto(url, timeout=60000)
    page.wait_for_timeout(5000)


def _extract_content_text(page) -> str:
    """Extract novel-readable text from the page, focusing on content areas."""
    # Try common novel site selectors first
    selectors = [
        "div.readcontent",           # 笔趣阁 common
        "div#content",               # 笔趣阁 common
        "div.main_readbox",          # some sites
        "div.booktext",              # some sites
        "article",                    # semantic HTML
        "div.content",                # generic
        "div#chaptercontent",         # some sites
        "div.read-container",         # modern SPAs
        "div.chapter-content",        # modern SPAs
        "main",                       # semantic HTML
        "body",                       # fallback
    ]

    for selector in selectors:
        el = page.query_selector(selector)
        if el:
            text = el.inner_text()
            if text and len(text.strip()) > 50:
                return text

    # Last resort: get body text but try to strip nav/footer
    text = page.inner_text("body")
    return text


def _clean_novel_text(text: str, title: str = "") -> str:
    """Clean up novel chapter text."""
    # Normalize whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    # Remove navigation-like lines at start/end
    nav_keywords = ['上一章', '下一章', '目录', '加入书签', '推荐本书', '投票', '加入书签',
                    '投推荐票', '章节错误', 'TXT下载', '全文阅读', '手机站', '加入书签']
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append('')
            continue
        # Skip short lines that look like navigation
        if len(stripped) < 30 and any(kw in stripped for kw in nav_keywords):
            continue
        cleaned_lines.append(line)

    # Remove trailing nav lines
    while cleaned_lines:
        last = cleaned_lines[-1].strip()
        if len(last) < 30 and any(kw in last for kw in nav_keywords):
            cleaned_lines.pop()
        else:
            break

    result = '\n'.join(cleaned_lines)
    if title:
        result = f"{title}\n\n{result}"
    return result


def _find_next_chapter(page) -> str:
    """Find and return the next chapter URL from the page."""
    # Common next chapter selectors
    selectors = [
        'a:has-text("下一章")',
        'a:has-text("下一页")',
        'a[rel="next"]',
        'a.next-chapter',
        'a:has-text("下章")',
    ]

    for selector in selectors:
        try:
            links = page.query_selector_all(selector)
            for link in links:
                href = link.get_attribute("href")
                if href:
                    if href.lower().strip().startswith("javascript:"):
                        continue
                    if href.startswith('#'):
                        full_url = page.url.split('#')[0].rstrip('/') + href
                        return full_url
                    return urljoin(page.url, href)
        except Exception:
            continue

    # Try clicking "下一章" button and checking URL change
    try:
        next_btn = page.query_selector('a:has-text("下一章")')
        if next_btn:
            current_url = page.url
            next_btn.click()
            page.wait_for_timeout(1500)
            try:
                page.wait_for_url("**/*", timeout=5000)
            except Exception:
                pass
            new_url = page.url
            if new_url != current_url:
                return new_url
    except Exception:
        pass

    return ""


def _find_first_chapter(page) -> str:
    """Find the first readable chapter URL when the current page is a catalog page."""
    selectors = [
        'a.rl',
        'a:has-text("开始阅读")',
        'div.listmain dd a',
        'dd a[href*=".html"]',
        'a[href*=".html"]',
    ]

    chapter_re = re.compile(r'第\s*\d+\s*[章回节]')
    candidates = []
    for selector in selectors:
        try:
            links = page.query_selector_all(selector)
            for link in links:
                href = link.get_attribute("href") or ""
                text = (link.inner_text() or "").strip()
                if not href:
                    continue
                score = 0
                if "开始阅读" in text or "开始阅读" in selector:
                    score += 100
                if chapter_re.search(text):
                    score += 80
                if re.search(r'/\d+\.html$', href) or re.search(r'(^|/)\d+\.html$', href):
                    score += 20
                if score > 0:
                    candidates.append((score, urljoin(page.url, href), text))
        except Exception:
            continue

    if not candidates:
        return ""
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def _derive_numbered_chapter_url(chapter_url: str, target_chapter: int) -> str:
    """Derive chapter URL by replacing a trailing numeric chapter filename."""
    if target_chapter <= 1:
        return chapter_url
    match = re.search(r'(.*/)(\d+)(\.html(?:[?#].*)?)$', chapter_url)
    if not match:
        return ""
    return f"{match.group(1)}{target_chapter}{match.group(3)}"


def _find_chapter_by_number(page, target_chapter: int) -> str:
    """Find an exact chapter URL from a catalog page by chapter number."""
    if target_chapter <= 1:
        return _find_first_chapter(page)

    selectors = [
        'div.listmain dd a',
        'dd a[href*=".html"]',
        'a[href*=".html"]',
        'a[href*="#/book/"]',
        'a',
    ]
    exact_title_re = re.compile(rf'第\s*{target_chapter}\s*[章回节]')
    href_re = re.compile(rf'(^|/){target_chapter}\.html(?:$|[?#])')
    candidates = []

    for selector in selectors:
        try:
            links = page.query_selector_all(selector)
            for link in links:
                href = link.get_attribute("href") or ""
                text = (link.inner_text() or "").strip()
                if not href:
                    continue
                score = 0
                if exact_title_re.search(text):
                    score += 100
                if href_re.search(href):
                    score += 80
                if score > 0:
                    candidates.append((score, urljoin(page.url, href), text))
        except Exception:
            continue

    if not candidates:
        first_url = _find_first_chapter(page)
        return _derive_numbered_chapter_url(first_url, target_chapter) if first_url else ""

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def _extract_catalog_chapters(page) -> list:
    """Extract numbered chapter links from a catalog/list page."""
    selectors = [
        'div.listmain dd a',
        'dd a[href*=".html"]',
        'a[href*=".html"]',
        'a[href*="#/book/"]',
        'a',
    ]
    title_re = re.compile(r'第\s*(\d+)\s*[章回节]')
    href_re = re.compile(r'(^|/)(\d+)\.html(?:$|[?#])')
    chapters = {}

    for selector in selectors:
        try:
            links = page.query_selector_all(selector)
            for link in links:
                href = link.get_attribute("href") or ""
                text = (link.inner_text() or "").strip()
                if not href:
                    continue
                title_match = title_re.search(text)
                href_match = href_re.search(href)
                chapter_no = int(title_match.group(1)) if title_match else int(href_match.group(2)) if href_match else 0
                if chapter_no <= 0:
                    continue
                full_url = urljoin(page.url, href)
                previous = chapters.get(chapter_no)
                if not previous or len(text) > len(previous["title"]):
                    chapters[chapter_no] = {
                        "chapter": chapter_no,
                        "title": text or f"第{chapter_no}章",
                        "url": full_url,
                    }
        except Exception:
            continue

    return [chapters[key] for key in sorted(chapters)]


def _html_to_text(raw_html: str) -> str:
    text = re.sub(r'(?is)<script[^>]*>.*?</script>', '\n', raw_html)
    text = re.sub(r'(?is)<style[^>]*>.*?</style>', '\n', text)
    text = re.sub(r'(?i)<br\s*/?>', '\n', text)
    text = re.sub(r'(?i)</p\s*>', '\n', text)
    text = re.sub(r'(?i)</div\s*>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'\r', '', text)
    text = re.sub(r'[ \t\xa0]+', ' ', text)
    text = re.sub(r'\n[ \t]+', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _extract_static_content(raw_html: str) -> str:
    selectors = [
        r'<div[^>]+id=["\']content["\'][^>]*>(.*?)</div>',
        r'<div[^>]+class=["\'][^"\']*(?:readcontent|chapter-content|booktext|content)[^"\']*["\'][^>]*>(.*?)</div>',
        r'<article[^>]*>(.*?)</article>',
        r'<main[^>]*>(.*?)</main>',
        r'<body[^>]*>(.*?)</body>',
    ]
    for pattern in selectors:
        match = re.search(pattern, raw_html, re.I | re.S)
        if not match:
            continue
        text = _html_to_text(match.group(1))
        if len(text) > 50:
            return text
    return _html_to_text(raw_html)


def _fetch_static_chapter(chapter: dict, timeout: int = 30) -> dict:
    """Fetch one static chapter URL without a browser. Used by parallel catalog mode."""
    url = chapter["url"]
    try:
        req = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            content_type = resp.headers.get("content-type", "")
            charset_match = re.search(r'charset=([\w-]+)', content_type, re.I)
            charset = charset_match.group(1) if charset_match else "utf-8"
            try:
                raw_html = raw.decode(charset, errors="ignore")
            except Exception:
                raw_html = raw.decode("utf-8", errors="ignore")

        title_match = re.search(r'<title[^>]*>(.*?)</title>', raw_html, re.I | re.S)
        title = _html_to_text(title_match.group(1)) if title_match else chapter.get("title") or f"第{chapter['chapter']}章"
        text = _extract_static_content(raw_html)
        clean_text = _clean_novel_text(text, title)
        return {
            "status": "ok" if len(clean_text) >= 20 else "empty",
            "chapter": chapter["chapter"],
            "title": title,
            "text": clean_text,
            "length": len(clean_text),
            "url": url,
            **({} if len(clean_text) >= 20 else {"message": "Chapter content too short"}),
        }
    except Exception as e:
        return {
            "status": "error",
            "chapter": chapter.get("chapter"),
            "title": chapter.get("title") or "",
            "message": str(e),
            "url": url,
        }


def _looks_like_catalog(page) -> bool:
    """Detect common novel catalog/list pages."""
    try:
        if "/list/" in page.url and not page.url.rstrip("/").endswith(".html"):
            return True
        if page.query_selector("div.listmain dd a"):
            return True
        body = page.inner_text("body")[:2000]
        return "最新章节列表" in body or "开始阅读" in body
    except Exception:
        return False


def fetch_single_url(url: str) -> dict:
    """Fetch a single URL and return its content."""
    pw = None
    browser = None
    try:
        page, browser, pw = _launch_browser()
        try:
            _navigate(page, url)
            title = page.title()
            raw_text = _extract_content_text(page)
            clean_text = _clean_novel_text(raw_text, title)
            return {
                "status": "ok",
                "title": title,
                "text": clean_text,
                "length": len(clean_text),
                "url": page.url,
            }
        finally:
            if browser:
                browser.close()
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "url": url,
        }
    finally:
        if pw:
            pw.stop()


def fetch_parallel_from_catalog(url: str, max_chapters: int = 500, start_chapter: int = 1, concurrency: int = 4) -> list:
    """Fetch catalog chapter URLs in parallel. Returns [] when no usable catalog is found."""
    start_chapter = max(1, int(start_chapter or 1))
    max_chapters = int(max_chapters or 0)
    unlimited = max_chapters <= 0
    concurrency = max(1, min(12, int(concurrency or 4)))
    pw = None
    browser = None

    try:
        page, browser, pw = _launch_browser()
        _navigate(page, url)
        if not _looks_like_catalog(page):
            return []
        chapters = [item for item in _extract_catalog_chapters(page) if item["chapter"] >= start_chapter]
        if not unlimited:
            chapters = chapters[:max_chapters]
        if not chapters:
            return []
    except Exception:
        return []
    finally:
        if browser:
            browser.close()
        if pw:
            pw.stop()

    results_by_chapter = {}
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = {executor.submit(_fetch_static_chapter, chapter): chapter for chapter in chapters}
        for future in as_completed(futures):
            fallback = futures[future]
            try:
                result = future.result()
            except Exception as e:
                result = {
                    "status": "error",
                    "chapter": fallback["chapter"],
                    "title": fallback.get("title") or "",
                    "message": str(e),
                    "url": fallback["url"],
                }
            results_by_chapter[int(result.get("chapter") or fallback["chapter"])] = result

    results = [results_by_chapter[item["chapter"]] for item in chapters if item["chapter"] in results_by_chapter]
    ok_count = sum(1 for item in results if item.get("status") == "ok")
    if ok_count == 0:
        return []
    if unlimited or len(results) < max_chapters:
        results.append({"status": "done", "message": "Catalog chapter list exhausted"})
    return results


def fetch_serial(url: str, max_chapters: int = 500, start_chapter: int = 1, concurrency: int = 1) -> list:
    """Fetch chapters serially by following 'next chapter' links."""
    if int(concurrency or 1) > 1:
        parallel_results = fetch_parallel_from_catalog(url, max_chapters, start_chapter, concurrency)
        if parallel_results:
            return parallel_results

    results = []
    visited = set()
    pw = None
    browser = None
    start_chapter = max(1, int(start_chapter or 1))
    max_chapters = int(max_chapters or 0)
    unlimited = max_chapters <= 0
    if not unlimited:
        max_chapters = max(1, max_chapters)

    try:
        page, browser, pw = _launch_browser()
        _navigate(page, url)
        jumped_to_start = False
        if _looks_like_catalog(page):
            start_url = _find_chapter_by_number(page, start_chapter) if start_chapter > 1 else _find_first_chapter(page)
            if start_url:
                _navigate(page, start_url)
                jumped_to_start = start_chapter > 1
    except Exception as e:
        return [{"status": "error", "message": f"Failed to open initial URL: {e}", "url": url}]

    try:
        chapter_num = start_chapter if jumped_to_start else 1
        collected = 0
        while unlimited or collected < max_chapters:
            # Deduplicate — for SPA sites, the base URL stays same, check hash too
            full_url = page.url
            if full_url in visited:
                results.append({"status": "done", "message": f"Detected URL loop at chapter {chapter_num}", "url": full_url})
                break
            visited.add(full_url)

            should_collect = chapter_num >= start_chapter

            # Extract current chapter
            if should_collect:
                try:
                    title = page.title()
                    raw_text = _extract_content_text(page)
                    clean_text = _clean_novel_text(raw_text, title)

                    results.append({
                        "status": "ok",
                        "chapter": chapter_num,
                        "title": title,
                        "text": clean_text,
                        "length": len(clean_text),
                        "url": full_url,
                    })
                    collected += 1

                    if not clean_text or len(clean_text) < 20:
                        results[-1]["status"] = "empty"
                        results[-1]["message"] = "Chapter content too short, might be navigation page"

                except Exception as e:
                    results.append({
                        "status": "error",
                        "chapter": chapter_num,
                        "message": str(e),
                        "url": full_url,
                    })
                    collected += 1

            # Find and go to next chapter
            if not unlimited and collected >= max_chapters:
                break

            next_url = _find_next_chapter(page)
            if not next_url:
                results.append({"status": "done", "message": "No more chapters found (next link not available)"})
                break

            # Navigate to next chapter
            try:
                _navigate(page, next_url)
                chapter_num += 1
            except Exception as e:
                results.append({"status": "error", "message": f"Failed to navigate to next chapter: {e}"})
                break

    finally:
        if browser:
            browser.close()
        if pw:
            pw.stop()

    return results


def main():
    parser = argparse.ArgumentParser(description="Playwright URL Fetcher")
    sub = parser.add_subparsers(dest="command")

    # fetch-url
    p = sub.add_parser("fetch-url")
    p.add_argument("--url", required=True)

    # fetch-serial
    p = sub.add_parser("fetch-serial")
    p.add_argument("--url", required=True)
    p.add_argument("--max-chapters", type=int, default=500)
    p.add_argument("--start-chapter", type=int, default=1)
    p.add_argument("--concurrency", type=int, default=1)

    args = parser.parse_args()

    if args.command == "fetch-url":
        result = fetch_single_url(args.url)
        print(json.dumps(result, ensure_ascii=False))

    elif args.command == "fetch-serial":
        results = fetch_serial(args.url, args.max_chapters, args.start_chapter, args.concurrency)
        print(json.dumps(results, ensure_ascii=False))

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
