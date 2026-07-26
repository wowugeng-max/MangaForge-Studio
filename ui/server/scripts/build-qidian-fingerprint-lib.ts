/**
 * Build human webnovel fingerprint library from Qidian FREE chapters only.
 *
 * Genre-organized layout:
 * - human/<genre_slug>/*.txt
 * - contracts/by-genre/<genre_slug>.json
 * - contracts/active-contract.json (global)
 * - meta/genre-catalog.json (book/chapter taxonomy)
 * - meta/samples-catalog.json (sample metadata sidecar)
 *
 * Legal boundary: free chapters only; never VIP/paid bodies.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, renameSync } from 'fs'
import { join, resolve, dirname, basename } from 'path'
import {
  buildHumanFingerprintContract,
  createFingerprintSample,
  formatFingerprintContractPrompt,
  scoreAgainstContract,
  type FingerprintSample,
} from '../src/novel-writing/prose-fingerprint-lib'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const LIB = join(WORKSPACE, 'fingerprint-lib')
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

/** Per-genre book cap (free chapters collected for each book). */
const BOOKS_PER_GENRE = Number(process.env.BOOKS_PER_GENRE || process.env.BOOK_LIMIT || 10)
const FREE_CHAPTERS_PER_BOOK = Number(process.env.FREE_CHAPTERS_PER_BOOK || 3)
const SLEEP_MS = Number(process.env.SLEEP_MS || 700)
const MAX_TOTAL_BOOKS = Number(process.env.MAX_TOTAL_BOOKS || 120)
const ONLY_GENRES = String(process.env.ONLY_GENRES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/** Canonical genre taxonomy for maintainable fingerprint contracts. */
export const GENRE_TAXONOMY: Array<{
  slug: string
  name: string
  aliases: string[]
  category_urls: string[]
  rank_urls: string[]
}> = [
  {
    slug: 'urban',
    name: '都市',
    aliases: ['都市', '现实', '都市生活', '娱乐明星', '商战职场'],
    category_urls: ['https://m.qidian.com/category/4/', 'https://m.qidian.com/category/15/'],
    rank_urls: ['https://m.qidian.com/rank/yuepiao/', 'https://m.qidian.com/rank/hotsales/'],
  },
  {
    slug: 'xuanhuan',
    name: '玄幻',
    aliases: ['玄幻', '东方玄幻', '异世大陆', '王朝争霸'],
    category_urls: ['https://m.qidian.com/category/21/'],
    rank_urls: ['https://m.qidian.com/rank/yuepiao/', 'https://m.qidian.com/rank/readindex/'],
  },
  {
    slug: 'xianxia',
    name: '仙侠',
    aliases: ['仙侠', '修真文明', '幻想修仙', '现代修真', '神话修真'],
    category_urls: ['https://m.qidian.com/category/22/'],
    rank_urls: ['https://m.qidian.com/rank/yuepiao/'],
  },
  {
    slug: 'scifi',
    name: '科幻',
    aliases: ['科幻', '星际文明', '超级科技', '时空穿梭', '进化变异', '末世危机'],
    category_urls: ['https://m.qidian.com/category/9/'],
    rank_urls: ['https://m.qidian.com/rank/hotsales/'],
  },
  {
    slug: 'suspense',
    name: '悬疑',
    aliases: ['悬疑', '诡秘悬疑', '奇妙世界', '侦探推理', '寻墓探险', '奇妙物语'],
    category_urls: ['https://m.qidian.com/category/10/'],
    rank_urls: ['https://m.qidian.com/rank/recom/'],
  },
  {
    slug: 'history',
    name: '历史',
    aliases: ['历史', '架空历史', '秦汉三国', '两宋元明', '清史民国', '上古先秦'],
    category_urls: ['https://m.qidian.com/category/5/'],
    rank_urls: ['https://m.qidian.com/rank/readindex/'],
  },
  {
    slug: 'game',
    name: '游戏',
    aliases: ['游戏', '电子竞技', '虚拟网游', '游戏异界', '游戏系统'],
    category_urls: ['https://m.qidian.com/category/7/'],
    rank_urls: ['https://m.qidian.com/rank/newfans/'],
  },
  {
    slug: 'lightnovel',
    name: '轻小说',
    aliases: ['轻小说', '原生幻想', '恋爱日常', '衍生同人'],
    category_urls: ['https://m.qidian.com/category/12/'],
    rank_urls: ['https://m.qidian.com/rank/newfans/'],
  },
  {
    slug: 'wuxia',
    name: '武侠',
    aliases: ['武侠', '传统武侠', '武侠幻想', '国术无双'],
    category_urls: ['https://m.qidian.com/category/2/'],
    rank_urls: ['https://m.qidian.com/rank/recom/'],
  },
  {
    slug: 'fantasy',
    name: '奇幻',
    aliases: ['奇幻', '西方奇幻', '史诗奇幻', '黑暗幻想'],
    category_urls: ['https://m.qidian.com/category/1/'],
    rank_urls: ['https://m.qidian.com/rank/hotsales/'],
  },
  {
    slug: 'multiverse',
    name: '诸天无限',
    aliases: ['诸天无限', '无限流', '诸天万界', '综漫'],
    category_urls: ['https://m.qidian.com/category/20109/'],
    rank_urls: ['https://m.qidian.com/rank/yuepiao/'],
  },
  {
    slug: 'military',
    name: '军事',
    aliases: ['军事', '战争幻想', '军旅生涯', '抗战烽火'],
    category_urls: ['https://m.qidian.com/category/6/'],
    rank_urls: ['https://m.qidian.com/rank/readindex/'],
  },
]

const GENRE_BY_ALIAS = new Map<string, { slug: string; name: string }>()
for (const g of GENRE_TAXONOMY) {
  GENRE_BY_ALIAS.set(g.name, { slug: g.slug, name: g.name })
  GENRE_BY_ALIAS.set(g.slug, { slug: g.slug, name: g.name })
  for (const a of g.aliases) GENRE_BY_ALIAS.set(a, { slug: g.slug, name: g.name })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalizeGenre(raw?: string | null): { slug: string; name: string; raw: string } {
  const text = String(raw || '').trim()
  if (!text) return { slug: 'unknown', name: '未分类', raw: '' }
  const hit = GENRE_BY_ALIAS.get(text)
  if (hit) return { slug: hit.slug, name: hit.name, raw: text }
  // fuzzy contains
  for (const g of GENRE_TAXONOMY) {
    if (text.includes(g.name) || g.aliases.some((a) => text.includes(a))) {
      return { slug: g.slug, name: g.name, raw: text }
    }
  }
  return { slug: 'unknown', name: '未分类', raw: text }
}

async function fetchText(url: string, referer?: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...(referer ? { Referer: referer } : {}),
    },
  })
  const buf = Buffer.from(await res.arrayBuffer())
  return { ok: res.ok, status: res.status, url: res.url, text: buf.toString('utf8') }
}

