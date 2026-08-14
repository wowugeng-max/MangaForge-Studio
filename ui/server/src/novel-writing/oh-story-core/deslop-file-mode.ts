import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { hasStoryDeslopScripts, storyDeslopScriptsDir } from './store'

export const OH_STORY_DESLOP_MAX_ROUNDS = 3

export type DeslopFinding = {
  severity?: string
  type?: string
  message?: string
  excerpt?: string
}

export type DeslopScanResult = {
  findings: DeslopFinding[]
  log: string
}

export type DeslopNormalizeResult = {
  text: string
  log: string
}

export function parseDeslopJsonFindings(stdout: string): DeslopFinding[] {
  try {
    const parsed = JSON.parse(String(stdout || ''))
    return Array.isArray(parsed?.findings) ? parsed.findings : []
  } catch {
    return []
  }
}

export function blockingDeslopFindings(findings: DeslopFinding[]): DeslopFinding[] {
  return findings.filter(item => String(item?.severity || '') === 'blocking')
}

export type DeslopAiGrade = '轻度' | '中度' | '重度' | ''

export function parseDeslopAiGrade(report: string): DeslopAiGrade {
  const match = String(report || '').match(/AI味等级：\s*(轻度|中度|重度)/)
  return (match?.[1] || '') as DeslopAiGrade
}

export function requiredDeslopRounds(grade: DeslopAiGrade | string): number {
  if (grade === '重度') return 3
  if (grade === '中度') return 2
  return 1
}

export function deslopPassNote(round: number): string {
  if (round === 2) return '【本轮】Pass 2（去书面化）。上一轮已做检测与去泛化。未点名的句子原样保留，禁止整章重写。'
  if (round === 3) return '【本轮】Pass 3（回自然感）。补节奏和对话差异，不要整章重写。'
  return ''
}

function runNodeScript(scriptPath: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: dirname(scriptPath),
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += String(chunk) })
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: Number(code ?? 1) })
    })
  })
}

function workFile(workspace: string, chapterId: number) {
  return join(storyDeslopScriptsDir(workspace), '..', '..', '..', 'tmp', `deslop-chapter-${chapterId}.txt`)
}

export async function defaultScanDeslopText(
  workspace: string,
  chapterId: number,
  text: string,
  phase: 'prescan' | 'rescan',
): Promise<DeslopScanResult> {
  if (!hasStoryDeslopScripts(workspace)) {
    throw Object.assign(new Error('oh-story core suite is not installed'), {
      code: 'OH_STORY_CORE_NOT_INSTALLED',
    })
  }
  const filePath = workFile(workspace, chapterId)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, text, 'utf8')
  const dir = storyDeslopScriptsDir(workspace)
  const scripts = phase === 'prescan'
    ? ['check-ai-patterns.js']
    : ['check-ai-patterns.js', 'check-degeneration.js']
  const findings: DeslopFinding[] = []
  const logs: string[] = []
  for (const script of scripts) {
    const result = await runNodeScript(join(dir, script), [
      '--check',
      '--json',
      '--fail-on=blocking',
      filePath,
    ])
    if (result.exitCode === 2) {
      throw new Error(`${script} failed: ${result.stderr || result.stdout}`)
    }
    findings.push(...parseDeslopJsonFindings(result.stdout))
    logs.push(`${script}:${result.exitCode}`)
  }
  return { findings, log: logs.join('\n') }
}

export async function defaultNormalizeDeslopText(
  workspace: string,
  chapterId: number,
  text: string,
): Promise<DeslopNormalizeResult> {
  if (!hasStoryDeslopScripts(workspace)) {
    throw Object.assign(new Error('oh-story core suite is not installed'), {
      code: 'OH_STORY_CORE_NOT_INSTALLED',
    })
  }
  const filePath = workFile(workspace, chapterId)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, text, 'utf8')
  const scriptPath = join(storyDeslopScriptsDir(workspace), 'normalize-punctuation.js')
  const result = await runNodeScript(scriptPath, [filePath])
  if (result.exitCode === 2) {
    throw new Error(`normalize-punctuation.js failed: ${result.stderr || result.stdout}`)
  }
  return {
    text: readFileSync(filePath, 'utf8'),
    log: result.stdout.trim() || `normalize:${result.exitCode}`,
  }
}
