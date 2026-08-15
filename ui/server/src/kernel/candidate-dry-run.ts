// ui/server/src/kernel/candidate-dry-run.ts
import { join } from 'node:path'
import { loadKernelContracts } from './contracts/store'
import { runKernelCandidate } from './codex/run-candidate'
import { padChapterNo } from './projection/naming'
import { getNovelChapter } from '../novel'

function arg(name: string, fallback = ''): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? String(process.argv[index + 1] || '') : fallback
}

const workspace = arg('workspace', '/Users/ruiyaosong/MangaForge-Studio/workspace')
const projectId = Number(arg('project', '3'))
const chapterId = Number(arg('chapter', '62'))
const contractId = arg('contract', 'oh-story-core.story-review.full')
const modelId = Number(arg('model', '0'))
const fake = process.argv.includes('--fake')

const { contracts } = loadKernelContracts(workspace)
const contract = contracts.find(item => item.id === contractId)
if (!contract) {
  console.error(`contract not found: ${contractId}`)
  process.exit(1)
}

const chapter = await getNovelChapter(workspace, chapterId, projectId)
if (!chapter) {
  console.error(`chapter not found: project=${projectId} chapter=${chapterId}`)
  process.exit(1)
}
const pad = padChapterNo(Number(chapter?.chapter_no || 0))
const fixture = join(import.meta.dir, 'codex', 'fixtures', 'fake-app-server.ts')

const result = await runKernelCandidate({
  workspace, projectId, chapterId, contract, modelId,
  ...(fake ? {
    sessionArgv: [process.execPath, fixture],
    sessionExtraEnv: {
      FAKE_SKILLS: JSON.stringify([{ name: contract.skill_name, path: `.agents/skills/${contract.skill_name}` }]),
      FAKE_SPAWN: '1',
      FAKE_WRITE_FILE: `审稿/第${pad}章.md`,
      FAKE_WRITE_CONTENT: 'Fallback: none\n（fixture 演练报告）',
      FAKE_AGENT_MESSAGE: 'fixture 演练完成',
    },
  } : {}),
})

if (!result.ok) {
  console.error('candidate failed:', result.error_code, result.message)
  console.error('job dir:', result.jobDir)
  process.exit(1)
}
console.log('job dir:', result.jobDir)
console.log('thread/turn:', result.threadId, result.turnId)
console.log('artifacts:')
for (const artifact of result.artifacts) console.log(`  - [${artifact.artifact_kind}] ${artifact.rel_path}`)
console.log('warnings:', result.warnings)
console.log('last message:', result.lastMessage.slice(0, 200))
console.log('spawn evidence:', JSON.stringify(result.spawnEvidence))
console.log('events lines:', (await Bun.file(result.eventsPath).text()).trim().split('\n').length)