function extractJsonObject(html: string, marker = '{"pageContext"') {
  const i = html.indexOf(marker)
  if (i < 0) return null
  let depth = 0
  for (let k = i; k < html.length; k += 1) {
    const ch = html[k]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, k + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function htmlContentToParas(content: string) {
  const parts = String(content || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .split(/<p[^>]*>/i)
  const paras: string[] = []
  for (const part of parts) {
    let line = part
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\u3000/g, '')
      .replace(/\r/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()
    if (line) paras.push(line)
  }
  if (paras.length <= 1) {
    const wall = paras[0] || String(content || '').replace(/<[^>]+>/g, '').replace(/\u3000/g, '').trim()
    // #58: \u4ec5\u7528 <br>\uff08\u6216\u7eaf\u6587\u672c \n\uff09\u5206\u6bb5\u7684\u7ae0\u8282\uff0c\u6b64\u65f6\u6574\u7ae0\u6324\u5728\u4e00\u4e2a part \u91cc\uff08<br> \u5df2\u5728\u4e0a\u65b9\u8f6c\u6210 \n\uff09\u3002
    // \u5148\u6309 \n \u6062\u590d\u771f\u5b9e\u6bb5\u843d\u7ed3\u6784\uff0c\u4ecd\u662f\u5355\u6bb5\u624d\u8d70\u5899\u6587\u672c\u9010\u53e5\u515c\u5e95\u3002
    const newlineParas = wall.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    if (newlineParas.length > 1) return newlineParas.join('\n\n')
    const sentences = wall.match(/[^。！？!?]+[。！？!?]?/g) || [wall]
    return sentences.map((s) => s.trim()).filter(Boolean).join('\n\n')
  }
  return paras.join('\n\n')
}

function isStoryChapterName(name: string) {
  const n = String(name || '')
  if (!n) return false
  if (/感谢|感言|贺|加更|通知|说明|单章|请假|番外预告/.test(n)) return false
  return /第[0-9一二三四五六七八九十百千]+章/.test(n) || /章节|序章|楔子|引子/.test(n) || n.length <= 20
}

type BookSeed = {
  book_id: string
  title: string
  author?: string
  cat?: string
  sub_cat?: string
  rank?: number
  source_url?: string
  intended_genre_slug?: string
}

async function fetchBooksFromCategoryPage(url: string, limit: number): Promise<BookSeed[]> {
  const page = await fetchText(url)
  if (!page.ok) throw new Error(`category ${url} status=${page.status}`)
  const books: BookSeed[] = []
  const seen = new Set<string>()

  // Prefer JSON records if present
  const m = page.text.match(/"records"\s*:\s*(\[[\s\S]*?\])\s*,\s*"page"/)
  if (m) {
    try {
      const records = JSON.parse(m[1])
      for (const row of records) {
        const book_id = String(row.bid || row.bookId || row.id || '')
        if (!book_id || seen.has(book_id)) continue
        seen.add(book_id)
        books.push({
          book_id,
          title: String(row.bName || row.bookName || row.title || book_id),
          author: row.bAuth || row.author,
          cat: row.cat || row.chanName || row.cateName,
          sub_cat: row.subCateName || row.subCat,
          rank: Number(row.rankNum || books.length + 1),
          source_url: url,
        })
        if (books.length >= limit) return books
      }
    } catch {
      // fall through
    }
  }

  // HTML / embedded JSON fallbacks
  // #62: /book/(\d+) 链接常重复出现且含推荐位，与 "bName" 数组长度/顺序并不对应，
  // 两数组下标硬配对会张冠李戴。兜底只收 book_id、书名留 book_id 占位（无法可靠配对的
  // 条目不再猜书名），真实书名由 main() 中 fetchBookDetail 的 detail.title 回填。
  const ids = Array.from(page.text.matchAll(/\/book\/(\d+)/g)).map((x) => x[1])
  for (let i = 0; i < ids.length; i += 1) {
    const book_id = ids[i]
    if (!book_id || seen.has(book_id)) continue
    seen.add(book_id)
    books.push({
      book_id,
      title: book_id,
      rank: books.length + 1,
      source_url: url,
    })
    if (books.length >= limit) break
  }
  return books
}

async function fetchBooksFromRank(url: string, limit: number): Promise<BookSeed[]> {
  const page = await fetchText(url)
  if (!page.ok) throw new Error(`rank ${url} status=${page.status}`)
  const books: BookSeed[] = []
  const seen = new Set<string>()
  const m = page.text.match(/"records"\s*:\s*(\[[\s\S]*?\])\s*,\s*"page"/)
  let records: any[] = []
  if (m) {
    try {
      records = JSON.parse(m[1])
    } catch {
      records = []
    }
  }
  if (!records.length) {
    // #62: 同 fetchBooksFromCategoryPage —— 链接数组与 title="X最新章节在线阅读" 数组
    // 顺序不对应（重复链接/推荐位无 title 属性），不再下标硬配对；书名留 book_id 占位，
    // 交给 fetchBookDetail 回填。
    const ids = Array.from(page.text.matchAll(/\/book\/(\d+)/g)).map((x) => x[1])
    records = ids.map((bid) => ({ bid }))
  }
  for (const row of records) {
    const book_id = String(row.bid || row.bookId || row.id || '')
    if (!book_id || seen.has(book_id)) continue
    seen.add(book_id)
    books.push({
      book_id,
      title: String(row.bName || row.bookName || row.title || book_id),
      author: row.bAuth || row.author,
      cat: row.cat || row.chanName,
      sub_cat: row.subCateName,
      rank: Number(row.rankNum || books.length + 1),
      source_url: url,
    })
    if (books.length >= limit) break
  }
  return books
}

async function fetchBookDetail(bookId: string): Promise<{ title?: string; author?: string; cat?: string; sub_cat?: string }> {
  const page = await fetchText(`https://m.qidian.com/book/${bookId}/`, `https://m.qidian.com/`)
  if (!page.ok) return {}
  const data = extractJsonObject(page.text)
  const pageData = data?.pageContext?.pageProps?.pageData || {}
  const bookInfo = pageData.bookInfo || pageData.book || pageData
  const chanName =
    bookInfo?.chanName
    || bookInfo?.cateName
    || bookInfo?.catName
    || (page.text.match(/"chanName"\s*:\s*"([^"]+)"/) || [])[1]
  const sub =
    bookInfo?.subCateName
    || bookInfo?.subCatName
    || (page.text.match(/"subCateName"\s*:\s*"([^"]+)"/) || [])[1]
  const title =
    bookInfo?.bookName
    || (page.text.match(/"bookName"\s*:\s*"([^"]+)"/) || [])[1]
  const author =
    bookInfo?.authorName
    || bookInfo?.author
    || (page.text.match(/"authorName"\s*:\s*"([^"]+)"/) || [])[1]
  return {
    title: title ? String(title) : undefined,
    author: author ? String(author) : undefined,
    cat: chanName ? String(chanName) : undefined,
    sub_cat: sub ? String(sub) : undefined,
  }
}

async function fetchFreeChapterMetas(bookId: string, limit: number) {
  const page = await fetchText(`https://m.qidian.com/book/${bookId}/catalog/`, `https://m.qidian.com/book/${bookId}/`)
  if (!page.ok) throw new Error(`catalog ${bookId} failed ${page.status}`)
  const data = extractJsonObject(page.text)
  const pageData = data?.pageContext?.pageProps?.pageData
  const vs = pageData?.vs || []
  const chapters: any[] = []
  for (const vol of vs) {
    for (const c of vol?.cs || []) chapters.push(c)
  }
  chapters.sort((a, b) => Number(a.uuid || 0) - Number(b.uuid || 0))
  const free = chapters.filter((c) => Number(c.sS) === 1 && isStoryChapterName(String(c.cN || '')))
  return free.slice(0, limit).map((c) => ({
    chapter_id: String(c.id),
    uuid: Number(c.uuid || 0),
    name: String(c.cN || ''),
    words: Number(c.cnt || 0),
  }))
}

async function fetchFreeChapterText(bookId: string, chapterId: string) {
  const page = await fetchText(
    `https://m.qidian.com/chapter/${bookId}/${chapterId}/`,
    `https://m.qidian.com/book/${bookId}/catalog/`,
  )
  if (!page.ok) throw new Error(`chapter ${bookId}/${chapterId} failed ${page.status}`)
  const data = extractJsonObject(page.text)
  const info = data?.pageContext?.pageProps?.pageData?.chapterInfo
  if (!info) throw new Error(`no chapterInfo for ${bookId}/${chapterId}`)
  const freeStatus = Number(info.freeStatus ?? 1)
  const vipStatus = Number(info.vipStatus ?? 0)
  if (vipStatus === 1 && freeStatus === 0) {
    throw new Error(`skip vip chapter ${bookId}/${chapterId}`)
  }
  const content = htmlContentToParas(String(info.content || ''))
  if (content.replace(/\s+/g, '').length < 200) throw new Error(`too short ${bookId}/${chapterId}`)
  return {
    title: String(info.chapterName || ''),
    words: Number(info.wordsCount || info.actualWords || 0),
    freeStatus,
    vipStatus,
    content,
  }
}

function seedAiSamples(): FingerprintSample[] {
  const out: FingerprintSample[] = []
  const aiDirHints = [
    ['ch1-pov-36-r3.txt', 'ai_suspect'],
    ['ch1-pov-36-r6.txt', 'ai_suspect'],
    ['ch1-pov-36-r7.txt', 'ai_suspect'],
    ['ch1-pov-36-r8.txt', 'ai_pure'],
    ['ch1-pov-36-r41.txt', 'ai_suspect'],
    ['ch1-pov-36-r42.txt', 'ai_suspect'],
  ] as const
  const inputDir = join(WORKSPACE, 'zhuque-inputs')
  for (const [file, label] of aiDirHints) {
    const p = join(inputDir, file)
    if (!existsSync(p)) continue
    const id = `ai_${file.replace(/\.txt$/, '')}`
    const text = readFileSync(p, 'utf8')
    out.push(
      createFingerprintSample({
        id,
        label: label as any,
        source: 'local_zhuque_campaign',
        title: file,
        genre: 'urban',
        text,
        text_path: `zhuque-inputs/${file}`,
        notes: 'local AI/suspect baseline from Zhuque campaign',
      }),
    )
  }
  return out
}

function loadCatalog(): Record<string, any> {
  const p = join(LIB, 'meta', 'samples-catalog.json')
  if (!existsSync(p)) return {}
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8'))
    return raw?.by_id && typeof raw.by_id === 'object' ? raw.by_id : {}
  } catch {
    return {}
  }
}

function listHumanTxtFiles(dir: string, acc: string[] = [], relBase = ''): Array<{ abs: string; rel: string }> {
  if (!existsSync(dir)) return []
  const out: Array<{ abs: string; rel: string }> = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, name.name)
    const rel = relBase ? `${relBase}/${name.name}` : name.name
    if (name.isDirectory()) {
      out.push(...listHumanTxtFiles(abs, acc, rel))
    } else if (name.isFile() && name.name.endsWith('.txt')) {
      out.push({ abs, rel })
    }
  }
  return out
}

