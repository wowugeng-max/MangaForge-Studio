import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentReferencesDir, ohStoryCoreAgentsDir, ohStoryCoreRoot,
} from '../../novel-writing/oh-story-core/store'

const FALLBACK_AGENTS_DIR = join(import.meta.dir, '..', 'agents-fallback')

export type DeployKernelPackMountsInput = {
  workspace: string
  projectDir: string
  skillName: string
  mounts: readonly string[]
}

function packAgentsVersion(workspace: string): number {
  try {
    const pack = JSON.parse(readFileSync(join(ohStoryCoreRoot(workspace), 'pack.json'), 'utf8'))
    return Number(pack?.agents_version) || 0
  } catch {
    return 0
  }
}

export function deployKernelPackMounts(input: DeployKernelPackMountsInput): {
  skillPath: string | null
  missingReviewers: string[]
  deployedAgents: string[]
} {
  const { workspace, projectDir, skillName, mounts } = input
  let skillPath: string | null = null
  const missingReviewers: string[] = []
  const deployedAgents: string[] = []

  if (mounts.includes('skill_tree') && skillName) {
    const source = join(ohStoryCoreRoot(workspace), 'skills', skillName)
    if (existsSync(join(source, 'SKILL.md'))) {
      const link = join(projectDir, '.agents', 'skills', skillName)
      mkdirSync(dirname(link), { recursive: true })
      if (!existsSync(link)) symlinkSync(source, link)
      skillPath = link
    }
  }

  if (mounts.includes('agents')) {
    const targetDir = join(projectDir, '.codex', 'agents')
    mkdirSync(targetDir, { recursive: true })
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      const fromPack = join(ohStoryCoreAgentsDir(workspace), `${agent}.toml`)
      const fromFallback = join(FALLBACK_AGENTS_DIR, `${agent}.toml`)
      const source = existsSync(fromPack) ? fromPack : existsSync(fromFallback) ? fromFallback : null
      if (!source) { missingReviewers.push(agent); continue }
      copyFileSync(source, join(targetDir, `${agent}.toml`))
      deployedAgents.push(agent)
    }
    const referencesSource = ohStoryCoreAgentReferencesDir(workspace)
    if (existsSync(referencesSource)) {
      cpSync(referencesSource, join(projectDir, '.codex', 'skills', 'story-setup', 'references', 'agent-references'), { recursive: true })
    }
    writeFileSync(join(projectDir, '.story-deployed'), [
      `agents_version: ${packAgentsVersion(workspace)}`,
      'target_cli: codex',
      'resolver_strategy: kernel-projection',
      'references_dir: .codex/skills/story-setup/references/agent-references',
      '',
    ].join('\n'))
  }

  return { skillPath, missingReviewers, deployedAgents }
}
