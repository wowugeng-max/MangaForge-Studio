# 指纹合同管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给指纹合同加上「生成 / 留档 / 切换 / 评分看板」的完整 UI 与后端支撑，并把三个各自为政的合同加载入口收口到一个 resolver。

**Architecture:** 服务端新增 `fingerprint-contract-store.ts`（合同集注册表 + selection 读写，provider-store 四段式惯例）、`fingerprint-contract-resolver.ts`（唯一解析入口，同步 API）、`fingerprint-contract-generate.ts`（离线重拟合 + 联网抓取的 job 执行体）、`routes/fingerprint-contracts.ts`（REST）。写作链路仅在入库硬门禁处多记一条评分 review，不改生成行为。前端新增顶级页面 `pages/FingerprintContracts/`，工作台 ops 工具箱加一个自取数只读卡片。

**Tech Stack:** TypeScript、bun（运行时 + test runner）、Express 4、React 18 + antd v5 + react-router v6、axios。

## Global Constraints

- 服务端测试从 `ui/server` 运行：`cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test <相对路径>`；前端测试从 `ui/web` 运行。
- **生成新合同时散文字段必须从内置合同继承**：`prompt_directives` / `avoid` / `prefer` / `narrative_hard` 逐条复制自 builtin，只重算 `target` 数值并更新 `prompt_directives` 里嵌数值的那一行（`他/姓名起句占比 ≤X`）。`buildHumanFingerprintContract` 只产出 7/7/5 条，整体重生成会永久丢失历史富化内容。
- **评分记录必须用新 `review_type='fingerprint_contract_score'`**，不得复用 `prose_quality`（其 payload 在 `storage-compaction.ts` 被白名单重写）。payload 必须显式含 `chapter_id` 与 `chapter_no`。
- **题材自动选只做预留**：resolver 接受 `genre` 参数、合同集保留 `by-genre/`，但本期不给任何流水线调用方传 genre，写作行为零变更。
- 所有 Express handler 必须包 try/catch（bun 下未捕获 rejection 直接杀进程），错误响应 `res.status(500).json(errorBody(error))`。
- 字面量路由必须注册在 `/:id` 参数路由之前。
- antd v5：`<Card variant="borderless">`、`Drawer destroyOnHidden`、`styles={{ body: {...} }}`，禁用 `bodyStyle` / `bordered={false}` / `destroyOnClose`。
- 每个 Task 结束时提交，提交信息末尾加 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。
- 不得修改 `workspace/fingerprint-lib/human/` 下任何样本文件；不得在测试中触网。

## File Structure

**服务端（新建）**
- `ui/server/src/fingerprint-contract-store.ts` — 合同集注册表与 selection 的读写 + normalize + builtin 虚拟条目。
- `ui/server/src/fingerprint-contract-store.test.ts`
- `ui/server/src/novel-writing/fingerprint-contract-resolver.ts` — 唯一合同解析入口（同步）。
- `ui/server/src/novel-writing/fingerprint-contract-resolver.test.ts`
- `ui/server/src/novel-writing/fingerprint-contract-refit.ts` — 离线重拟合纯逻辑（散文继承 + target 拟合）。
- `ui/server/src/novel-writing/fingerprint-contract-refit.test.ts`
- `ui/server/src/fingerprint-contract-jobs.ts` — 进程内 job 表 + 两种生成模式的执行体。
- `ui/server/src/fingerprint-contract-jobs.test.ts`
- `ui/server/src/fingerprint-contract-scores.ts` — 评分记录构造 + 聚合纯函数。
- `ui/server/src/fingerprint-contract-scores.test.ts`
- `ui/server/src/routes/fingerprint-contracts.ts` — REST。
- `ui/server/src/routes/fingerprint-contracts.test.ts`

**服务端（修改）**
- `ui/server/src/novel-writing/prose-fingerprint-lib.ts` — 补 `FingerprintContractScore` 类型；`loadFingerprintContract` 委托 resolver；删硬编码绝对路径。
- `ui/server/src/novel-writing/human-webnovel-resistance.ts` — `loadActiveFingerprintContract` 改调 resolver；`buildResistanceAdmissionHardFailures` 增加伴生导出以复用同一次报告。
- `ui/server/src/novel-writing/character-pov.ts:664` — 私有 loader 改调 resolver。
- `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts` — 入库处记评分 review。
- `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts` — 同上。
- `ui/server/src/index.ts` — 注册路由一行。

**前端（新建）**
- `ui/web/src/api/fingerprintContracts.ts`
- `ui/web/src/pages/FingerprintContracts/index.tsx`
- `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts` — 纯逻辑（聚合行构造、job 状态机）。
- `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`

**前端（修改）**
- `ui/web/src/router.tsx`、`ui/web/src/components/Layout.tsx`（菜单 + `getSelectedKey`）
- `ui/web/src/pages/novel-workspace/shell/workspace-deferred-surfaces-ops-toolbox.tsx`
- `ui/web/src/pages/antdV5Compatibility.test.ts`（把新页面加入 migratedPages）

---

### Task 1: 合同集 store（注册表 + selection + builtin 虚拟条目）

**Files:**
- Create: `ui/server/src/fingerprint-contract-store.ts`
- Test: `ui/server/src/fingerprint-contract-store.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `type FingerprintContractSetRecord = { id: string; label: string; created_at: string; mode: 'builtin' | 'offline_refit' | 'online_fetch'; sample_count: number; notes: string; source_set_id?: string }`
  - `type FingerprintContractSelection = { active_set_id: string; locked?: { set_id: string; key: string } | null }`
  - `getFingerprintLibRoot(repoRoot: string): string` → `<repoRoot>/workspace/fingerprint-lib`
  - `getContractSetsIndexPath(libRoot: string): string`
  - `getContractSelectionPath(libRoot: string): string`
  - `getContractSetDir(libRoot: string, setId: string): string`（builtin → `<libRoot>/contracts`，其它 → `<libRoot>/contract-sets/<setId>`）
  - `BUILTIN_CONTRACT_SET: FingerprintContractSetRecord`（id `'builtin'`，label `'内置合同（随仓库）'`，mode `'builtin'`）
  - `normalizeContractSetRecord(raw: any): FingerprintContractSetRecord`
  - `readContractSets(libRoot: string): Promise<FingerprintContractSetRecord[]>`（首位恒为 builtin）
  - `writeContractSets(libRoot: string, sets: FingerprintContractSetRecord[]): Promise<void>`（builtin 不写盘）
  - `readContractSelection(libRoot: string): Promise<FingerprintContractSelection>`
  - `readContractSelectionSync(libRoot: string): FingerprintContractSelection`
  - `writeContractSelection(libRoot: string, selection: FingerprintContractSelection): Promise<void>`

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/fingerprint-contract-store.test.ts`：

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  BUILTIN_CONTRACT_SET,
  getContractSetDir,
  getContractSetsIndexPath,
  getContractSelectionPath,
  normalizeContractSetRecord,
  readContractSelection,
  readContractSelectionSync,
  readContractSets,
  writeContractSelection,
  writeContractSets,
} from './fingerprint-contract-store'

