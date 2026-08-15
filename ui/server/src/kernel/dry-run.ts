import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadKernelContracts } from './contracts/store'
import { kernelJobDir } from './paths'
import { deployKernelPackMounts } from './projection/pack-mounts'
import { projectKernelSubject } from './projection/project'
import { writeKernelSnapshot } from './projection/snapshot'
import { writeCodexHome } from './providers/translate'
import { loadKernelRuntime } from './runtime'
import { renderKernelTemplate } from './template'

function arg(name: string, fallback = ''): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? String(process.argv[index + 1] || '') : fallback
}

const workspace = arg('workspace', '/Users/ruiyaosong/MangaForge-Studio/workspace')
const projectId = Number(arg('project', '3'))
const chapterId = Number(arg('chapter', '62'))
const contractId = arg('contract', 'oh-story-core.story-review.full')
const modelId = Number(arg('model', '0'))

const { contracts } = loadKernelContracts(workspace)
const contract = contracts.find(item => item.id === contractId)
if (!contract) {
  console.error(`contract not found: ${contractId}`)
  process.exit(1)
}

const jobDir = kernelJobDir(workspace, `dryrun-${Date.now()}`)
const projectDir = join(jobDir, 'project')
mkdirSync(projectDir, { recursive: true })

const { vars, files } = await projectKernelSubject({ workspace, projectId, chapterId, contract, projectDir })
const packResult = deployKernelPackMounts({ workspace, projectDir, skillName: contract.skill_name, mounts: contract.projection.mounts })
writeKernelSnapshot(projectDir, join(jobDir, 'snapshot'))

const prompt = `${contract.invoke.mention}\n${renderKernelTemplate(contract.invoke.prompt, vars)}`.trim()
writeFileSync(join(jobDir, 'prompt.txt'), prompt)

if (modelId) {
  const runtime = loadKernelRuntime(workspace)
  const home = await writeCodexHome({
    workspace, jobDir, modelId,
    agents: packResult.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  console.log('codex-home:', home)
}

console.log('job dir:', jobDir)
console.log('projected files:', files.length)
for (const file of files) console.log('  -', file)
console.log('skill symlink:', packResult.skillPath)
console.log('missing reviewers:', packResult.missingReviewers)
