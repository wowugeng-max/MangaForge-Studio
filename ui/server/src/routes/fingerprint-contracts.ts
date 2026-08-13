import type { Express } from 'express'
import { readFile, rm } from 'fs/promises'
import { randomUUID } from 'crypto'
import { join } from 'path'
import {
  BUILTIN_CONTRACT_SET_ID,
  getContractSetDir,
  getFingerprintLibRootFromWorkspace,
  readContractSelection,
  readContractSets,
  writeContractSelection,
  writeContractSets,
} from '../fingerprint-contract-store'
import { resolveFingerprintContractInfo } from '../novel-writing/fingerprint-contract-resolver'
import { FINGERPRINT_SCORE_REVIEW_TYPE, aggregateFingerprintScores, parseFingerprintScoreRow } from '../fingerprint-contract-scores'
import {
  createFingerprintContractJob,
  getFingerprintContractJob,
  hasRunningFingerprintContractJob,
  readSamplesStatus,
  runOfflineRefitJob,
  runOnlineFetchJob,
  updateFingerprintContractJob,
} from '../fingerprint-contract-jobs'
import { listNovelProjects, listNovelReviewsByType } from '../novel'

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

async function readJsonFile(path: string): Promise<any | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

function normalizeSetIdParam(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return trimmed || null
}

async function readTargetSummary(libRoot: string, setId: string) {
  const contract = await readJsonFile(join(getContractSetDir(libRoot, setId), 'active-contract.json'))
  const target = contract?.target
  if (!target || typeof target !== 'object') return null
  return {
    subject_ta_opener_ratio_max: target.subject_ta_opener_ratio_max ?? null,
    template_contrast_per_1k_max: target.template_contrast_per_1k_max ?? null,
    stock_adverb_per_1k_max: target.stock_adverb_per_1k_max ?? null,
  }
}

