import type { Express } from 'express'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ensureWorkspaceStructure } from '../workspace'
import { coerceBoolean } from '../boolean-utils'

export type RecommendationRuleRecord = {
  id: number
  class_type: string
  field: string
  friendly_name: string
  auto_check: boolean
  enabled: boolean
  priority: number
  threshold: number
  created_at: string
  updated_at: string
}

type NodeParameterStatRecord = {
  class_type: string
  field: string
  count: number
  updated_at: string
}

function nowIso() {
  return new Date().toISOString()
}

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

function rulesPath(workspace: string) {
  return join(workspace, 'recommendation-rules.json')
}

function statsPath(workspace: string) {
  return join(workspace, 'node-parameter-stats.json')
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function normalizeRuleRecord(raw: Partial<RecommendationRuleRecord> & Record<string, any>): RecommendationRuleRecord {
  const timestamp = String(raw.created_at || raw.updated_at || nowIso())
  const field = String(raw.field ?? '').trim()
  const classType = raw.class_type ?? raw.classType
  const friendlyName = raw.friendly_name ?? raw.friendlyName
  const autoCheck = raw.auto_check ?? raw.autoCheck
  return {
    ...raw,
    id: Number(raw.id || 0),
    class_type: String(classType ?? '').trim(),
    field,
    friendly_name: String(friendlyName ?? field).trim() || field,
    auto_check: coerceBoolean(autoCheck, false),
    enabled: coerceBoolean(raw.enabled, true),
    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0,
    threshold: Number.isFinite(Number(raw.threshold)) ? Number(raw.threshold) : 1,
    created_at: timestamp,
    updated_at: String(raw.updated_at || timestamp),
  }
}

function normalizeStatRecord(raw: Partial<NodeParameterStatRecord> & Record<string, any>): NodeParameterStatRecord {
  return {
    class_type: String(raw.class_type ?? raw.classType ?? '').trim(),
    field: String(raw.field ?? '').trim(),
    count: Number.isFinite(Number(raw.count)) ? Number(raw.count) : 0,
    updated_at: String(raw.updated_at || nowIso()),
  }
}

async function readRules(workspace: string): Promise<RecommendationRuleRecord[]> {
  const data = await readJson<RecommendationRuleRecord[]>(rulesPath(workspace), [])
  return Array.isArray(data) ? data.map(item => normalizeRuleRecord(item as any)).filter(isUsableRule) : []
}

async function writeRules(workspace: string, rules: RecommendationRuleRecord[]) {
  await writeJson(rulesPath(workspace), rules)
}

async function readStats(workspace: string): Promise<NodeParameterStatRecord[]> {
  const data = await readJson<NodeParameterStatRecord[]>(statsPath(workspace), [])
  return Array.isArray(data) ? data.map(item => normalizeStatRecord(item as any)) : []
}

async function writeStats(workspace: string, stats: NodeParameterStatRecord[]) {
  await writeJson(statsPath(workspace), stats)
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return parseBoolean(value[0])
  if (value === true) return true
  if (value === false) return false
  const text = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false
  return undefined
}

function normalizedRuleInput(input: any, existing?: RecommendationRuleRecord): Omit<RecommendationRuleRecord, 'id' | 'created_at' | 'updated_at'> {
  const classType = String(input.class_type ?? input.classType ?? existing?.class_type ?? '').trim()
  const field = String(input.field ?? existing?.field ?? '').trim()
  const friendlyName = String(input.friendly_name ?? input.friendlyName ?? existing?.friendly_name ?? field).trim()
  return {
    class_type: classType,
    field,
    friendly_name: friendlyName || field,
    auto_check: coerceBoolean(input.auto_check ?? input.autoCheck, existing?.auto_check ?? false),
    enabled: coerceBoolean(input.enabled, existing?.enabled ?? true),
    priority: Number.isFinite(Number(input.priority ?? existing?.priority)) ? Number(input.priority ?? existing?.priority) : 0,
    threshold: Number.isFinite(Number(input.threshold ?? existing?.threshold)) ? Number(input.threshold ?? existing?.threshold) : 1,
  }
}

function isUsableRule(rule: Pick<RecommendationRuleRecord, 'class_type' | 'field'>) {
  return Boolean(rule.class_type && rule.field)
}

export function buildCombinedRecommendationRules(rules: RecommendationRuleRecord[], stats: NodeParameterStatRecord[]) {
  const manualKeys = new Set(rules.map(rule => `${rule.class_type}\u0000${rule.field}`))
  const manual = rules.map(rule => ({
    ...rule,
    source: 'manual',
    count: null,
  }))
  const learned = aggregateNodeParameterStats(stats)
    .filter(stat => !manualKeys.has(`${stat.class_type}\u0000${stat.field}`))
    .map(stat => ({
      id: null,
      class_type: stat.class_type,
      field: stat.field,
      friendly_name: stat.field,
      auto_check: false,
      enabled: true,
      priority: 999,
      threshold: 1,
      source: 'learned',
      count: stat.count,
      created_at: null,
      updated_at: stat.updated_at,
    }))
  return [...manual, ...learned]
}

function aggregateNodeParameterStats(stats: NodeParameterStatRecord[]) {
  const grouped = new Map<string, NodeParameterStatRecord>()
  for (const stat of stats) {
    const classType = String(stat.class_type || '').trim()
    const field = String(stat.field || '').trim()
    if (!classType || !field) continue
    const key = `${classType}\u0000${field}`
    const count = Number.isFinite(Number(stat.count)) ? Number(stat.count) : 0
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { class_type: classType, field, count, updated_at: stat.updated_at })
      continue
    }
    existing.count += count
    if (String(stat.updated_at || '') > String(existing.updated_at || '')) {
      existing.updated_at = stat.updated_at
    }
  }
  return Array.from(grouped.values())
}