let dirs: string[] = []
async function tempLib() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-fp-store-'))
  dirs.push(dir)
  await mkdir(join(dir, 'contracts'), { recursive: true })
  return dir
}
afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract store', () => {
  test('readContractSets returns builtin first even when index is missing', async () => {
    const lib = await tempLib()
    const sets = await readContractSets(lib)
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe('builtin')
    expect(sets[0].mode).toBe('builtin')
  })

  test('readContractSets keeps builtin first and normalizes stored records', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ id: 'set-a', label: '离线重拟合 A' }]),
      'utf8',
    )
    const sets = await readContractSets(lib)
    expect(sets.map((s) => s.id)).toEqual(['builtin', 'set-a'])
    expect(sets[1].mode).toBe('offline_refit')
    expect(sets[1].sample_count).toBe(0)
    expect(typeof sets[1].created_at).toBe('string')
  })

  test('writeContractSets never persists the builtin virtual entry', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [
      BUILTIN_CONTRACT_SET,
      normalizeContractSetRecord({ id: 'set-b', label: 'B', mode: 'online_fetch', sample_count: 12 }),
    ])
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw.map((r: any) => r.id)).toEqual(['set-b'])
  })

  test('selection defaults to builtin and round-trips through disk', async () => {
    const lib = await tempLib()
    expect((await readContractSelection(lib)).active_set_id).toBe('builtin')
    await writeContractSelection(lib, { active_set_id: 'set-a', locked: { set_id: 'set-a', key: 'active' } })
    const loaded = await readContractSelection(lib)
    expect(loaded.active_set_id).toBe('set-a')
    expect(loaded.locked).toEqual({ set_id: 'set-a', key: 'active' })
    expect(readContractSelectionSync(lib).active_set_id).toBe('set-a')
  })

  test('selection falls back to builtin when the file is corrupt', async () => {
    const lib = await tempLib()
    await writeFile(getContractSelectionPath(lib), '{ not json', 'utf8')
    expect((await readContractSelection(lib)).active_set_id).toBe('builtin')
    expect(readContractSelectionSync(lib).locked).toBe(null)
  })

  test('getContractSetDir points builtin at the tracked contracts dir', async () => {
    const lib = await tempLib()
    expect(getContractSetDir(lib, 'builtin')).toBe(join(lib, 'contracts'))
    expect(getContractSetDir(lib, 'set-a')).toBe(join(lib, 'contract-sets', 'set-a'))
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-store.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contract-store'`

- [ ] **Step 3: 实现 store**

创建 `ui/server/src/fingerprint-contract-store.ts`：

```ts
import { readFile, writeFile, mkdir } from 'fs/promises'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'

export type FingerprintContractSetMode = 'builtin' | 'offline_refit' | 'online_fetch'

export type FingerprintContractSetRecord = {
  id: string
  label: string
  created_at: string
  mode: FingerprintContractSetMode
  sample_count: number
  notes: string
  source_set_id?: string
}

export type FingerprintContractSelection = {
  active_set_id: string
  locked?: { set_id: string; key: string } | null
}

export const BUILTIN_CONTRACT_SET_ID = 'builtin'

export const BUILTIN_CONTRACT_SET: FingerprintContractSetRecord = {
  id: BUILTIN_CONTRACT_SET_ID,
  label: '内置合同（随仓库）',
  created_at: '',
  mode: 'builtin',
  sample_count: 0,
  notes: '仓库自带、已入库的拟合合同；只读且不可删除。',
}

export function getFingerprintLibRoot(repoRoot: string) {
  return join(repoRoot, 'workspace', 'fingerprint-lib')
}

export function getContractSetsIndexPath(libRoot: string) {
  return join(libRoot, 'contract-sets', 'index.json')
}

export function getContractSelectionPath(libRoot: string) {
  return join(libRoot, 'contract-selection.json')
}

export function getContractSetDir(libRoot: string, setId: string) {
  if (setId === BUILTIN_CONTRACT_SET_ID) return join(libRoot, 'contracts')
  return join(libRoot, 'contract-sets', setId)
}

const MODES: FingerprintContractSetMode[] = ['builtin', 'offline_refit', 'online_fetch']

export function normalizeContractSetRecord(raw: any): FingerprintContractSetRecord {
  const id = String(raw?.id ?? '').trim() || `set-${Date.now()}`
  const mode = MODES.includes(String(raw?.mode) as FingerprintContractSetMode)
    ? (String(raw?.mode) as FingerprintContractSetMode)
    : 'offline_refit'
  const record: FingerprintContractSetRecord = {
    id,
    label: String(raw?.label ?? raw?.name ?? id),
    created_at: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    mode,
    sample_count: Number(raw?.sample_count ?? raw?.sampleCount ?? 0) || 0,
    notes: String(raw?.notes ?? ''),
  }
  const source = raw?.source_set_id ?? raw?.sourceSetId
  if (source) record.source_set_id = String(source)
  return record
}

export async function readContractSets(libRoot: string): Promise<FingerprintContractSetRecord[]> {
  let stored: any[] = []
  try {
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(libRoot), 'utf8'))
    if (Array.isArray(raw)) stored = raw
  } catch {
    stored = []
  }
  return [
    BUILTIN_CONTRACT_SET,
    ...stored
      .map(normalizeContractSetRecord)
      .filter((record) => record.id !== BUILTIN_CONTRACT_SET_ID),
  ]
}

export async function writeContractSets(libRoot: string, sets: FingerprintContractSetRecord[]) {
  const path = getContractSetsIndexPath(libRoot)
  await mkdir(dirname(path), { recursive: true })
  const persisted = sets
    .filter((record) => record?.id && record.id !== BUILTIN_CONTRACT_SET_ID)
    .map(normalizeContractSetRecord)
  await writeFile(path, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8')
}

function normalizeSelection(raw: any): FingerprintContractSelection {
  const activeSetId = String(raw?.active_set_id ?? raw?.activeSetId ?? '').trim() || BUILTIN_CONTRACT_SET_ID
  const lockedRaw = raw?.locked
  const locked = lockedRaw && String(lockedRaw?.set_id ?? lockedRaw?.setId ?? '').trim()
    ? { set_id: String(lockedRaw.set_id ?? lockedRaw.setId), key: String(lockedRaw?.key ?? 'active') || 'active' }
    : null
  return { active_set_id: activeSetId, locked }
}

export async function readContractSelection(libRoot: string): Promise<FingerprintContractSelection> {
  try {
    return normalizeSelection(JSON.parse(await readFile(getContractSelectionPath(libRoot), 'utf8')))
  } catch {
    return { active_set_id: BUILTIN_CONTRACT_SET_ID, locked: null }
  }
}

export function readContractSelectionSync(libRoot: string): FingerprintContractSelection {
  try {
    return normalizeSelection(JSON.parse(readFileSync(getContractSelectionPath(libRoot), 'utf8')))
  } catch {
    return { active_set_id: BUILTIN_CONTRACT_SET_ID, locked: null }
  }
}

export async function writeContractSelection(libRoot: string, selection: FingerprintContractSelection) {
  const path = getContractSelectionPath(libRoot)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(normalizeSelection(selection), null, 2)}\n`, 'utf8')
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-store.test.ts`
Expected: PASS，6 pass / 0 fail

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/fingerprint-contract-store.ts ui/server/src/fingerprint-contract-store.test.ts
git commit -m "feat(fingerprint): add contract set store with builtin virtual entry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 合同解析 resolver（收口三个入口）

**Files:**
- Create: `ui/server/src/novel-writing/fingerprint-contract-resolver.ts`
- Test: `ui/server/src/novel-writing/fingerprint-contract-resolver.test.ts`
- Modify: `ui/server/src/novel-writing/prose-fingerprint-lib.ts:606-631`
- Modify: `ui/server/src/novel-writing/human-webnovel-resistance.ts:58-60`
- Modify: `ui/server/src/novel-writing/character-pov.ts:664-674`

**Interfaces:**
- Consumes: Task 1 的 `readContractSelectionSync` / `getContractSetDir` / `BUILTIN_CONTRACT_SET_ID`
- Produces:
  - `type ResolvedFingerprintContractInfo = { set_id: string; contract_name: string; contract_path: string; locked: boolean; genre_slug: string | null }`
  - `resolveFingerprintLibRoots(cwd?: string): string[]` — 相对 cwd 推导（`../../workspace/fingerprint-lib`、`../../../workspace/fingerprint-lib`、`workspace/fingerprint-lib`），**不含硬编码绝对路径**
  - `resolveFingerprintContract(options?: { cwd?: string; genre?: string | null }): FingerprintContract | null`
  - `resolveFingerprintContractInfo(options?: { cwd?: string; genre?: string | null }): ResolvedFingerprintContractInfo | null`

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/novel-writing/fingerprint-contract-resolver.test.ts`：

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { resolveFingerprintContract, resolveFingerprintContractInfo } from './fingerprint-contract-resolver'

let dirs: string[] = []

function contractJson(name: string, taMax: number) {
  return JSON.stringify({
    version: 1,
    name,
    built_from: ['s1'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: taMax,
    },
    avoid: ['a'],
    prefer: ['p'],
    prompt_directives: [`他/姓名起句占比 ≤${taMax}；优先物件/触感/半截对白起句。`],
  })
}

/** 造一个假仓库：<root>/ui/server 作为 cwd，<root>/workspace/fingerprint-lib 作为库。 */
async function tempRepo() {
  const root = await mkdtemp(join(tmpdir(), 'mangaforge-fp-resolver-'))
  dirs.push(root)
  const cwd = join(root, 'ui', 'server')
  const lib = join(root, 'workspace', 'fingerprint-lib')
  await mkdir(cwd, { recursive: true })
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(join(lib, 'contracts', 'active-contract.json'), contractJson('builtin_global', 0.35), 'utf8')
  await writeFile(join(lib, 'contracts', 'by-genre', 'urban.json'), contractJson('builtin_urban', 0.3), 'utf8')
  return { root, cwd, lib }
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract resolver', () => {
  test('defaults to the builtin global contract when no selection exists', async () => {
    const { cwd } = await tempRepo()
    expect(resolveFingerprintContract({ cwd })?.name).toBe('builtin_global')
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.set_id).toBe('builtin')
    expect(info?.locked).toBe(false)
  })

  test('uses the selected set global contract', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'set-a' }), 'utf8')
    expect(resolveFingerprintContract({ cwd })?.name).toBe('set_a_global')
    expect(resolveFingerprintContractInfo({ cwd })?.set_id).toBe('set-a')
  })

  test('genre picks the per-genre contract inside the active set', async () => {
    const { cwd } = await tempRepo()
    expect(resolveFingerprintContract({ cwd, genre: '都市' })?.name).toBe('builtin_urban')
  })

  test('locked contract overrides genre selection', async () => {
    const { cwd, lib } = await tempRepo()
    await writeFile(
      join(lib, 'contract-selection.json'),
      JSON.stringify({ active_set_id: 'builtin', locked: { set_id: 'builtin', key: 'active' } }),
      'utf8',
    )
    expect(resolveFingerprintContract({ cwd, genre: '都市' })?.name).toBe('builtin_global')
    expect(resolveFingerprintContractInfo({ cwd })?.locked).toBe(true)
  })

  test('falls back to builtin when the selected set is missing', async () => {
    const { cwd, lib } = await tempRepo()
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'ghost-set' }), 'utf8')
    expect(resolveFingerprintContract({ cwd })?.name).toBe('builtin_global')
    expect(resolveFingerprintContractInfo({ cwd })?.set_id).toBe('builtin')
  })

  test('returns null when nothing is resolvable', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'mangaforge-fp-empty-'))
    dirs.push(empty)
    expect(resolveFingerprintContract({ cwd: empty })).toBe(null)
    expect(resolveFingerprintContractInfo({ cwd: empty })).toBe(null)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/fingerprint-contract-resolver.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contract-resolver'`

- [ ] **Step 3: 实现 resolver**

创建 `ui/server/src/novel-writing/fingerprint-contract-resolver.ts`：

```ts
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { BUILTIN_CONTRACT_SET_ID, getContractSetDir, readContractSelectionSync } from '../fingerprint-contract-store'
import { normalizeFingerprintGenreSlug, type FingerprintContract } from './prose-fingerprint-lib'

export type ResolvedFingerprintContractInfo = {
  set_id: string
  contract_name: string
  contract_path: string
  locked: boolean
  genre_slug: string | null
}

/** Repo-relative fingerprint-lib roots (server cwd is <repo>/ui/server in dev). */
export function resolveFingerprintLibRoots(cwd = process.cwd()): string[] {
  return [
    resolve(cwd, '../../workspace/fingerprint-lib'),
    resolve(cwd, '../../../workspace/fingerprint-lib'),
    resolve(cwd, 'workspace/fingerprint-lib'),
  ]
}

function readContract(path: string): FingerprintContract | null {
  try {
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf8')) as FingerprintContract
  } catch {
    return null
  }
}

function candidatePathsForRoot(libRoot: string, genre?: string | null): string[] {
  const selection = readContractSelectionSync(libRoot)
  const slug = genre ? normalizeFingerprintGenreSlug(genre) : null
  const out: string[] = []
  if (selection.locked?.set_id) {
    const dir = getContractSetDir(libRoot, selection.locked.set_id)
    const key = selection.locked.key || 'active'
    out.push(key === 'active' ? join(dir, 'active-contract.json') : join(dir, 'by-genre', `${key}.json`))
  }
  const activeDir = getContractSetDir(libRoot, selection.active_set_id)
  if (slug) out.push(join(activeDir, 'by-genre', `${slug}.json`))
  out.push(join(activeDir, 'active-contract.json'))
  const builtinDir = getContractSetDir(libRoot, BUILTIN_CONTRACT_SET_ID)
  if (slug) out.push(join(builtinDir, 'by-genre', `${slug}.json`))
  out.push(join(builtinDir, 'active-contract.json'))
  return out
}

function setIdForPath(libRoot: string, path: string): string {
  const marker = join(libRoot, 'contract-sets')
  if (!path.startsWith(marker)) return BUILTIN_CONTRACT_SET_ID
  const rest = path.slice(marker.length).replace(/^[\\/]+/, '')
  return rest.split(/[\\/]/)[0] || BUILTIN_CONTRACT_SET_ID
}

export function resolveFingerprintContractInfo(
  options: { cwd?: string; genre?: string | null } = {},
): ResolvedFingerprintContractInfo | null {
  const cwd = options.cwd || process.cwd()
  const slug = options.genre ? normalizeFingerprintGenreSlug(options.genre) : null
  for (const libRoot of resolveFingerprintLibRoots(cwd)) {
    const selection = readContractSelectionSync(libRoot)
    for (const path of candidatePathsForRoot(libRoot, options.genre)) {
      const contract = readContract(path)
      if (!contract) continue
      return {
        set_id: setIdForPath(libRoot, path),
        contract_name: String(contract.name || ''),
        contract_path: path,
        locked: Boolean(selection.locked?.set_id),
        genre_slug: slug,
      }
    }
  }
  return null
}

export function resolveFingerprintContract(
  options: { cwd?: string; genre?: string | null } = {},
): FingerprintContract | null {
  const info = resolveFingerprintContractInfo(options)
  return info ? readContract(info.contract_path) : null
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/fingerprint-contract-resolver.test.ts`
Expected: PASS，6 pass / 0 fail

`normalizeFingerprintGenreSlug` 已在 `prose-fingerprint-lib.ts:594` 导出，直接 import 即可，无需改动。

- [ ] **Step 5: 三个旧入口改走 resolver**

在 `ui/server/src/novel-writing/prose-fingerprint-lib.ts`，把 `fingerprintContractCandidates` 与 `loadFingerprintContract`（606-631 行）替换为兼容壳：

```ts
/** Load the active contract through the central resolver (kept for existing callers). */
export function loadFingerprintContract(options: { cwd?: string; genre?: string | null } = {}): FingerprintContract | null {
  // Lazy require avoids a module cycle: resolver imports this file for types/slug helper.
  const { resolveFingerprintContract } = require('./fingerprint-contract-resolver') as typeof import('./fingerprint-contract-resolver')
  return resolveFingerprintContract(options)
}
```

删除 `fingerprintContractCandidates` 函数（含那条 `/Users/ruiyaosong/MangaForge-Studio/...` 硬编码路径）。

在 `ui/server/src/novel-writing/human-webnovel-resistance.ts:58-60`，`loadActiveFingerprintContract` 保持签名不变，内部改为：

```ts
function loadActiveFingerprintContract(cwd = process.cwd(), genre?: string | null): FingerprintContract | null {
  return resolveFingerprintContract({ cwd, genre })
}
```

并在文件顶部 import 块加 `import { resolveFingerprintContract } from './fingerprint-contract-resolver'`（同时从 `./prose-fingerprint-lib` 的 import 里移除已不需要的 `loadFingerprintContract`，若无其他使用）。

在 `ui/server/src/novel-writing/character-pov.ts:664`，把私有 loader 整体替换为：

```ts
function loadActiveFingerprintContract(): FingerprintContract | null {
  return resolveFingerprintContract()
}
```