export function registerFingerprintContractRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/fingerprint-contracts', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const [sets, selection] = await Promise.all([readContractSets(libRoot), readContractSelection(libRoot)])
      const setsWithSummary = await Promise.all(
        sets.map(async (set) => ({ ...set, target_summary: await readTargetSummary(libRoot, set.id) })),
      )
      const active = setsWithSummary.find((set) => set.id === selection.active_set_id) ?? null
      res.json({ sets: setsWithSummary, selection, active })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get('/api/fingerprint-contracts/active', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const info = resolveFingerprintContractInfo()
      if (!info) return res.json({ set_id: null, contract_name: null, locked: false })
      const sets = await readContractSets(libRoot)
      const record = sets.find((set) => set.id === info.set_id)
      res.json({ ...info, set_label: record?.label ?? info.set_label })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get('/api/fingerprint-contracts/samples-status', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      res.json(await readSamplesStatus(libRoot))
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post('/api/fingerprint-contracts/generate', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const body = req.body || {}
      const mode = String(body.mode || '')
      if (mode !== 'offline_refit' && mode !== 'online_fetch') {
        return res.status(400).json(errorBody('mode 非法：仅支持 offline_refit / online_fetch'))
      }
      if (mode === 'offline_refit') {
        const status = await readSamplesStatus(libRoot)
        if (!status.available) {
          return res.status(400).json(errorBody('本地样本库为空，无法离线重拟合：请先放入样本'))
        }
      }
      if (hasRunningFingerprintContractJob()) {
        return res.status(409).json(errorBody('已有生成任务正在运行，请等待其完成后再试'))
      }
      const id = `set-${randomUUID()}`
      const label = String(body.label || id)
      const notes = String(body.notes || '')
      const job = createFingerprintContractJob(mode, id)
      const run = mode === 'online_fetch' ? runOnlineFetchJob : runOfflineRefitJob
      run({
        libRoot,
        setId: id,
        label,
        notes,
        onProgress: (text) => updateFingerprintContractJob(job.id, { status: 'running', progress: text }),
      })
        .then((result) => updateFingerprintContractJob(job.id, { status: 'completed', progress: '完成', set_id: result?.set_id }))
        .catch((error) => updateFingerprintContractJob(job.id, { status: 'failed', progress: '失败', error: String(error) }))
      res.json({ job })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get('/api/fingerprint-contracts/jobs/:jobId', async (req, res) => {
    try {
      const job = getFingerprintContractJob(String(req.params.jobId))
      if (!job) return res.status(404).json(errorBody('任务不存在'))
      res.json({ job })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put('/api/fingerprint-contracts/selection', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const body = req.body || {}
      const sets = await readContractSets(libRoot)
      const current = await readContractSelection(libRoot)
      const next = { ...current }
      if (body.active_set_id !== undefined) {
        const activeSetId = String(body.active_set_id)
        if (!sets.some((set) => set.id === activeSetId)) {
          return res.status(400).json(errorBody(`合同集不存在，无法启用：${activeSetId}`))
        }
        next.active_set_id = activeSetId
      }
      if (body.locked !== undefined) {
        if (body.locked === null) {
          next.locked = null
        } else {
          const lockedSetId = String(body.locked?.set_id ?? '')
          if (!sets.some((set) => set.id === lockedSetId)) {
            return res.status(400).json(errorBody(`合同集不存在，无法锁定：${lockedSetId}`))
          }
          next.locked = { set_id: lockedSetId, key: String(body.locked?.key || 'active') }
        }
      }
      await writeContractSelection(libRoot, next)
      res.json({ selection: await readContractSelection(libRoot) })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get('/api/fingerprint-contracts/scores', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const setIdFilter = normalizeSetIdParam(req.query?.set_id)
      const projects = await listNovelProjects(activeWorkspace)
      const rows: any[] = []
      for (const project of projects) {
        try {
          const reviews = await listNovelReviewsByType(activeWorkspace, project.id, FINGERPRINT_SCORE_REVIEW_TYPE)
          for (const review of reviews) rows.push(review)
        } catch {
          continue
        }
      }
      // aggregates 始终按合同集分组覆盖全量数据，供前端跨合同集对比，不随 set_id 过滤收窄。
      const aggregates = aggregateFingerprintScores(rows)
      const filteredRows = setIdFilter
        ? rows.filter((row) => parseFingerprintScoreRow(row)?.set_id === setIdFilter)
        : rows
      const recent = [...filteredRows]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 50)
        .map((row) => {
          const parsed = parseFingerprintScoreRow(row)
          return {
            project_id: row.project_id,
            chapter_no: row.chapter_no ?? parsed?.chapter_no ?? null,
            score: parsed?.score ?? null,
            pass: parsed?.pass ?? null,
            total: parsed?.total ?? null,
            failing: parsed ? parsed.checks.filter((check) => !check.ok).map((check) => check.key) : [],
          }
        })
      res.json({ aggregates, rows: recent })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get('/api/fingerprint-contracts/:id', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const id = String(req.params.id)
      const sets = await readContractSets(libRoot)
      const record = sets.find((set) => set.id === id)
      if (!record) return res.status(404).json(errorBody(`合同集不存在：${id}`))
      const setDir = getContractSetDir(libRoot, id)
      const contract = await readJsonFile(join(setDir, 'active-contract.json'))
      const meta = await readJsonFile(join(setDir, 'meta.json'))
      res.json({ record, contract, meta })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete('/api/fingerprint-contracts/:id', async (req, res) => {
    try {
      const libRoot = getFingerprintLibRootFromWorkspace(getWorkspace())
      const id = String(req.params.id)
      if (id === BUILTIN_CONTRACT_SET_ID) {
        return res.status(400).json(errorBody('内置合同只读，不可删除'))
      }
      const selection = await readContractSelection(libRoot)
      if (selection.active_set_id === id) {
        return res.status(400).json(errorBody(`合同集正被启用为当前生效合同，无法删除：${id}`))
      }
      if (selection.locked?.set_id === id) {
        return res.status(400).json(errorBody(`合同集正被锁定为强制合同，无法删除：${id}`))
      }
      const sets = await readContractSets(libRoot)
      if (!sets.some((set) => set.id === id)) {
        return res.status(404).json(errorBody(`合同集不存在：${id}`))
      }
      await rm(getContractSetDir(libRoot, id), { recursive: true, force: true })
      await writeContractSets(libRoot, sets.filter((set) => set.id !== id))
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}