export function registerRecommendationRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/api/recommendation-rules', '/api/recommendation-rules/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      await ensureWorkspaceStructure(workspace)
      const enabled = parseBoolean(req.query.enabled)
      const skip = Math.max(0, Number(req.query.skip || 0) || 0)
      const limit = Math.max(1, Number(req.query.limit || 100) || 100)
      const rules = (await readRules(workspace))
        .filter(rule => enabled === undefined ? true : rule.enabled === enabled)
        .slice(skip, skip + limit)
      res.json(rules)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/api/recommendation-rules', '/api/recommendation-rules/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      await ensureWorkspaceStructure(workspace)
      const input = normalizedRuleInput(req.body)
      if (!isUsableRule(input)) return res.status(400).json(errorBody('class_type and field are required'))
      const rules = await readRules(workspace)
      const timestamp = nowIso()
      const rule: RecommendationRuleRecord = {
        id: rules.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        ...input,
        created_at: timestamp,
        updated_at: timestamp,
      }
      await writeRules(workspace, [...rules, rule])
      res.json(rule)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/recommendation-rules/combined', '/api/recommendation-rules/combined/'], async (_req, res) => {
    try {
      const workspace = getWorkspace()
      await ensureWorkspaceStructure(workspace)
      const [rules, stats] = await Promise.all([readRules(workspace), readStats(workspace)])
      res.json(buildCombinedRecommendationRules(rules, stats))
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/recommendation-rules/:id', '/api/recommendation-rules/:id/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      const rules = await readRules(workspace)
      const rule = rules.find(item => item.id === Number(req.params.id))
      if (!rule) return res.status(404).json(errorBody('rule not found'))
      res.json(rule)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/api/recommendation-rules/:id', '/api/recommendation-rules/:id/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      await ensureWorkspaceStructure(workspace)
      const rules = await readRules(workspace)
      const id = Number(req.params.id)
      const existing = rules.find(item => item.id === id)
      if (!existing) return res.status(404).json(errorBody('rule not found'))
      const input = normalizedRuleInput(req.body, existing)
      if (!isUsableRule(input)) return res.status(400).json(errorBody('class_type and field are required'))
      const updated: RecommendationRuleRecord = { ...existing, ...input, updated_at: nowIso() }
      await writeRules(workspace, rules.map(rule => rule.id === id ? updated : rule))
      res.json(updated)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/api/recommendation-rules/:id', '/api/recommendation-rules/:id/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      const rules = await readRules(workspace)
      const id = Number(req.params.id)
      if (!rules.some(rule => rule.id === id)) return res.status(404).json(errorBody('rule not found'))
      await writeRules(workspace, rules.filter(rule => rule.id !== id))
      res.status(204).send()
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/api/suggestions/report', '/api/suggestions/report/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      await ensureWorkspaceStructure(workspace)
      const items = Array.isArray(req.body?.items) ? req.body.items : []
      const stats = await readStats(workspace)
      const timestamp = nowIso()
      let appliedCount = 0
      for (const item of items) {
        const classType = String(item?.class_type ?? item?.classType ?? '').trim()
        const field = String(item?.field || '').trim()
        if (!classType || !field) continue
        appliedCount += 1
        const existing = stats.find(stat => stat.class_type === classType && stat.field === field)
        if (existing) {
          existing.count += 1
          existing.updated_at = timestamp
        } else {
          stats.push({ class_type: classType, field, count: 1, updated_at: timestamp })
        }
      }
      if (items.length > 0 && appliedCount === 0) {
        return res.status(400).json(errorBody('items with class_type and field are required'))
      }
      if (appliedCount === 0) return res.json({ status: 'ok' })
      await writeStats(workspace, stats)
      res.json({ status: 'ok' })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/suggestions/recommend', '/api/suggestions/recommend/'], async (req, res) => {
    try {
      const workspace = getWorkspace()
      const classType = String(req.query.class_type ?? req.query.classType ?? '').trim()
      if (!classType) return res.status(400).json(errorBody('class_type is required'))
      const limit = Math.max(1, Number(req.query.limit || 5) || 5)
      const stats = aggregateNodeParameterStats(await readStats(workspace))
        .filter(stat => stat.class_type === classType)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(stat => ({ field: stat.field, count: stat.count }))
      res.json(stats)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}