并在顶部 import 块加 `import { resolveFingerprintContract } from './fingerprint-contract-resolver'`。若 `existsSync`/`readFileSync`/`resolve` 在该文件已无其他用途，移除对应 import。

- [ ] **Step 6: 跑回归确认无行为变更**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/fingerprint-contract-resolver.test.ts src/novel-writing/prose-fingerprint-lib.test.ts src/novel-writing/human-webnovel-resistance.test.ts src/novel-writing/character-pov.test.ts src/novel-writing/genre-prose-cards.test.ts`
Expected: PASS，全部绿（当前基线：prose-fingerprint-lib + human-webnovel-resistance + genre-prose-cards + character-pov 合计 122 pass）

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:server`
Expected: `Bundled ... modules`，无解析错误（验证 lazy require 未破坏打包）

- [ ] **Step 7: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/novel-writing/fingerprint-contract-resolver.ts ui/server/src/novel-writing/fingerprint-contract-resolver.test.ts ui/server/src/novel-writing/prose-fingerprint-lib.ts ui/server/src/novel-writing/human-webnovel-resistance.ts ui/server/src/novel-writing/character-pov.ts
git commit -m "refactor(fingerprint): funnel contract loading through one resolver

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 离线重拟合（散文字段继承 + target 拟合）

**Files:**
- Create: `ui/server/src/novel-writing/fingerprint-contract-refit.ts`
- Test: `ui/server/src/novel-writing/fingerprint-contract-refit.test.ts`

**Interfaces:**
- Consumes: `buildHumanFingerprintContract` / `createFingerprintSample` / `type FingerprintContract`（`./prose-fingerprint-lib`）
- Produces:
  - `inheritContractProse(fitted: FingerprintContract, builtin: FingerprintContract): FingerprintContract` — 用 builtin 的 `avoid`/`prefer`/`prompt_directives`/`narrative_hard` 覆盖 fitted，并把 directives 中 `他/姓名起句占比 ≤X` 的 X 换成 fitted 的 `subject_ta_opener_ratio_max`
  - `refitContractFromSamples(input: { samples: Array<{ id: string; genre: string; text: string }>; builtin: FingerprintContract; name?: string }): FingerprintContract`
  - `refitGenreContracts(input: { samples: Array<{ id: string; genre: string; text: string }>; builtin: FingerprintContract; genreBuiltins: Record<string, FingerprintContract> }): Record<string, FingerprintContract>` — 每题材 ≥3 条样本才产出

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/novel-writing/fingerprint-contract-refit.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { inheritContractProse, refitContractFromSamples, refitGenreContracts } from './fingerprint-contract-refit'
import type { FingerprintContract } from './prose-fingerprint-lib'

function builtinContract(): FingerprintContract {
  return {
    version: 1,
    name: 'builtin_global',
    built_from: ['old-1'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: 0.312,
    },
    avoid: ['禁对仗宣判句', '禁章末电影定格', '禁临床三联'],
    prefer: ['短触感一句一段', '私心挂动作'],
    prompt_directives: [
      '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
      '【Humanize双轮·系统】Pass A结构重写；Pass B人味。',
      '他/姓名起句占比 ≤0.312；优先物件/触感/半截对白起句。',
      '禁止章末电影定格（空气凝固/紧绷钢丝）。',
    ],
    narrative_hard: { bans: ['多体同构复检'], must_deliver: ['当面短对白推责'], zero_family_keys: ['hw_symmetry_pipeline'] } as any,
  }
}

/** 段落形态刻意不同于 builtin，确保拟合出的 target 会变。 */
function sampleText(seed: number) {
  const paras: string[] = []
  for (let i = 0; i < 40; i += 1) {
    if (i % 5 === 0) paras.push(`“先别动。”他把手电递过去，声音压得很低。`)
    else if (i % 3 === 0) paras.push(`窗台上的灰积了一层第${seed}-${i}处。铁皮柜发出闷响。`)
    else paras.push(`他伸手摸了一下门框第${seed}-${i}道。`)
  }
  return paras.join('\n\n')
}

function samples(n: number, genre = '都市') {
  return Array.from({ length: n }, (_, i) => ({ id: `s-${genre}-${i}`, genre, text: sampleText(i) }))
}