function ensureGenreDir(slug: string) {
  const dir = join(LIB, 'human', slug)
  mkdirSync(dir, { recursive: true })
  return dir
}

function parseIdsFromSampleId(id: string): { book_id?: string; chapter_id?: string } {
  const m = String(id || '').match(/^human_qd_(\d+)_(\d+)$/)
  if (!m) return {}
  return { book_id: m[1], chapter_id: m[2] }
}

async function collectGenreBookSeeds(activeGenres: typeof GENRE_TAXONOMY) {
  const byId = new Map<string, BookSeed>()
  for (const genre of activeGenres) {
    let collected = 0
    for (const url of genre.category_urls) {
      if (collected >= BOOKS_PER_GENRE) break
      try {
        await sleep(SLEEP_MS)
        const rows = await fetchBooksFromCategoryPage(url, BOOKS_PER_GENRE)
        console.log(`[genre-cat] ${genre.name} ${url} -> ${rows.length}`)
        for (const row of rows) {
          if (collected >= BOOKS_PER_GENRE) break
          const prev = byId.get(row.book_id)
          const next = {
            ...prev,
            ...row,
            intended_genre_slug: genre.slug,
            cat: row.cat || prev?.cat || genre.name,
          }
          byId.set(row.book_id, next)
          collected += 1
        }
      } catch (err: any) {
        console.log(`[genre-cat-fail] ${genre.name} ${url}: ${err?.message || err}`)
      }
    }
    // rank pages as supplement only (genre may be noisy until detail enrichment)
    if (collected < Math.ceil(BOOKS_PER_GENRE * 0.6)) {
      for (const url of genre.rank_urls.slice(0, 1)) {
        try {
          await sleep(SLEEP_MS)
          const rows = await fetchBooksFromRank(url, BOOKS_PER_GENRE)
          console.log(`[genre-rank-supp] ${genre.name} ${url} -> ${rows.length}`)
          for (const row of rows) {
            if (collected >= BOOKS_PER_GENRE) break
            if (byId.has(row.book_id)) continue
            byId.set(row.book_id, { ...row, intended_genre_slug: genre.slug })
            collected += 1
          }
        } catch (err: any) {
          console.log(`[genre-rank-fail] ${genre.name} ${url}: ${err?.message || err}`)
        }
      }
    }
  }
  return [...byId.values()].slice(0, MAX_TOTAL_BOOKS)
}