describe('fingerprint contract refit', () => {
  test('inheritContractProse keeps builtin prose fields verbatim', () => {
    const builtin = builtinContract()
    const fitted: FingerprintContract = {
      ...builtin,
      name: 'refit',
      avoid: ['只有7条里的一条'],
      prefer: ['少的'],
      prompt_directives: ['【人工网文指纹合同 · refit】', '他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。'],
      narrative_hard: undefined,
      target: { ...builtin.target, subject_ta_opener_ratio_max: 0.35 },
    }
    const merged = inheritContractProse(fitted, builtin)
    expect(merged.avoid).toEqual(builtin.avoid)
    expect(merged.prefer).toEqual(builtin.prefer)
    expect(merged.narrative_hard).toEqual(builtin.narrative_hard)
    expect(merged.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(merged.prompt_directives).toContain('禁止章末电影定格（空气凝固/紧绷钢丝）。')
    expect(merged.prompt_directives).toContain('他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。')
    expect(merged.prompt_directives.some((line) => line.includes('≤0.312'))).toBe(false)
    expect(merged.target.subject_ta_opener_ratio_max).toBe(0.35)
  })

  test('refitContractFromSamples refits target while inheriting prose', () => {
    const builtin = builtinContract()
    const contract = refitContractFromSamples({ samples: samples(6), builtin, name: 'refit_global' })
    expect(contract.name).toBe('refit_global')
    expect(contract.avoid).toEqual(builtin.avoid)
    expect(contract.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(contract.built_from.length).toBe(6)
    expect(contract.target.dialogue_para_ratio[0]).toBeLessThanOrEqual(contract.target.dialogue_para_ratio[1])
  })

  test('refitContractFromSamples is deterministic for the same input', () => {
    const builtin = builtinContract()
    const a = refitContractFromSamples({ samples: samples(5), builtin })
    const b = refitContractFromSamples({ samples: samples(5), builtin })
    expect(a.target).toEqual(b.target)
  })

  test('refitGenreContracts needs at least three samples per genre', () => {
    const builtin = builtinContract()
    const genreBuiltins = { urban: { ...builtin, name: 'genre_urban_都市' } }
    const out = refitGenreContracts({
      samples: [...samples(4, '都市'), ...samples(2, '科幻')],
      builtin,
      genreBuiltins,
    })
    expect(Object.keys(out)).toEqual(['urban'])
    expect(out.urban.avoid).toEqual(builtin.avoid)
  })

  test('refitContractFromSamples throws on empty sample list', () => {
    expect(() => refitContractFromSamples({ samples: [], builtin: builtinContract() })).toThrow(/no samples/i)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/fingerprint-contract-refit.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contract-refit'`

- [ ] **Step 3: 实现重拟合**

创建 `ui/server/src/novel-writing/fingerprint-contract-refit.ts`：

```ts
import {
  buildHumanFingerprintContract,
  createFingerprintSample,
  normalizeFingerprintGenreSlug,
  type FingerprintContract,
} from './prose-fingerprint-lib'

export type RefitSampleInput = { id: string; genre: string; text: string }

const TA_DIRECTIVE_PREFIX = '他/姓名起句占比 ≤'

/**
 * Contracts carry historical prose fields (24 directives / 17 avoid / 12 prefer /
 * narrative_hard) that buildHumanFingerprintContract cannot regenerate — it only
 * emits 7/7/5. Refitting therefore inherits prose verbatim and only rewrites the
 * one directive line that embeds a refitted number.
 */
export function inheritContractProse(fitted: FingerprintContract, builtin: FingerprintContract): FingerprintContract {
  const taMax = fitted.target.subject_ta_opener_ratio_max
  const directives = (builtin.prompt_directives || []).map((line) =>
    line.startsWith(TA_DIRECTIVE_PREFIX) ? line.replace(/≤[0-9.]+/, `≤${taMax}`) : line,
  )
  return {
    ...fitted,
    avoid: [...(builtin.avoid || [])],
    prefer: [...(builtin.prefer || [])],
    prompt_directives: directives,
    narrative_hard: builtin.narrative_hard,
  }
}

function toFingerprintSamples(samples: RefitSampleInput[]) {
  return samples.map((sample) =>
    createFingerprintSample({
      id: sample.id,
      label: 'human_webnovel',
      source: 'qidian_free_chapter',
      title: sample.id,
      genre: sample.genre,
      text: sample.text,
      text_path: '',
      notes: 're-measured by refit',
    }),
  )
}

export function refitContractFromSamples(input: {
  samples: RefitSampleInput[]
  builtin: FingerprintContract
  name?: string
}): FingerprintContract {
  if (!input.samples.length) throw new Error('refit needs at least one sample: no samples provided')
  const fitted = buildHumanFingerprintContract(
    toFingerprintSamples(input.samples),
    input.name || input.builtin.name || 'qidian_free_rank_human',
  )
  return inheritContractProse(fitted, input.builtin)
}

export function refitGenreContracts(input: {
  samples: RefitSampleInput[]
  builtin: FingerprintContract
  genreBuiltins: Record<string, FingerprintContract>
}): Record<string, FingerprintContract> {
  const byGenre = new Map<string, RefitSampleInput[]>()
  for (const sample of input.samples) {
    const slug = normalizeFingerprintGenreSlug(sample.genre)
    if (!slug) continue
    if (!byGenre.has(slug)) byGenre.set(slug, [])
    byGenre.get(slug)!.push(sample)
  }
  const out: Record<string, FingerprintContract> = {}
  for (const [slug, rows] of byGenre) {
    if (rows.length < 3) continue
    const builtinForGenre = input.genreBuiltins[slug] || input.builtin
    out[slug] = refitContractFromSamples({
      samples: rows,
      builtin: builtinForGenre,
      name: builtinForGenre.name,
    })
  }
  return out
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/fingerprint-contract-refit.test.ts`
Expected: PASS，5 pass / 0 fail

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/novel-writing/fingerprint-contract-refit.ts ui/server/src/novel-writing/fingerprint-contract-refit.test.ts
git commit -m "feat(fingerprint): refit contracts while inheriting builtin prose fields

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 评分记录构造与聚合（纯函数）

**Files:**
- Create: `ui/server/src/fingerprint-contract-scores.ts`
- Test: `ui/server/src/fingerprint-contract-scores.test.ts`

**Interfaces:**
- Consumes: 无（只吃 plain object）
- Produces:
  - `FINGERPRINT_SCORE_REVIEW_TYPE = 'fingerprint_contract_score'`
  - `type FingerprintScoreCheck = { key: string; ok: boolean; value: number; target: number | [number, number] }`
  - `buildFingerprintScoreReviewRecord(input: { projectId: number; chapterId: number; chapterNo: number; setId: string; setLabel: string; contractName: string | null; locked: boolean; contractScore: any; textChars: number; createdAt: string }): { project_id: number; review_type: string; status: string; summary: string; issues: string[]; payload: string }`
  - `parseFingerprintScoreRow(row: { payload?: string | null }): ParsedFingerprintScore | null`
  - `aggregateFingerprintScores(rows: Array<{ payload?: string | null }>): Array<{ set_id: string; set_label: string; chapter_count: number; average_score: number; check_pass_rates: Array<{ key: string; pass_rate: number; sample_count: number }> }>`

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/fingerprint-contract-scores.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import {
  FINGERPRINT_SCORE_REVIEW_TYPE,
  aggregateFingerprintScores,
  buildFingerprintScoreReviewRecord,
  parseFingerprintScoreRow,
} from './fingerprint-contract-scores'

function contractScore(pass: number, overrides: Record<string, boolean> = {}) {
  const keys = [
    'cv_para',
    'single_sentence_para_ratio',
    'two_sentence_para_ratio',
    'dialogue_para_ratio',
    'max_mid_streak',
    'template_contrast_per_1k',
    'stock_adverb_per_1k',
    'clinical_hit_per_1k',
    'subject_ta_opener_ratio',
  ]
  return {
    score: Number((pass / 9).toFixed(3)),
    pass,
    total: 9,
    narrative_hard_pass: true,
    narrative_hard_hit: 0,
    checks: [
      ...keys.map((key, i) => ({ key, ok: overrides[key] ?? i < pass, value: 0.2, target: 0.35 })),
      { key: 'zhuque_narrative_hard', ok: true, value: 0, target: 0 },
    ],
  }
}

function record(over: Partial<Parameters<typeof buildFingerprintScoreReviewRecord>[0]> = {}) {
  return buildFingerprintScoreReviewRecord({
    projectId: 7,
    chapterId: 42,
    chapterNo: 3,
    setId: 'builtin',
    setLabel: '内置合同（随仓库）',
    contractName: 'qidian_free_rank_human',
    locked: false,
    contractScore: contractScore(7),
    textChars: 4200,
    createdAt: '2026-07-26T10:00:00.000Z',
    ...over,
  })
}

describe('fingerprint score review record', () => {
  test('uses its own review type and embeds chapter identity in payload', () => {
    const built = record()
    expect(built.review_type).toBe(FINGERPRINT_SCORE_REVIEW_TYPE)
    expect(built.review_type).not.toBe('prose_quality')
    const payload = JSON.parse(built.payload)
    expect(payload.chapter_id).toBe(42)
    expect(payload.chapter_no).toBe(3)
    expect(payload.set_id).toBe('builtin')
    expect(payload.contract_name).toBe('qidian_free_rank_human')
    expect(payload.checks.length).toBe(10)
  })

  test('marks status attention below two thirds and lists failing checks as issues', () => {
    const low = record({ contractScore: contractScore(5) })
    expect(low.status).toBe('attention')
    expect(low.issues.length).toBeGreaterThan(0)
    const high = record({ contractScore: contractScore(8) })
    expect(high.status).toBe('passed')
  })

  test('summary carries the pass ratio and set label', () => {
    expect(record().summary).toContain('7/9')
    expect(record().summary).toContain('内置合同')
  })

  test('tolerates the degraded no-contract score shape', () => {
    const built = record({
      contractName: null,
      contractScore: { score: 1, pass: 1, total: 1, narrative_hard_pass: true, narrative_hard_hit: 0, checks: [{ key: 'zhuque_narrative_hard', ok: true, value: 0, target: 0 }] },
    })
    const payload = JSON.parse(built.payload)
    expect(payload.checks.length).toBe(1)
    expect(payload.contract_name).toBe(null)
  })
})

describe('aggregateFingerprintScores', () => {
  test('groups by set and computes average score and per-check pass rates', () => {
    const rows = [
      record({ contractScore: contractScore(9) }),
      record({ contractScore: contractScore(9, { dialogue_para_ratio: false }) }),
      record({ setId: 'set-a', setLabel: '离线 A', contractScore: contractScore(6) }),
    ]
    const out = aggregateFingerprintScores(rows)
    const builtin = out.find((r) => r.set_id === 'builtin')!
    expect(builtin.chapter_count).toBe(2)
    expect(builtin.average_score).toBeCloseTo(0.944, 2)
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.pass_rate).toBeCloseTo(0.5, 5)
    expect(dialogue.sample_count).toBe(2)
    expect(out.find((r) => r.set_id === 'set-a')!.chapter_count).toBe(1)
  })

  test('ignores unparseable rows', () => {
    expect(aggregateFingerprintScores([{ payload: 'not json' }, { payload: null }])).toEqual([])
    expect(parseFingerprintScoreRow({ payload: 'not json' })).toBe(null)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-scores.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contract-scores'`

- [ ] **Step 3: 实现构造与聚合**

创建 `ui/server/src/fingerprint-contract-scores.ts`：

```ts
export const FINGERPRINT_SCORE_REVIEW_TYPE = 'fingerprint_contract_score'

export type FingerprintScoreCheck = { key: string; ok: boolean; value: number; target: number | [number, number] }

export type ParsedFingerprintScore = {
  set_id: string
  set_label: string
  contract_name: string | null
  chapter_id: number | null
  chapter_no: number | null
  score: number
  pass: number
  total: number
  checks: FingerprintScoreCheck[]
}

function normalizeChecks(raw: any): FingerprintScoreCheck[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item.key === 'string')
    .map((item) => ({
      key: String(item.key),
      ok: Boolean(item.ok),
      value: Number(item.value ?? 0),
      target: Array.isArray(item.target) ? [Number(item.target[0]), Number(item.target[1])] as [number, number] : Number(item.target ?? 0),
    }))
}

export function buildFingerprintScoreReviewRecord(input: {
  projectId: number
  chapterId: number
  chapterNo: number
  setId: string
  setLabel: string
  contractName: string | null
  locked: boolean
  contractScore: any
  textChars: number
  createdAt: string
}) {
  const checks = normalizeChecks(input.contractScore?.checks)
  const statChecks = checks.filter((check) => check.key !== 'zhuque_narrative_hard')
  const pass = Number(input.contractScore?.pass ?? 0)
  const total = Number(input.contractScore?.total ?? 0) || statChecks.length || 1
  const failing = checks.filter((check) => !check.ok)
  const payload = {
    chapter_id: input.chapterId,
    chapter_no: input.chapterNo,
    project_id: input.projectId,
    set_id: input.setId,
    set_label: input.setLabel,
    contract_name: input.contractName,
    locked: input.locked,
    score: Number(input.contractScore?.score ?? 0),
    pass,
    total,
    checks,
    narrative_hard_pass: Boolean(input.contractScore?.narrative_hard_pass),
    narrative_hard_hit: Number(input.contractScore?.narrative_hard_hit ?? 0),
    text_chars: input.textChars,
    created_at: input.createdAt,
  }
  return {
    project_id: input.projectId,
    review_type: FINGERPRINT_SCORE_REVIEW_TYPE,
    status: pass / total >= 2 / 3 ? 'passed' : 'attention',
    summary: `指纹 ${pass}/${total} · ${input.setLabel} · 第${input.chapterNo}章`,
    issues: failing.map((check) => `${check.key}=${check.value} 目标=${JSON.stringify(check.target)}`),
    payload: JSON.stringify(payload),
  }
}

export function parseFingerprintScoreRow(row: { payload?: string | null }): ParsedFingerprintScore | null {
  try {
    const parsed = JSON.parse(String(row?.payload || ''))
    if (!parsed || typeof parsed !== 'object') return null
    return {
      set_id: String(parsed.set_id || 'builtin'),
      set_label: String(parsed.set_label || parsed.set_id || 'builtin'),
      contract_name: parsed.contract_name == null ? null : String(parsed.contract_name),
      chapter_id: parsed.chapter_id == null ? null : Number(parsed.chapter_id),
      chapter_no: parsed.chapter_no == null ? null : Number(parsed.chapter_no),
      score: Number(parsed.score ?? 0),
      pass: Number(parsed.pass ?? 0),
      total: Number(parsed.total ?? 0),
      checks: normalizeChecks(parsed.checks),
    }
  } catch {
    return null
  }
}

export function aggregateFingerprintScores(rows: Array<{ payload?: string | null }>) {
  const groups = new Map<string, { label: string; scores: number[]; checks: Map<string, { pass: number; total: number }> }>()
  for (const row of rows) {
    const parsed = parseFingerprintScoreRow(row)
    if (!parsed) continue
    if (!groups.has(parsed.set_id)) groups.set(parsed.set_id, { label: parsed.set_label, scores: [], checks: new Map() })
    const group = groups.get(parsed.set_id)!
    group.scores.push(parsed.score)
    for (const check of parsed.checks) {
      if (!group.checks.has(check.key)) group.checks.set(check.key, { pass: 0, total: 0 })
      const stat = group.checks.get(check.key)!
      stat.total += 1
      if (check.ok) stat.pass += 1
    }
  }
  return [...groups.entries()].map(([setId, group]) => ({
    set_id: setId,
    set_label: group.label,
    chapter_count: group.scores.length,
    average_score: group.scores.length
      ? Number((group.scores.reduce((a, b) => a + b, 0) / group.scores.length).toFixed(3))
      : 0,
    check_pass_rates: [...group.checks.entries()].map(([key, stat]) => ({
      key,
      pass_rate: stat.total ? Number((stat.pass / stat.total).toFixed(3)) : 0,
      sample_count: stat.total,
    })),
  }))
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-scores.test.ts`
Expected: PASS，6 pass / 0 fail

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/fingerprint-contract-scores.ts ui/server/src/fingerprint-contract-scores.test.ts
git commit -m "feat(fingerprint): add score review record builder and aggregation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 入库时记录评分（复用同一次报告）

**Files:**
- Modify: `ui/server/src/novel-writing/human-webnovel-resistance.ts`（`buildResistanceAdmissionHardFailures` 附近，约 1984-2008 行）
- Test: `ui/server/src/novel-writing/resistance-admission-report.test.ts`（新建）
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts:209-217`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts:170-174`

**Interfaces:**
- Consumes: Task 4 的 `buildFingerprintScoreReviewRecord`；Task 2 的 `resolveFingerprintContractInfo`
- Produces:
  - `buildResistanceAdmissionFromReport(report: HumanWebnovelResistanceReport): AdmissionFailure[]` — 从既有报告提取 store-blocking 失败（不重新扫描）
  - `evaluateResistanceAdmission(text: string): { report: HumanWebnovelResistanceReport; hard_failures: AdmissionFailure[] }` — 只算一次报告
  - `buildResistanceAdmissionHardFailures` 保留原签名与行为（内部改调上面两者）

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/novel-writing/resistance-admission-report.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildResistanceAdmissionFromReport,
  buildResistanceAdmissionHardFailures,
  evaluateHumanWebnovelResistance,
  evaluateResistanceAdmission,
} from './human-webnovel-resistance'

const CLEAN_PROSE = [
  '他伸手把门推开一道缝。',
  '“先别动。”他把手电递过去。',
  '铁皮柜发出闷响，灰落在袖口上。',
  '他把纸片按住，没让风掀走。',
].join('\n\n')

describe('resistance admission shares one report', () => {
  test('evaluateResistanceAdmission returns both the report and the admission failures', () => {
    const result = evaluateResistanceAdmission(CLEAN_PROSE)
    expect(result.report.version).toBe('human_webnovel_resistance_v1')
    expect(result.report.contract_score).toBeTruthy()
    expect(Array.isArray(result.hard_failures)).toBe(true)
  })

  test('buildResistanceAdmissionFromReport matches the legacy text-based helper', () => {
    const report = evaluateHumanWebnovelResistance(CLEAN_PROSE)
    const fromReport = buildResistanceAdmissionFromReport(report).map((item) => item.code).sort()
    const legacy = buildResistanceAdmissionHardFailures(CLEAN_PROSE).map((item) => item.code).sort()
    expect(fromReport).toEqual(legacy)
  })

  test('report exposes a contract score shape the score recorder can consume', () => {
    const { report } = evaluateResistanceAdmission(CLEAN_PROSE)
    expect(typeof report.contract_score?.pass).toBe('number')
    expect(Array.isArray(report.contract_score?.checks)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/resistance-admission-report.test.ts`
Expected: FAIL —— `evaluateResistanceAdmission is not a function` / 导入报错

- [ ] **Step 3: 拆出可复用报告的实现**

在 `ui/server/src/novel-writing/human-webnovel-resistance.ts`，把 `buildResistanceAdmissionHardFailures`（约 1984 行）替换为：

```ts
/** Map already-computed resistance findings into store-blocking admission failures. */
export function buildResistanceAdmissionFromReport(report: { hard_failures?: any[] }) {
  return asArray(report?.hard_failures)
    .filter((item) => isStoreBlockingPureAiResistanceKey(String(item?.key || '')))
    .map((item) => ({
      code: String(item?.key || 'hw_resistance'),
      source: 'detector_resistance' as const,
      message: compact(
        `${item?.label || item?.key || '抗检测硬门禁'}：${item?.evidence || item?.fix || item?.message || '正文仍含纯AI/模板硬风险'}`,
        280,
      ),
      details: {
        key: item?.key,
        label: item?.label,
        evidence: item?.evidence,
        fix: item?.fix,
        status: item?.status,
        blocking: item?.blocking,
        store_policy: 'pure_ai_only',
      },
    }))
}

/** Evaluate once, return both the full report (for score recording) and admission failures. */
export function evaluateResistanceAdmission(text: string) {
  const report = evaluateHumanWebnovelResistance(text)
  return { report, hard_failures: buildResistanceAdmissionFromReport(report) }
}

/** Convert residual pure-AI detector hard failures into store-blocking admission failures. */
export function buildResistanceAdmissionHardFailures(text: string) {
  return evaluateResistanceAdmission(text).hard_failures
}
```

若该文件内没有 `asArray` 帮助函数，用 `(Array.isArray(report?.hard_failures) ? report.hard_failures : [])` 替代。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/resistance-admission-report.test.ts src/novel-writing/human-webnovel-resistance.test.ts`
Expected: PASS（新 3 项 + 既有 89 项全绿）

- [ ] **Step 5: 在两个入库点记录评分**

在 `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts`，顶部 import 块加：

```ts
import { evaluateResistanceAdmission } from '../../novel-writing/human-webnovel-resistance'
import { resolveFingerprintContractInfo } from '../../novel-writing/fingerprint-contract-resolver'
import { buildFingerprintScoreReviewRecord } from '../../fingerprint-contract-scores'
import { BUILTIN_CONTRACT_SET } from '../../fingerprint-contract-store'
```

把 209-217 行 `const hardAdmission = classifyProseAdmission({...})` 改为先算一次报告再复用：

```ts
  const resistanceAdmission = evaluateResistanceAdmission(finalText)
  const hardAdmission = classifyProseAdmission({
    hard_failures: [
      ...minimalValidation.failures,
      ...openingContinuityFailures,
      ...canonicalFailures,
      // System-wide: detector hard risks must never soft-pass into store.
      ...resistanceAdmission.hard_failures,
    ],
  })
```

在 `reviews: [...]` 数组（约 368-378 行）里，`...pendingGeneratedReviews,` 之后插入一行：

```ts
        buildFingerprintScoreReviewRecord({
          projectId,
          chapterId,
          chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) || 0,
          setId: resolveFingerprintContractInfo()?.set_id || BUILTIN_CONTRACT_SET.id,
          setLabel: BUILTIN_CONTRACT_SET.label,
          contractName: resistanceAdmission.report.contract_name,
          locked: Boolean(resolveFingerprintContractInfo()?.locked),
          contractScore: resistanceAdmission.report.contract_score,
          textChars: String(finalText || '').replace(/\s+/g, '').length,
          createdAt: new Date().toISOString(),
        }),
```

在 `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts` 做同样两处修改（170-174 行的 `...buildResistanceAdmissionHardFailures(finalText),` 换成先算报告再用 `...draftResistanceAdmission.hard_failures,`；345 行 `...pendingGeneratedReviews,` 之后插入同一个 `buildFingerprintScoreReviewRecord({...})` 块）。两处都不要再调用旧的 `buildResistanceAdmissionHardFailures`。

- [ ] **Step 6: 跑写作链路回归**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing-service/ src/novel-writing/human-webnovel-resistance.test.ts`
Expected: PASS（novel-writing-service 基线 50 pass + resistance 89 pass，无新增失败）

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:server`
Expected: `Bundled ... modules`

- [ ] **Step 7: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/novel-writing/human-webnovel-resistance.ts ui/server/src/novel-writing/resistance-admission-report.test.ts ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts
git commit -m "feat(fingerprint): record per-chapter contract score at store admission

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 生成 job（离线重拟合 + 联网抓取）

**Files:**
- Create: `ui/server/src/fingerprint-contract-jobs.ts`
- Test: `ui/server/src/fingerprint-contract-jobs.test.ts`

**Interfaces:**
- Consumes: Task 1 store、Task 3 refit
- Produces:
  - `type FingerprintContractJob = { id: string; mode: 'offline_refit' | 'online_fetch'; status: 'queued' | 'running' | 'completed' | 'failed'; progress: string; error?: string; set_id?: string; created_at: string }`
  - `readSamplesStatus(libRoot: string): Promise<{ available: boolean; count: number; by_genre: Record<string, number> }>`
  - `loadRefitSamples(libRoot: string): Promise<Array<{ id: string; genre: string; text: string }>>`
  - `runOfflineRefitJob(input: { libRoot: string; setId: string; label: string; notes: string; onProgress?: (text: string) => void }): Promise<{ set_id: string; sample_count: number }>`
  - `createFingerprintContractJob(...)` / `getFingerprintContractJob(id)` / `hasRunningFingerprintContractJob()` — 进程内 Map

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/fingerprint-contract-jobs.test.ts`：

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadRefitSamples, readSamplesStatus, runOfflineRefitJob } from './fingerprint-contract-jobs'
import { readContractSets } from './fingerprint-contract-store'

let dirs: string[] = []

function builtinContractJson() {
  return JSON.stringify({
    version: 1,
    name: 'qidian_free_rank_human',
    built_from: ['old'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: 0.312,
    },
    avoid: ['禁对仗宣判句', '禁章末电影定格'],
    prefer: ['短触感一句一段'],
    prompt_directives: [
      '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
      '他/姓名起句占比 ≤0.312；优先物件/触感/半截对白起句。',
      '禁止章末电影定格（空气凝固）。',
    ],
    narrative_hard: { bans: ['多体同构复检'], must_deliver: ['当面短对白推责'], zero_family_keys: ['hw_symmetry_pipeline'] },
  })
}

function sampleText(seed: number) {
  const paras: string[] = []
  for (let i = 0; i < 30; i += 1) {
    if (i % 4 === 0) paras.push('“先别动。”他把手电递过去。')
    else paras.push(`他伸手摸了一下门框第${seed}-${i}道。`)
  }
  return `${paras.join('\n\n')}\n`
}

async function tempLib(sampleCount = 4) {
  const lib = await mkdtemp(join(tmpdir(), 'mangaforge-fp-jobs-'))
  dirs.push(lib)
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(join(lib, 'contracts', 'active-contract.json'), builtinContractJson(), 'utf8')
  if (sampleCount > 0) {
    await mkdir(join(lib, 'human', 'urban'), { recursive: true })
    for (let i = 0; i < sampleCount; i += 1) {
      await writeFile(join(lib, 'human', 'urban', `human_qd_${i}.txt`), sampleText(i), 'utf8')
    }
  }
  return lib
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract generation job', () => {
  test('readSamplesStatus reports availability and per-genre counts', async () => {
    const lib = await tempLib(3)
    const status = await readSamplesStatus(lib)
    expect(status.available).toBe(true)
    expect(status.count).toBe(3)
    expect(status.by_genre.urban).toBe(3)
  })

  test('readSamplesStatus marks unavailable when the corpus is missing', async () => {
    const lib = await tempLib(0)
    const status = await readSamplesStatus(lib)
    expect(status.available).toBe(false)
    expect(status.count).toBe(0)
  })

  test('loadRefitSamples derives genre from the directory name', async () => {
    const lib = await tempLib(2)
    const samples = await loadRefitSamples(lib)
    expect(samples.length).toBe(2)
    expect(samples[0].genre).toBe('urban')
    expect(samples[0].text.length).toBeGreaterThan(50)
  })

  test('runOfflineRefitJob writes a new set that inherits builtin prose', async () => {
    const lib = await tempLib(4)
    const result = await runOfflineRefitJob({ libRoot: lib, setId: 'set-test', label: '测试集', notes: 'n' })
    expect(result.sample_count).toBe(4)
    const written = JSON.parse(await readFile(join(lib, 'contract-sets', 'set-test', 'active-contract.json'), 'utf8'))
    const builtin = JSON.parse(builtinContractJson())
    expect(written.avoid).toEqual(builtin.avoid)
    expect(written.prefer).toEqual(builtin.prefer)
    expect(written.narrative_hard).toEqual(builtin.narrative_hard)
    expect(written.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(written.prompt_directives).toContain('禁止章末电影定格（空气凝固）。')
    const sets = await readContractSets(lib)
    expect(sets.map((s) => s.id)).toEqual(['builtin', 'set-test'])
    expect(sets[1].sample_count).toBe(4)
    const meta = JSON.parse(await readFile(join(lib, 'contract-sets', 'set-test', 'meta.json'), 'utf8'))
    expect(meta.mode).toBe('offline_refit')
  })

  test('runOfflineRefitJob fails clearly when there are no samples', async () => {
    const lib = await tempLib(0)
    await expect(runOfflineRefitJob({ libRoot: lib, setId: 'set-x', label: 'x', notes: '' })).rejects.toThrow(/样本/)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-jobs.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contract-jobs'`

- [ ] **Step 3: 实现 job 与样本加载**

创建 `ui/server/src/fingerprint-contract-jobs.ts`：

```ts
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join, basename } from 'path'
import {
  BUILTIN_CONTRACT_SET_ID,
  getContractSetDir,
  normalizeContractSetRecord,
  readContractSets,
  writeContractSets,
  type FingerprintContractSetMode,
} from './fingerprint-contract-store'
import { refitContractFromSamples, refitGenreContracts, type RefitSampleInput } from './novel-writing/fingerprint-contract-refit'
import type { FingerprintContract } from './novel-writing/prose-fingerprint-lib'

export type FingerprintContractJob = {
  id: string
  mode: 'offline_refit' | 'online_fetch'
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: string
  error?: string
  set_id?: string
  created_at: string
}

const jobs = new Map<string, FingerprintContractJob>()

export function createFingerprintContractJob(mode: FingerprintContractJob['mode'], id: string): FingerprintContractJob {
  const job: FingerprintContractJob = { id, mode, status: 'queued', progress: '排队中', created_at: new Date().toISOString() }
  jobs.set(id, job)
  return job
}

export function getFingerprintContractJob(id: string) {
  return jobs.get(id) || null
}

export function updateFingerprintContractJob(id: string, patch: Partial<FingerprintContractJob>) {
  const job = jobs.get(id)
  if (!job) return null
  Object.assign(job, patch)
  return job
}

export function hasRunningFingerprintContractJob() {
  return [...jobs.values()].some((job) => job.status === 'queued' || job.status === 'running')
}

async function listSampleFiles(libRoot: string): Promise<Array<{ abs: string; genre: string }>> {
  const humanRoot = join(libRoot, 'human')
  const out: Array<{ abs: string; genre: string }> = []
  let genres: string[] = []
  try {
    genres = await readdir(humanRoot)
  } catch {
    return out
  }
  for (const genre of genres) {
    if (genre.startsWith('.')) continue
    const dir = join(humanRoot, genre)
    try {
      if (!(await stat(dir)).isDirectory()) continue
      for (const file of await readdir(dir)) {
        if (!file.endsWith('.txt')) continue
        out.push({ abs: join(dir, file), genre })
      }
    } catch {
      continue
    }
  }
  return out
}

export async function readSamplesStatus(libRoot: string) {
  const files = await listSampleFiles(libRoot)
  const byGenre: Record<string, number> = {}
  for (const file of files) byGenre[file.genre] = (byGenre[file.genre] || 0) + 1
  return { available: files.length > 0, count: files.length, by_genre: byGenre }
}

export async function loadRefitSamples(libRoot: string): Promise<RefitSampleInput[]> {
  const files = await listSampleFiles(libRoot)
  const out: RefitSampleInput[] = []
  for (const file of files) {
    try {
      out.push({ id: basename(file.abs).replace(/\.txt$/, ''), genre: file.genre, text: await readFile(file.abs, 'utf8') })
    } catch {
      continue
    }
  }
  return out
}

async function readContractFile(path: string): Promise<FingerprintContract | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as FingerprintContract
  } catch {
    return null
  }
}

export async function runOfflineRefitJob(input: {
  libRoot: string
  setId: string
  label: string
  notes: string
  onProgress?: (text: string) => void
}) {
  const report = (text: string) => input.onProgress?.(text)
  report('读取内置合同')
  const builtinDir = getContractSetDir(input.libRoot, BUILTIN_CONTRACT_SET_ID)
  const builtin = await readContractFile(join(builtinDir, 'active-contract.json'))
  if (!builtin) throw new Error('内置合同缺失，无法继承散文字段（contracts/active-contract.json）')

  report('加载本地样本')
  const samples = await loadRefitSamples(input.libRoot)
  if (!samples.length) {
    throw new Error(`本地样本库为空：${join(input.libRoot, 'human')} 下没有 .txt 样章，离线重拟合无法进行`)
  }

  report(`拟合全局合同（${samples.length} 条样本）`)
  const globalContract = refitContractFromSamples({ samples, builtin, name: builtin.name })

  report('拟合题材合同')
  const genreBuiltins: Record<string, FingerprintContract> = {}
  try {
    for (const file of await readdir(join(builtinDir, 'by-genre'))) {
      if (!file.endsWith('.json')) continue
      const contract = await readContractFile(join(builtinDir, 'by-genre', file))
      if (contract) genreBuiltins[file.replace(/\.json$/, '')] = contract
    }
  } catch {
    // by-genre is optional
  }
  const genreContracts = refitGenreContracts({ samples, builtin, genreBuiltins })

  report('写入合同集')
  const setDir = getContractSetDir(input.libRoot, input.setId)
  await mkdir(join(setDir, 'by-genre'), { recursive: true })
  await writeFile(join(setDir, 'active-contract.json'), `${JSON.stringify(globalContract, null, 2)}\n`, 'utf8')
  for (const [slug, contract] of Object.entries(genreContracts)) {
    await writeFile(join(setDir, 'by-genre', `${slug}.json`), `${JSON.stringify(contract, null, 2)}\n`, 'utf8')
  }
  const mode: FingerprintContractSetMode = 'offline_refit'
  await writeFile(
    join(setDir, 'meta.json'),
    `${JSON.stringify({ mode, sample_count: samples.length, genre_count: Object.keys(genreContracts).length, created_at: new Date().toISOString(), inherited_prose_from: BUILTIN_CONTRACT_SET_ID }, null, 2)}\n`,
    'utf8',
  )

  const sets = await readContractSets(input.libRoot)
  await writeContractSets(input.libRoot, [
    ...sets,
    normalizeContractSetRecord({
      id: input.setId,
      label: input.label,
      mode,
      sample_count: samples.length,
      notes: input.notes,
      source_set_id: BUILTIN_CONTRACT_SET_ID,
      created_at: new Date().toISOString(),
    }),
  ])
  report('完成')
  return { set_id: input.setId, sample_count: samples.length }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/fingerprint-contract-jobs.test.ts`
Expected: PASS，5 pass / 0 fail

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/fingerprint-contract-jobs.ts ui/server/src/fingerprint-contract-jobs.test.ts
git commit -m "feat(fingerprint): add offline refit job with sample status probing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: REST 路由

**Files:**
- Create: `ui/server/src/routes/fingerprint-contracts.ts`
- Test: `ui/server/src/routes/fingerprint-contracts.test.ts`
- Modify: `ui/server/src/index.ts`（import + 注册一行）

**Interfaces:**
- Consumes: Task 1 store、Task 2 resolver、Task 4 scores、Task 6 jobs
- Produces: `registerFingerprintContractRoutes(app: Express, getWorkspace: () => string): void`

路由清单（字面量全部在 `/:id` 之前）：`GET /api/fingerprint-contracts`、`GET .../active`、`GET .../samples-status`、`POST .../generate`、`GET .../jobs/:jobId`、`PUT .../selection`、`GET .../scores`、`GET .../:id`、`DELETE .../:id`。

- [ ] **Step 1: 写失败测试**

创建 `ui/server/src/routes/fingerprint-contracts.test.ts`：

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { registerFingerprintContractRoutes } from './fingerprint-contracts'

let dirs: string[] = []

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
    put: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PUT ${path}`, handler)
      return app
    },
    delete: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`DELETE ${path}`, handler)
      return app
    },
  }
  return { app, handlers, order: () => [...handlers.keys()] }
}

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

/** 工作区目录（假仓库根），库路径为 <ws>/workspace/fingerprint-lib。 */
async function tempWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'mangaforge-fp-routes-'))
  dirs.push(root)
  const lib = join(root, 'workspace', 'fingerprint-lib')
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(
    join(lib, 'contracts', 'active-contract.json'),
    JSON.stringify({
      version: 1,
      name: 'qidian_free_rank_human',
      built_from: ['a'],
      target: {
        cv_para: [0.5, 0.7], single_sentence_para_ratio: [0.8, 0.97], two_sentence_para_ratio: [0.02, 0.15],
        dialogue_para_ratio: [0.1, 0.33], max_mid_streak_max: 6, template_contrast_per_1k_max: 1,
        stock_adverb_per_1k_max: 1.5, clinical_hit_per_1k_max: 0.5, subject_ta_opener_ratio_max: 0.35,
      },
      avoid: ['a'], prefer: ['p'], prompt_directives: ['他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。'],
    }),
    'utf8',
  )
  return root
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract routes', () => {
  test('registers literal routes before the :id parameter route', async () => {
    const { app, order } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => '/tmp/none')
    const keys = order()
    const idIndex = keys.findIndex((k) => k === 'GET /api/fingerprint-contracts/:id')
    for (const literal of ['GET /api/fingerprint-contracts/active', 'GET /api/fingerprint-contracts/samples-status', 'GET /api/fingerprint-contracts/scores']) {
      expect(keys.indexOf(literal)).toBeGreaterThanOrEqual(0)
      expect(keys.indexOf(literal)).toBeLessThan(idIndex)
    }
  })

  test('GET list returns the builtin set', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const res = await call(handlers.get('GET /api/fingerprint-contracts'), {})
    expect(res.statusCode).toBe(200)
    expect(res.body.sets[0].id).toBe('builtin')
    expect(res.body.selection.active_set_id).toBe('builtin')
  })

  test('GET active reports the resolved contract', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/active'), {})
    expect(res.body.contract_name).toBe('qidian_free_rank_human')
    expect(res.body.set_id).toBe('builtin')
    expect(res.body.locked).toBe(false)
  })

  test('GET samples-status reports an empty corpus', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/samples-status'), {})
    expect(res.body.available).toBe(false)
    expect(res.body.count).toBe(0)
  })

  test('PUT selection rejects an unknown set and accepts a known one', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const bad = await call(handlers.get('PUT /api/fingerprint-contracts/selection'), { body: { active_set_id: 'ghost' } })
    expect(bad.statusCode).toBe(400)
    const ok = await call(handlers.get('PUT /api/fingerprint-contracts/selection'), { body: { active_set_id: 'builtin' } })
    expect(ok.statusCode).toBe(200)
    expect(ok.body.selection.active_set_id).toBe('builtin')
  })

  test('DELETE refuses to remove the builtin set', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const res = await call(handlers.get('DELETE /api/fingerprint-contracts/:id'), { params: { id: 'builtin' } })
    expect(res.statusCode).toBe(400)
    expect(String(res.body.error)).toContain('内置')
  })

  test('POST generate rejects offline mode without samples', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => ws)
    const res = await call(handlers.get('POST /api/fingerprint-contracts/generate'), { body: { mode: 'offline_refit' } })
    expect(res.statusCode).toBe(400)
    expect(String(res.body.error)).toContain('样本')
  })

  test('every handler answers 500 instead of throwing when the workspace is broken', async () => {
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => { throw new Error('workspace exploded') })
    for (const key of ['GET /api/fingerprint-contracts', 'GET /api/fingerprint-contracts/active', 'GET /api/fingerprint-contracts/samples-status', 'GET /api/fingerprint-contracts/scores']) {
      const res = await call(handlers.get(key), {})
      expect(res.statusCode).toBe(500)
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/routes/fingerprint-contracts.test.ts`
Expected: FAIL —— `Cannot find module './fingerprint-contracts'`

- [ ] **Step 3: 实现路由**

创建 `ui/server/src/routes/fingerprint-contracts.ts`。要求：
- 顶部 `function errorBody(message: unknown) { const error = String(message); return { error, detail: error } }`（照 providers.ts）。
- 每个 handler 全包 try/catch，catch 里 `res.status(500).json(errorBody(error))`。
- `libRoot` 由 `getFingerprintLibRoot(getWorkspace())`——注意 `getWorkspace()` 返回的是 `<repo>/workspace`，而 `getFingerprintLibRoot` 期望仓库根，因此这里改为直接 `join(getWorkspace(), 'fingerprint-lib')`；为此在 store 里额外导出 `getFingerprintLibRootFromWorkspace(activeWorkspace: string) { return join(activeWorkspace, 'fingerprint-lib') }` 并在本路由使用它（测试里的 tempWorkspace 造的是 `<root>/workspace/fingerprint-lib`，因此测试传入的 `getWorkspace()` 应为 `join(root,'workspace')`——若测试当前传 root，请把测试的 `() => ws` 改为 `() => join(ws, 'workspace')` 并在测试注释说明）。
- `GET /api/fingerprint-contracts`：`{ sets, selection, active }`，每个 set 附 `target_summary`（读该集 active-contract.json 的 `subject_ta_opener_ratio_max` 等 3 个关键值，读不到给 null）。
- `GET .../active`：`resolveFingerprintContractInfo()` 的结果 + 该集 label；解析不到返回 `{ set_id: null, contract_name: null, locked: false }`。
- `GET .../samples-status`：`readSamplesStatus(libRoot)`。
- `POST .../generate`：body `{ mode, label?, notes? }`；`mode` 非法 → 400；`offline_refit` 且 `readSamplesStatus().available === false` → 400（错误信息含「样本」）；已有运行中 job → 409；否则 `createFingerprintContractJob` 后**不 await** 地跑 `runOfflineRefitJob`（`.then` 置 completed / `.catch` 置 failed），立即返回 `{ job }`。`online_fetch` 分支：`updateFingerprintContractJob(... 'failed')` 并在 progress 写明「联网抓取需在服务端手动运行 build 脚本」——本期只落 job 状态占位，不在路由里起子进程（避免测试触网；实际执行由 Task 10 文档说明）。
- `GET .../jobs/:jobId`：找不到 404。
- `PUT .../selection`：body 含 `active_set_id` 时校验存在性（不存在 400），含 `locked` 时校验 `locked.set_id` 存在性；写入后返回 `{ selection }`。
- `GET .../scores`：遍历当前工作区所有 novel 项目的 reviews，筛 `review_type === FINGERPRINT_SCORE_REVIEW_TYPE`，返回 `{ aggregates, rows }`（rows 取最近 50 条，含 project_id/chapter_no/score/pass/total/failing keys）。项目列表用 `listNovelProjects`，reviews 用 `listNovelReviews`（均来自 `../novel/repos/...`，按现有 import 路径）。任一项目读取失败时跳过该项目而不是整体 500。
- `GET .../:id`：返回该集的 `record + contract(target 全字段) + meta`；不存在 404。
- `DELETE .../:id`：`builtin` → 400（信息含「内置」）；被 `selection.active_set_id` 或 `selection.locked.set_id` 引用 → 400；否则删目录 + 更新注册表。

在 `ui/server/src/index.ts` 顶部 import 区加 `import { registerFingerprintContractRoutes } from './routes/fingerprint-contracts'`，并在 `registerKnowledgeRoutes(app)` 之后加一行 `registerFingerprintContractRoutes(app, getWorkspace)`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/routes/fingerprint-contracts.test.ts`
Expected: PASS，8 pass / 0 fail

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:server`
Expected: `Bundled ... modules`

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/routes/fingerprint-contracts.ts ui/server/src/routes/fingerprint-contracts.test.ts ui/server/src/fingerprint-contract-store.ts ui/server/src/index.ts
git commit -m "feat(fingerprint): expose contract set REST routes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 前端 API 封装与页面纯逻辑

**Files:**
- Create: `ui/web/src/api/fingerprintContracts.ts`
- Create: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts`
- Test: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`

**Interfaces:**
- Consumes: Task 7 的 REST 形状
- Produces:
  - `fingerprintContractApi`（`list` / `active` / `samplesStatus` / `generate` / `job` / `putSelection` / `scores` / `detail` / `remove`）
  - `type ContractSetRow = { id: string; label: string; mode: string; created_at: string; sample_count: number; is_active: boolean; is_locked: boolean; is_builtin: boolean; average_score: number | null; chapter_count: number; ta_max: number | null }`
  - `buildContractSetRows(input: { sets: any[]; selection: any; aggregates: any[]; targets?: Record<string, any> }): ContractSetRow[]`
  - `CHECK_LABELS: Record<string, string>`（9+1 个 key 的中文名）
  - `buildCheckPassRateItems(aggregate: any): Array<{ key: string; label: string; pass_rate: number; sample_count: number; tone: 'good' | 'warn' | 'bad' }>`
  - `nextJobPollDelayMs(job: { status: string } | null, failures: number): number | null`

- [ ] **Step 1: 写失败测试**

创建 `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import {
  CHECK_LABELS,
  buildCheckPassRateItems,
  buildContractSetRows,
  nextJobPollDelayMs,
} from './fingerprintContractsModel'

describe('buildContractSetRows', () => {
  const sets = [
    { id: 'builtin', label: '内置合同（随仓库）', mode: 'builtin', created_at: '', sample_count: 0 },
    { id: 'set-a', label: '离线 A', mode: 'offline_refit', created_at: '2026-07-26T00:00:00.000Z', sample_count: 810 },
  ]

  test('marks the active and locked sets and flags builtin', () => {
    const rows = buildContractSetRows({
      sets,
      selection: { active_set_id: 'set-a', locked: { set_id: 'set-a', key: 'active' } },
      aggregates: [],
    })
    expect(rows[0].is_builtin).toBe(true)
    expect(rows[0].is_active).toBe(false)
    expect(rows[1].is_active).toBe(true)
    expect(rows[1].is_locked).toBe(true)
  })

  test('joins score aggregates and target summaries onto rows', () => {
    const rows = buildContractSetRows({
      sets,
      selection: { active_set_id: 'builtin', locked: null },
      aggregates: [{ set_id: 'set-a', set_label: '离线 A', chapter_count: 12, average_score: 0.812, check_pass_rates: [] }],
      targets: { 'set-a': { subject_ta_opener_ratio_max: 0.35 } },
    })
    const setA = rows.find((r) => r.id === 'set-a')!
    expect(setA.chapter_count).toBe(12)
    expect(setA.average_score).toBe(0.812)
    expect(setA.ta_max).toBe(0.35)
    expect(rows.find((r) => r.id === 'builtin')!.average_score).toBe(null)
  })
})

describe('buildCheckPassRateItems', () => {
  test('labels known checks and tones them by pass rate', () => {
    const items = buildCheckPassRateItems({
      check_pass_rates: [
        { key: 'cv_para', pass_rate: 0.98, sample_count: 50 },
        { key: 'dialogue_para_ratio', pass_rate: 0.7, sample_count: 50 },
        { key: 'subject_ta_opener_ratio', pass_rate: 0.4, sample_count: 50 },
      ],
    })
    expect(items[0].label).toBe(CHECK_LABELS.cv_para)
    expect(items[0].tone).toBe('good')
    expect(items[1].tone).toBe('warn')
    expect(items[2].tone).toBe('bad')
  })

  test('falls back to the raw key for unknown checks and handles empty input', () => {
    expect(buildCheckPassRateItems({ check_pass_rates: [{ key: 'mystery', pass_rate: 1, sample_count: 1 }] })[0].label).toBe('mystery')
    expect(buildCheckPassRateItems(null)).toEqual([])
  })
})

describe('nextJobPollDelayMs', () => {
  test('polls while queued or running and stops when settled', () => {
    expect(nextJobPollDelayMs({ status: 'queued' }, 0)).toBe(2000)
    expect(nextJobPollDelayMs({ status: 'running' }, 0)).toBe(2000)
    expect(nextJobPollDelayMs({ status: 'completed' }, 0)).toBe(null)
    expect(nextJobPollDelayMs({ status: 'failed' }, 0)).toBe(null)
    expect(nextJobPollDelayMs(null, 0)).toBe(null)
  })

  test('backs off after repeated failures', () => {
    expect(nextJobPollDelayMs({ status: 'running' }, 1)).toBe(5000)
    expect(nextJobPollDelayMs({ status: 'running' }, 3)).toBe(15000)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`
Expected: FAIL —— `Cannot find module './fingerprintContractsModel'`

- [ ] **Step 3: 实现 model 与 api**

创建 `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts`：

```ts
export type ContractSetRow = {
  id: string
  label: string
  mode: string
  created_at: string
  sample_count: number
  is_active: boolean
  is_locked: boolean
  is_builtin: boolean
  average_score: number | null
  chapter_count: number
  ta_max: number | null
}

export const CHECK_LABELS: Record<string, string> = {
  cv_para: '句长突发 cv',
  single_sentence_para_ratio: '一句一段占比',
  two_sentence_para_ratio: '双句密段占比',
  dialogue_para_ratio: '对白段占比',
  max_mid_streak: '中句同带连续',
  template_contrast_per_1k: '模板对比/千字',
  stock_adverb_per_1k: '套话副词/千字',
  clinical_hit_per_1k: '临床命中/千字',
  subject_ta_opener_ratio: '他/姓名起句占比',
  zhuque_narrative_hard: '朱雀叙事硬门槛',
}

export function buildContractSetRows(input: {
  sets: any[]
  selection: any
  aggregates: any[]
  targets?: Record<string, any>
}): ContractSetRow[] {
  const aggregates = new Map<string, any>((input.aggregates || []).map((item: any) => [String(item?.set_id), item]))
  const activeId = String(input.selection?.active_set_id || 'builtin')
  const lockedId = input.selection?.locked?.set_id ? String(input.selection.locked.set_id) : ''
  return (input.sets || []).map((set: any) => {
    const id = String(set?.id || '')
    const aggregate = aggregates.get(id)
    const target = input.targets?.[id]
    return {
      id,
      label: String(set?.label || id),
      mode: String(set?.mode || 'offline_refit'),
      created_at: String(set?.created_at || ''),
      sample_count: Number(set?.sample_count || 0),
      is_active: id === activeId,
      is_locked: Boolean(lockedId) && id === lockedId,
      is_builtin: id === 'builtin',
      average_score: aggregate ? Number(aggregate.average_score) : null,
      chapter_count: aggregate ? Number(aggregate.chapter_count) : 0,
      ta_max: target?.subject_ta_opener_ratio_max == null ? null : Number(target.subject_ta_opener_ratio_max),
    }
  })
}

export function buildCheckPassRateItems(aggregate: any) {
  const rows = Array.isArray(aggregate?.check_pass_rates) ? aggregate.check_pass_rates : []
  return rows.map((row: any) => {
    const passRate = Number(row?.pass_rate || 0)
    return {
      key: String(row?.key || ''),
      label: CHECK_LABELS[String(row?.key || '')] || String(row?.key || ''),
      pass_rate: passRate,
      sample_count: Number(row?.sample_count || 0),
      tone: (passRate >= 0.9 ? 'good' : passRate >= 0.6 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
    }
  })
}

export function nextJobPollDelayMs(job: { status: string } | null, failures: number): number | null {
  if (!job) return null
  if (job.status !== 'queued' && job.status !== 'running') return null
  if (failures >= 3) return 15000
  if (failures >= 1) return 5000
  return 2000
}
```

创建 `ui/web/src/api/fingerprintContracts.ts`：

```ts
import apiClient from './client'

export const fingerprintContractApi = {
  list: () => apiClient.get('/fingerprint-contracts'),
  active: () => apiClient.get('/fingerprint-contracts/active'),
  samplesStatus: () => apiClient.get('/fingerprint-contracts/samples-status'),
  generate: (body: { mode: 'offline_refit' | 'online_fetch'; label?: string; notes?: string }) =>
    apiClient.post('/fingerprint-contracts/generate', body),
  job: (jobId: string) => apiClient.get(`/fingerprint-contracts/jobs/${jobId}`),
  putSelection: (body: { active_set_id?: string; locked?: { set_id: string; key: string } | null }) =>
    apiClient.put('/fingerprint-contracts/selection', body),
  scores: (setId?: string) => apiClient.get('/fingerprint-contracts/scores', { params: { set_id: setId } }),
  detail: (id: string) => apiClient.get(`/fingerprint-contracts/${id}`),
  remove: (id: string) => apiClient.delete(`/fingerprint-contracts/${id}`),
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`
Expected: PASS，6 pass / 0 fail

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/web/src/api/fingerprintContracts.ts ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts
git commit -m "feat(web): add fingerprint contract api client and page model

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 管理页面 + 路由 + 导航

**Files:**
- Create: `ui/web/src/pages/FingerprintContracts/index.tsx`
- Modify: `ui/web/src/router.tsx:22`（lazy 声明区）与 `:48` 附近（Layout children）
- Modify: `ui/web/src/components/Layout.tsx:71`（`getSelectedKey`）与 `:178`（菜单 items）
- Modify: `ui/web/src/pages/antdV5Compatibility.test.ts`（migratedPages 加 `FingerprintContracts/index.tsx`）

**Interfaces:**
- Consumes: Task 8 的 `fingerprintContractApi`、`buildContractSetRows`、`buildCheckPassRateItems`、`nextJobPollDelayMs`
- Produces: 默认导出 `FingerprintContracts` 页面组件

- [ ] **Step 1: 写失败测试（antd v5 合规 + 路由/导航契约）**

修改 `ui/web/src/pages/antdV5Compatibility.test.ts`：把 `'FingerprintContracts/index.tsx'` 加入 `migratedPages` 数组。

创建 `ui/web/src/pages/FingerprintContracts/pageWiring.test.ts`：

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

const WEB_SRC = join(import.meta.dir, '..', '..')
const read = (rel: string) => readFileSync(join(WEB_SRC, rel), 'utf8')

describe('fingerprint contracts page wiring', () => {
  test('router lazy-loads the page under the layout children', () => {
    const router = read('router.tsx')
    expect(router).toContain("lazy(() => import('./pages/FingerprintContracts'))")
    expect(router).toContain("path: 'fingerprint-contracts'")
  })

  test('layout exposes the menu entry and selected-key mapping', () => {
    const layout = read('components/Layout.tsx')
    expect(layout).toContain('to="/fingerprint-contracts"')
    expect(layout).toContain("path.startsWith('/fingerprint-contracts')")
    expect(layout).toContain("key: 'fingerprint-contracts'")
  })

  test('page renders the three sections and uses the api client', () => {
    const page = read('pages/FingerprintContracts/index.tsx')
    expect(page).toContain('fingerprintContractApi')
    expect(page).toContain('合同集')
    expect(page).toContain('生成合同')
    expect(page).toContain('评分看板')
    expect(page).toContain('buildContractSetRows')
    expect(page).toContain('buildCheckPassRateItems')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/FingerprintContracts/pageWiring.test.ts src/pages/antdV5Compatibility.test.ts`
Expected: FAIL —— 找不到 `pages/FingerprintContracts/index.tsx`

- [ ] **Step 3: 实现页面与接线**

创建 `ui/web/src/pages/FingerprintContracts/index.tsx`。结构要求：

- `export default function FingerprintContracts()`。
- state：`loading`、`rows`、`selection`、`active`、`samplesStatus`、`aggregates`、`scoreRows`、`selectedSetId`、`job`、`generating`、`mode`（默认 `'offline_refit'`）、`label`、`notes`。
- `load()`：`Promise.all([fingerprintContractApi.list(), fingerprintContractApi.samplesStatus(), fingerprintContractApi.scores()])`，`try/catch(message.error('加载指纹合同失败'))/finally(setLoading(false))`，`useEffect(() => { load() }, [])`（照 ModelManager）。
- 区块一「合同集」：`<Card variant="borderless" title="合同集">` + `<Table rowKey="id" loading={loading} pagination={false} dataSource={rows} columns={...}/>`。列：标签（当前启用加 `<Tag color="green">启用中</Tag>`、锁定加 `<Tag color="orange">已锁定</Tag>`、内置加 `<Tag>内置</Tag>`）、模式、生成时间、样本数、`ta_max`、评分（`average_score == null ? '—' : `${(average_score*100).toFixed(1)}% · ${chapter_count} 章`}`）、操作（`启用` / `锁定此份` / `解除锁定` / `删除`；内置行隐藏删除）。
- 操作实现：`await fingerprintContractApi.putSelection({ active_set_id: id })` → `message.success('已切换合同集')` → `await load()`；锁定用 `putSelection({ locked: { set_id: id, key: 'active' } })`，解除用 `putSelection({ locked: null })`；删除前 `Modal.confirm`。catch 里 `message.error(e?.response?.data?.error || '操作失败')`。
- 区块二「生成合同」：`<Card variant="borderless" title="生成合同">`。显示 `<Alert type={samplesStatus?.available ? 'info' : 'warning'} message={样本库状态文案}/>`（可用时写「本地样本 N 条可用」，不可用时写「本地样本库为空：离线重拟合不可用（样本因版权未入库，需在有样本的机器上操作）」）。`<Radio.Group>` 选 mode（`offline_refit` 标签「离线重拟合（推荐）」、`online_fetch` 标签「联网抓取（耗时长、依赖站点）」）。`<Input>` label、`<Input.TextArea>` notes。`<Button type="primary" loading={generating} disabled={mode === 'offline_refit' && !samplesStatus?.available}>开始生成</Button>`。
- job 轮询：点击后 `const { data } = await fingerprintContractApi.generate({ mode, label, notes })`；`setJob(data.job)`；然后 `while (true) { const delay = nextJobPollDelayMs(current, failures); if (delay == null) break; await new Promise(r => setTimeout(r, delay)); try { current = (await fingerprintContractApi.job(id)).data.job; setJob(current); failures = 0 } catch { failures += 1 } }`；结束后按 `current.status` 提示并 `await load()`；`finally { setGenerating(false) }`。job id 写 `localStorage.setItem('fingerprint.contract.last_job_id', id)`，挂载时若存在则续接轮询。
- 区块三「评分看板」：`<Card variant="borderless" title="评分看板">`。`<Select>` 选合同集（默认当前启用）。汇总 `<Space>`：`<Tag color="blue">均分 X%</Tag><Tag>N 章</Tag>`。指标 `<Space wrap>`：每项 `<Tooltip title={`通过 ${sample_count} 次采样`}><Tag color={tone==='good'?'green':tone==='warn'?'orange':'red'}>{label} {(pass_rate*100).toFixed(0)}%</Tag></Tooltip>`。明细 `<Table>`：项目/章号/得分/未达标项（`issues` 逗号连接），`pagination={{ pageSize: 10 }}`。无数据时 `<Empty description="尚无评分记录：新章节入库后自动累积" />`。
- 全页禁止 `bodyStyle` / `bordered={false}` / `destroyOnClose`。

`ui/web/src/router.tsx`：在 `const ModelManager = lazy(...)` 后加

```tsx
const FingerprintContracts = lazy(() => import('./pages/FingerprintContracts'))
```

并在 Layout children 的 `{ path: 'providers', element: page(<ProviderManager />) },` 之后加

```tsx
      { path: 'fingerprint-contracts', element: page(<FingerprintContracts />) },
```

`ui/web/src/components/Layout.tsx`：`getSelectedKey()` 在 `if (path.startsWith('/providers')) return 'providers'` 之后加

```tsx
    if (path.startsWith('/fingerprint-contracts')) return 'fingerprint-contracts'
```

菜单 items 在 providers 项之后加

```tsx
                { key: 'fingerprint-contracts', icon: <ExperimentOutlined />, label: <Link to="/fingerprint-contracts">指纹合同</Link> },
```

并在文件头部图标 import 块补 `ExperimentOutlined`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/FingerprintContracts/ src/pages/antdV5Compatibility.test.ts`
Expected: PASS（pageWiring 3 项 + model 6 项 + antdV5 全部）

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:web`
Expected: `✓ built in ...`

- [ ] **Step 5: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/web/src/pages/FingerprintContracts/ ui/web/src/router.tsx ui/web/src/components/Layout.tsx ui/web/src/pages/antdV5Compatibility.test.ts
git commit -m "feat(web): add fingerprint contract manager page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 工作台只读卡片 + 文档

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-deferred-surfaces-ops-toolbox.tsx:250-256`
- Test: `ui/web/src/pages/novel-workspace/workspaceUiShell.b-b.test.ts`（追加断言）
- Modify: `workspace/fingerprint-lib/README.md`

**Interfaces:**
- Consumes: Task 7 的 `GET /api/fingerprint-contracts/active`
- Produces: 无（UI 末端）

- [ ] **Step 1: 写失败测试**

在 `ui/web/src/pages/novel-workspace/workspaceUiShell.b-b.test.ts` 末尾追加：

```ts
test('ops toolbox surfaces the active fingerprint contract with a管理页 link', () => {
  const source = projectWorkspaceSource()
  expect(source).toContain('当前指纹合同')
  expect(source).toContain('/fingerprint-contracts')
  expect(source).toContain('fingerprint-contracts/active')
})
```

（该文件已有 `projectWorkspaceSource` 的 import；若没有，从 `./workspaceUiShellSource` 引入。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/novel-workspace/workspaceUiShell.b-b.test.ts`
Expected: FAIL —— `expect(received).toContain('当前指纹合同')`

- [ ] **Step 3: 实现卡片**

在 `ui/web/src/pages/novel-workspace/shell/workspace-deferred-surfaces-ops-toolbox.tsx` 文件顶部 import 区加 `import { Link } from 'react-router-dom'`（`apiClient` 该文件已 import）。在同文件内、组件外部定义一个自取数局部组件：

```tsx
function ActiveFingerprintContractCard() {
  const [info, setInfo] = React.useState<any>(null)
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => {
    let alive = true
    apiClient.get('/fingerprint-contracts/active')
      .then(({ data }) => { if (alive) setInfo(data) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])
  return (
    <Card size="small" title="当前指纹合同">
      <Space wrap size={6}>
        {failed || !info?.contract_name
          ? <Tag color="orange">未解析到合同</Tag>
          : (
            <>
              <Tag color="blue">{info.set_label || info.set_id}</Tag>
              <Tag>{info.contract_name}</Tag>
              {info.locked ? <Tag color="orange">已锁定</Tag> : null}
            </>
          )}
        <Link to="/fingerprint-contracts">管理合同</Link>
      </Space>
    </Card>
  )
}
```

若该文件顶部未 import `React`，改用已有的 hooks import 形式（`import { useEffect, useState } from 'react'` 并去掉 `React.` 前缀）。在 `<Alert type="info" .../>` 之后、第一个 `<Card size="small" title="自然语言创作指令台">` 之前插入 `<ActiveFingerprintContractCard />`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/novel-workspace/workspaceUiShell.a-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-b.test.ts`
Expected: PASS（基线 66 pass + 新增 1）

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:web`
Expected: `✓ built in ...`

- [ ] **Step 5: 补文档**

在 `workspace/fingerprint-lib/README.md` 末尾追加一节：

```markdown
## 合同集管理（UI）

前端「指纹合同」页面（`/fingerprint-contracts`）可以：

- 查看全部合同集，切换当前启用的一套，或强制锁定单份合同（绕过题材选择）。
- 触发生成新合同集：
  - **离线重拟合（默认）**：只用 `human/` 下已存样本重新测量并拟合，不联网。散文字段（`prompt_directives` / `avoid` / `prefer` / `narrative_hard`）从内置合同逐条继承 —— 这些是历史富化内容，`buildHumanFingerprintContract` 只能产出精简版，整体重生成会永久丢失。
  - **联网抓取**：需在服务端手动运行 `bun scripts/build-qidian-fingerprint-lib.ts`（会抓取站点并更新样本库），完成后再在页面上以离线模式生成一个新集留档。
- 查看评分看板：章节入库时自动记录一条 `fingerprint_contract_score` 评审，按合同集聚合均分与 9 项统计指标各自的通过率。

注意：`human/` 下的样本因版权未入库，所以**离线重拟合只能在有样本的机器上进行**；缺样本时页面会标记为不可用。题材合同（`by-genre/`）目前只做数据预留，写作流水线仍统一使用全局合同。
```

- [ ] **Step 6: 全量回归**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/ src/novel-writing-service/ src/llm/ src/fingerprint-contract-store.test.ts src/fingerprint-contract-scores.test.ts src/fingerprint-contract-jobs.test.ts src/routes/fingerprint-contracts.test.ts`
Expected: 新增测试全绿；既有失败数不高于基线（`src/novel-writing/` 13 fail 属既有）

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/web && bun test src/pages/novel-workspace/ src/pages/FingerprintContracts/`
Expected: 新增全绿；既有失败不超过基线 3 个

Run: `cd /Users/ruiyaosong/MangaForge-Studio && bun run build:server && bun run build:web`
Expected: 两者均成功

- [ ] **Step 7: 提交**

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/web/src/pages/novel-workspace/shell/workspace-deferred-surfaces-ops-toolbox.tsx ui/web/src/pages/novel-workspace/workspaceUiShell.b-b.test.ts workspace/fingerprint-lib/README.md
git commit -m "feat(web): show active fingerprint contract in the workspace toolbox

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec 覆盖检查：**

| 规格要求 | 对应 Task |
|---|---|
| 顶级管理页面入口 | Task 9 |
| 工作台只读卡片 + 跳转 | Task 10 |
| 生成：离线默认 / 联网可选 | Task 6（离线执行体）、Task 7（路由与模式校验）、Task 10（联网操作说明） |
| 合同集留档 + 注册表 | Task 1、Task 6 |
| 切换启用 + 内置默认 | Task 1（builtin 虚拟条目 + selection 默认）、Task 7（PUT selection）、Task 9（UI 操作） |
| 强制锁定单份 | Task 2（resolver 优先级）、Task 7、Task 9 |
| 题材预留不接线 | Task 2（resolver 接受 genre 但调用方不传）、Task 3（refitGenreContracts 产出题材合同） |
| 解析入口收口 + 删硬编码路径 | Task 2 |
| 评分入库时记录（每章一条） | Task 4（构造）、Task 5（接入点，复用同一次报告） |
| 9 指标逐项通过率 | Task 4（聚合）、Task 8（items 构造）、Task 9（看板 UI） |
| 散文字段继承（硬约束） | Task 3（`inheritContractProse` + 专项测试）、Task 6（写盘后断言继承） |
| 新 review_type 不复用 prose_quality | Task 4（专项断言 `not.toBe('prose_quality')`） |
| 样本缺失时禁用而非报错 | Task 6（`readSamplesStatus`）、Task 7（400 校验）、Task 9（disabled + Alert） |
| 路由 try/catch 与顺序 | Task 7（两项专项测试） |

**占位符扫描：** 无 TBD/TODO；每个代码步骤都给出完整实现或逐项明确的结构要求（Task 7、Task 9 的实现步骤以精确清单形式给出路由行为与组件结构，含具体文案、字段名、状态码）。

**类型一致性：** `FingerprintContractSetRecord` / `FingerprintContractSelection`（Task 1）在 Task 2/6/7 中使用一致；`getContractSetDir`、`readContractSelectionSync`、`BUILTIN_CONTRACT_SET_ID` 跨 Task 命名一致；`RefitSampleInput`（Task 3）与 Task 6 的 `loadRefitSamples` 返回类型一致；`FINGERPRINT_SCORE_REVIEW_TYPE` / `buildFingerprintScoreReviewRecord`（Task 4）在 Task 5/7 一致；`ContractSetRow` / `buildContractSetRows` / `buildCheckPassRateItems` / `nextJobPollDelayMs`（Task 8）在 Task 9 一致。Task 7 明确指出 `getFingerprintLibRoot(repoRoot)` 与工作区语义的差异，并要求新增 `getFingerprintLibRootFromWorkspace(activeWorkspace)`——实现时需回到 Task 1 文件补这个导出（已在 Task 7 Step 3 说明并纳入该 Task 的提交清单）。