async function main() {
  mkdirSync(join(LIB, 'human'), { recursive: true })
  mkdirSync(join(LIB, 'ai'), { recursive: true })
  mkdirSync(join(LIB, 'meta'), { recursive: true })
  mkdirSync(join(LIB, 'contracts'), { recursive: true })
  mkdirSync(join(LIB, 'contracts', 'by-genre'), { recursive: true })

  const activeGenres = ONLY_GENRES.length
    ? GENRE_TAXONOMY.filter((g) => ONLY_GENRES.includes(g.slug) || ONLY_GENRES.includes(g.name))
    : GENRE_TAXONOMY

  console.log(JSON.stringify({
    phase: 'start',
    books_per_genre: BOOKS_PER_GENRE,
    free_chapters_per_book: FREE_CHAPTERS_PER_BOOK,
    genres: activeGenres.map((g) => g.slug),
    max_total_books: MAX_TOTAL_BOOKS,
  }, null, 2))

  let samples = seedAiSamples()
  const catalog = loadCatalog()
  const fetchLog: any[] = []
  const booksMeta: any[] = []

  // 1) collect seeds by genre category pages
  const seeds = await collectGenreBookSeeds(activeGenres)
  console.log(`[seeds] unique_books=${seeds.length}`)

  // 2) enrich + fetch free chapters
  for (const seed of seeds) {
    try {
      await sleep(SLEEP_MS)
      const detail = await fetchBookDetail(seed.book_id)
      const catRaw = detail.cat || seed.cat || ''
      const subRaw = detail.sub_cat || seed.sub_cat || ''
      const genre = normalizeGenre(catRaw || seed.intended_genre_slug)
      // if intended genre conflicts strongly, keep detail truth but record both
      const bookTitle = detail.title || seed.title
      const author = detail.author || seed.author
      booksMeta.push({
        book_id: seed.book_id,
        title: bookTitle,
        author,
        cat: catRaw,
        sub_cat: subRaw,
        genre_slug: genre.slug,
        genre_name: genre.name,
        intended_genre_slug: seed.intended_genre_slug,
        source_url: seed.source_url,
      })
      console.log(`[book] ${bookTitle} genre=${genre.name}/${genre.slug} sub=${subRaw || '-'}`)

      const metas = await fetchFreeChapterMetas(seed.book_id, FREE_CHAPTERS_PER_BOOK)
      console.log(`  free_story_metas=${metas.length}`)
      for (const meta of metas) {
        await sleep(SLEEP_MS)
        const id = `human_qd_${seed.book_id}_${meta.chapter_id}`
        const genreDir = ensureGenreDir(genre.slug)
        const fileName = `${id}.txt`
        const abs = join(genreDir, fileName)
        const rel = `fingerprint-lib/human/${genre.slug}/${fileName}`
        // migrate flat path if present
        const flatAbs = join(LIB, 'human', fileName)
        try {
          if (!existsSync(abs) && existsSync(flatAbs)) {
            renameSync(flatAbs, abs)
          }
        } catch {
          // ignore migration race
        }

        try {
          if (existsSync(abs)) {
            const existingText = readFileSync(abs, 'utf8')
            const sampleExisting = createFingerprintSample({
              id,
              label: 'human_webnovel',
              source: 'qidian_free_chapter',
              title: `${bookTitle} · ${meta.name}`,
              genre: genre.name,
              text: existingText,
              text_path: rel,
              notes: `genre=${genre.slug}; sub=${subRaw}; cached; author=${author || ''}`,
            })
            samples = samples.filter((s) => s.id !== id).concat(sampleExisting)
            catalog[id] = {
              id,
              book_id: seed.book_id,
              chapter_id: meta.chapter_id,
              book_title: bookTitle,
              chapter_title: meta.name,
              author,
              genre_slug: genre.slug,
              genre_name: genre.name,
              genre_raw: genre.raw || catRaw,
              sub_genre: subRaw,
              text_path: rel,
              source: 'qidian_free_chapter',
              cached: true,
            }
            fetchLog.push({ ok: true, cached: true, book: bookTitle, chapter: meta.name, genre: genre.name, chars: sampleExisting.text_chars })
            console.log(`  = cached ${meta.name} chars=${sampleExisting.text_chars}`)
            continue
          }

          const ch = await fetchFreeChapterText(seed.book_id, meta.chapter_id)
          writeFileSync(abs, ch.content.endsWith('\n') ? ch.content : `${ch.content}\n`)
          const sample = createFingerprintSample({
            id,
            label: 'human_webnovel',
            source: 'qidian_free_chapter',
            title: `${bookTitle} · ${ch.title || meta.name}`,
            genre: genre.name,
            text: ch.content,
            text_path: rel,
            notes: `genre=${genre.slug}; sub=${subRaw}; author=${author || ''}; free only`,
          })
          samples = samples.filter((s) => s.id !== id).concat(sample)
          catalog[id] = {
            id,
            book_id: seed.book_id,
            chapter_id: meta.chapter_id,
            book_title: bookTitle,
            chapter_title: ch.title || meta.name,
            author,
            genre_slug: genre.slug,
            genre_name: genre.name,
            genre_raw: genre.raw || catRaw,
            sub_genre: subRaw,
            text_path: rel,
            source: 'qidian_free_chapter',
            cached: false,
          }
          fetchLog.push({ ok: true, book: bookTitle, chapter: ch.title || meta.name, genre: genre.name, chars: sample.text_chars })
          console.log(`  + ${ch.title || meta.name} chars=${sample.text_chars}`)
        } catch (err: any) {
          fetchLog.push({ ok: false, book: bookTitle, chapter: meta.name, genre: genre.name, error: String(err?.message || err) })
          console.log(`  ! ${meta.name}: ${err?.message || err}`)
        }
      }
    } catch (err: any) {
      fetchLog.push({ ok: false, book: seed.title, book_id: seed.book_id, error: String(err?.message || err) })
      console.log(`[book-fail] ${seed.title}: ${err?.message || err}`)
    }
  }

  // 3) Re-measure all human txt on disk (including leftover flat files), preserve catalog genre
  const humanRoot = join(LIB, 'human')
  const humanFiles = listHumanTxtFiles(humanRoot)
  const remmeasured: FingerprintSample[] = []
  for (const file of humanFiles) {
    let text = readFileSync(file.abs, 'utf8')
    const paras = text.split(/\n+/).map((x) => x.trim()).filter(Boolean)
    if (paras.length <= 2 && text.replace(/\s+/g, '').length > 500) {
      // #59: 不再对全文 replace(/\s+/g,'') —— 那会把段内空格（英文名、"第1章 里"等）永久删掉。
      // 改为逐段按句末标点重切、只做首尾 trim；且覆写前先写 .orig 备份（.orig 不会被
      // listHumanTxtFiles 收录），保证重切可逆、不再破坏性覆写。
      const originalText = text
      const sentences = paras
        .flatMap((p) => p.match(/[^。！？!?]+[。！？!?]?/g) || [p])
        .map((s) => s.trim())
        .filter(Boolean)
      text = sentences.join('\n\n') + '\n'
      const backupAbs = file.abs + '.orig'
      if (!existsSync(backupAbs)) writeFileSync(backupAbs, originalText)
      writeFileSync(file.abs, text)
    }
    const id = basename(file.abs).replace(/\.txt$/, '')
    const meta = catalog[id] || {}
    // infer genre from path human/<slug>/file
    const pathParts = file.rel.split('/')
    const pathSlug = pathParts.length >= 2 ? pathParts[0] : 'unknown'
    let genreName = meta.genre_name || ''
    let genreSlug = meta.genre_slug || pathSlug
    if (!genreName) {
      const fromSlug = GENRE_TAXONOMY.find((g) => g.slug === genreSlug)
      genreName = fromSlug?.name || (genreSlug === 'unknown' ? '未分类' : genreSlug)
    }
    // if still flat file under human/*.txt, try detail enrich once
    if ((pathParts.length === 1 || genreSlug === 'unknown' || genreSlug === 'human') && !meta.genre_slug) {
      const ids = parseIdsFromSampleId(id)
      if (ids.book_id) {
        try {
          await sleep(Math.min(400, SLEEP_MS))
          const detail = await fetchBookDetail(ids.book_id)
          const g = normalizeGenre(detail.cat)
          genreSlug = g.slug
          genreName = g.name
          // migrate into genre folder
          if (g.slug !== 'unknown') {
            const destDir = ensureGenreDir(g.slug)
            const destAbs = join(destDir, `${id}.txt`)
            if (file.abs !== destAbs) {
              if (!existsSync(destAbs)) renameSync(file.abs, destAbs)
              file.abs = destAbs
              file.rel = `${g.slug}/${id}.txt`
            }
          }
          catalog[id] = {
            ...(catalog[id] || {}),
            id,
            book_id: ids.book_id,
            chapter_id: ids.chapter_id,
            book_title: detail.title || meta.book_title,
            author: detail.author || meta.author,
            genre_slug: g.slug,
            genre_name: g.name,
            genre_raw: g.raw || detail.cat,
            sub_genre: detail.sub_cat || meta.sub_genre,
            text_path: `fingerprint-lib/human/${file.rel}`,
            source: 'qidian_free_chapter',
            enriched_on_remeasure: true,
          }
        } catch {
          // keep unknown
        }
      }
    }
    const relPath = `fingerprint-lib/human/${file.rel.includes('/') ? file.rel : `${genreSlug}/${basename(file.abs)}`}`
    remmeasured.push(
      createFingerprintSample({
        id,
        label: 'human_webnovel',
        source: 'qidian_free_chapter',
        title: meta.book_title && meta.chapter_title
          ? `${meta.book_title} · ${meta.chapter_title}`
          : id,
        genre: genreName,
        text,
        text_path: catalog[id]?.text_path || relPath,
        notes: `genre=${genreSlug}; sub=${meta.sub_genre || ''}; re-measured`,
      }),
    )
  }
  samples = samples.filter((s) => s.label !== 'human_webnovel').concat(remmeasured)

  // 4) Build global + per-genre contracts
  const human = samples.filter((s) => s.label === 'human_webnovel')
  const globalContract = buildHumanFingerprintContract(samples, 'qidian_free_rank_human')

  const byGenre: Record<string, FingerprintSample[]> = {}
  for (const s of human) {
    const slug = normalizeGenre(s.genre).slug
    if (!byGenre[slug]) byGenre[slug] = []
    byGenre[slug].push(s)
  }
  const genreContracts: Record<string, any> = {}
  for (const [slug, rows] of Object.entries(byGenre)) {
    if (rows.length < 3) continue
    const gName = normalizeGenre(rows[0]?.genre).name
    const contract = buildHumanFingerprintContract(
      [...rows, ...samples.filter((s) => s.label !== 'human_webnovel')],
      `genre_${slug}_${gName}`,
    )
    genreContracts[slug] = {
      slug,
      name: gName,
      sample_count: rows.length,
      contract,
    }
    writeFileSync(join(LIB, 'contracts', 'by-genre', `${slug}.json`), JSON.stringify(contract, null, 2))
  }

  const scoreRows = samples.map((s) => ({
    id: s.id,
    label: s.label,
    title: s.title,
    genre: s.genre,
    chars: s.text_chars,
    score: scoreAgainstContract(s.vector, globalContract),
    vector_summary: {
      cv: s.vector.cv_para,
      single: s.vector.single_sentence_para_ratio,
      two: s.vector.two_sentence_para_ratio,
      dialogue: s.vector.dialogue_para_ratio,
      mid_streak: s.vector.max_mid_streak,
      clinical: s.vector.clinical_hit_per_1k,
      template: s.vector.template_contrast_per_1k,
    },
  }))

  const genreCounts: Record<string, number> = {}
  for (const s of human) {
    const slug = normalizeGenre(s.genre).slug
    genreCounts[slug] = (genreCounts[slug] || 0) + 1
  }

  const index = {
    version: 2,
    updated_at: new Date().toISOString(),
    source_policy: 'qidian free chapters only + local AI baselines; no VIP/paid bodies; organized by genre',
    taxonomy: GENRE_TAXONOMY.map((g) => ({ slug: g.slug, name: g.name, aliases: g.aliases })),
    counts: {
      total: samples.length,
      human_webnovel: human.length,
      ai_suspect: samples.filter((s) => s.label === 'ai_suspect').length,
      ai_pure: samples.filter((s) => s.label === 'ai_pure').length,
      by_genre: genreCounts,
    },
    samples,
  }

  writeFileSync(join(LIB, 'index.json'), JSON.stringify(index, null, 2))
  writeFileSync(join(LIB, 'contracts', `${globalContract.name}.json`), JSON.stringify(globalContract, null, 2))
  writeFileSync(join(LIB, 'contracts', 'active-contract.json'), JSON.stringify(globalContract, null, 2))
  writeFileSync(join(LIB, 'meta', 'fetch-log.json'), JSON.stringify(fetchLog, null, 2))
  writeFileSync(join(LIB, 'meta', 'scoreboard.json'), JSON.stringify(scoreRows, null, 2))
  writeFileSync(join(LIB, 'meta', 'genre-catalog.json'), JSON.stringify({
    updated_at: new Date().toISOString(),
    books: booksMeta,
    genre_counts: genreCounts,
    genre_contracts: Object.fromEntries(
      Object.entries(genreContracts).map(([k, v]) => [k, { name: v.name, sample_count: v.sample_count }]),
    ),
  }, null, 2))
  writeFileSync(join(LIB, 'meta', 'samples-catalog.json'), JSON.stringify({
    version: 1,
    updated_at: new Date().toISOString(),
    by_id: catalog,
  }, null, 2))
  writeFileSync(
    join(LIB, 'meta', 'prompt-directives.txt'),
    [
      '# global',
      ...formatFingerprintContractPrompt(globalContract),
      '',
      ...Object.entries(genreContracts).flatMap(([slug, v]) => [
        `# genre:${slug}/${v.name}`,
        ...formatFingerprintContractPrompt(v.contract).slice(0, 8),
        '',
      ]),
    ].join('\n'),
  )

  const mean = (rows: FingerprintSample[], key: keyof FingerprintSample['vector']) => {
    if (!rows.length) return null
    return Number((rows.reduce((a, s) => a + Number(s.vector[key] || 0), 0) / rows.length).toFixed(4))
  }
  const ai = samples.filter((s) => s.label !== 'human_webnovel')
  const comparison = {
    human_n: human.length,
    ai_n: ai.length,
    human: {
      cv_para: mean(human, 'cv_para'),
      single: mean(human, 'single_sentence_para_ratio'),
      two: mean(human, 'two_sentence_para_ratio'),
      dialogue: mean(human, 'dialogue_para_ratio'),
      mid_streak: mean(human, 'max_mid_streak'),
      clinical: mean(human, 'clinical_hit_per_1k'),
    },
    ai: {
      cv_para: mean(ai, 'cv_para'),
      single: mean(ai, 'single_sentence_para_ratio'),
      two: mean(ai, 'two_sentence_para_ratio'),
      dialogue: mean(ai, 'dialogue_para_ratio'),
      mid_streak: mean(ai, 'max_mid_streak'),
      clinical: mean(ai, 'clinical_hit_per_1k'),
    },
    by_genre: Object.fromEntries(
      Object.entries(byGenre).map(([slug, rows]) => [slug, {
        n: rows.length,
        cv_para: mean(rows, 'cv_para'),
        single: mean(rows, 'single_sentence_para_ratio'),
        two: mean(rows, 'two_sentence_para_ratio'),
        dialogue: mean(rows, 'dialogue_para_ratio'),
        clinical: mean(rows, 'clinical_hit_per_1k'),
      }]),
    ),
    contract_name: globalContract.name,
    genre_contracts: Object.keys(genreContracts),
  }
  writeFileSync(join(LIB, 'meta', 'human-vs-ai.json'), JSON.stringify(comparison, null, 2))

  // README refresh
  writeFileSync(join(LIB, 'README.md'), `# 网文人工指纹库（Fingerprint Library）

## 边界
- **只采集起点免费章节**（分类榜/排行榜作品的免费正文），不抓 VIP/付费章。
- AI 对照样本来自本项目朱雀战役 \`zhuque-inputs/\`。

## 题材分层（v2）
按 canonical 题材维护，便于扩库与分合同：

| slug | 题材 |
|------|------|
${GENRE_TAXONOMY.map((g) => `| ${g.slug} | ${g.name} |`).join('\n')}

目录：
- \`human/<genre_slug>/*.txt\` 免费章样章
- \`contracts/active-contract.json\` 全局合同
- \`contracts/by-genre/<genre_slug>.json\` 分题材合同（样本≥3时生成）
- \`meta/samples-catalog.json\` 样本元数据（书名/章节/题材/子类）
- \`meta/genre-catalog.json\` 书籍题材目录与计数
- \`index.json\` 全库索引（含向量 + by_genre 计数）

## 构建 / 扩库
\`\`\`bash
cd ui/server
# 全题材扩库（默认每题材 10 本 × 3 免费章）
BOOKS_PER_GENRE=10 FREE_CHAPTERS_PER_BOOK=3 bun scripts/build-qidian-fingerprint-lib.ts

# 只扩某几个题材
ONLY_GENRES=urban,suspense,xianxia BOOKS_PER_GENRE=12 bun scripts/build-qidian-fingerprint-lib.ts
\`\`\`

## 使用
- 全局写作门禁用 \`contracts/active-contract.json\`
- 题材特化提示词可读 \`contracts/by-genre/<slug>.json\` 与 \`meta/prompt-directives.txt\`
`)

  console.log(JSON.stringify({
    phase: 'done',
    counts: index.counts,
    genre_contracts: Object.keys(genreContracts),
    comparison_summary: {
      human_n: comparison.human_n,
      ai_n: comparison.ai_n,
      by_genre: comparison.by_genre,
    },
    contract: globalContract.name,
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
