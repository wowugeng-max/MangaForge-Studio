import { describe, expect, test } from 'bun:test'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { collapseAdaptPackArtifacts } from './collapse-adapt-pack'

function userWriteChapterContract() {
  return {
    schema_version: 1,
    id: 'my-style.write-chapter.v1',
    pack_id: 'my-style',
    skill_name: 'write-chapter',
    variant: 'v1',
    verb: 'write_chapter',
    capability: 'rewrite',
    label: '风格写章',
    invoke: { mention: '$write-chapter', prompt: '写第 {{chapter_no}} 章。只改 {{scope_files}}。' },
    projection: { mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'user_brief'] },
    outputs: [{ artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true }],
    write_scope: ['正文/'],
    ignore: ['.story-review/'],
    gates: ['require_chapter_file', 'reject_outline_artifact'],
    commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'user_write' },
    sandbox: 'workspace-write',
    approval: 'never',
  }
}

function texts(map: Record<string, string>) {
  return (artifact: { rel_path: string }) => map[artifact.rel_path] ?? ''
}

describe('collapseAdaptPackArtifacts', () => {
  test('promotes a valid contracts/*.json to contract_json', () => {
    const valid = JSON.stringify(userWriteChapterContract())
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'attachment' }],
      readText: texts({ 'contracts/write_chapter.json': valid }),
    })
    expect(result.artifacts).toEqual([
      { rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' },
    ])
    expect(result.unsatisfied).toEqual([])
  })

  test('demotes invalid JSON to attachment and records the parse error', () => {
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' }],
      readText: texts({ 'contracts/write_chapter.json': '{not json}' }),
    })
    expect(result.artifacts[0].artifact_kind).toBe('attachment')
    expect(result.unsatisfied).toEqual([
      {
        rel_path: 'contracts/write_chapter.json',
        verb: 'write_chapter',
        errors: [expect.stringMatching(/JSON|parse|Unexpected/i) as unknown as string],
      },
    ])
    expect(result.unsatisfied.some(item => item.errors.includes('未写出 contracts/*.json'))).toBe(false)
  })

  test('demotes schema-invalid JSON to attachment', () => {
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' }],
      readText: texts({ 'contracts/write_chapter.json': JSON.stringify({ schema_version: 1, verb: 'write_chapter' }) }),
    })
    expect(result.artifacts[0].artifact_kind).toBe('attachment')
    expect(result.unsatisfied[0]?.rel_path).toBe('contracts/write_chapter.json')
    expect(result.unsatisfied[0]?.verb).toBe('write_chapter')
    expect(result.unsatisfied[0]?.errors.length).toBeGreaterThan(0)
  })

  test('demotes builtin contract id with CONTRACT_BUILTIN', () => {
    const builtin = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.chapter')!
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' }],
      readText: texts({ 'contracts/write_chapter.json': JSON.stringify(builtin) }),
    })
    expect(result.artifacts[0].artifact_kind).toBe('attachment')
    expect(result.unsatisfied).toEqual([
      { rel_path: 'contracts/write_chapter.json', verb: 'write_chapter', errors: ['CONTRACT_BUILTIN'] },
    ])
  })

  test('demotes template-unsatisfied JSON to attachment', () => {
    const bad = { ...userWriteChapterContract(), capability: 'attachment' }
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' }],
      readText: texts({ 'contracts/write_chapter.json': JSON.stringify(bad) }),
    })
    expect(result.artifacts[0].artifact_kind).toBe('attachment')
    expect(result.unsatisfied[0]?.errors.some(error => error.includes('capability'))).toBe(true)
  })

  test('synthesizes 未写出 contracts/*.json when no matching paths exist', () => {
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/_notes/write_chapter.md', artifact_kind: 'attachment' }],
      readText: texts({ 'contracts/_notes/write_chapter.md': '缺合同' }),
    })
    expect(result.artifacts).toEqual([
      { rel_path: 'contracts/_notes/write_chapter.md', artifact_kind: 'attachment' },
    ])
    expect(result.unsatisfied).toEqual([
      { rel_path: 'contracts/', verb: '', errors: ['未写出 contracts/*.json'] },
    ])
  })

  test('does not add the missing-file note when an invalid contracts/*.json already exists', () => {
    const result = collapseAdaptPackArtifacts({
      artifacts: [{ rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' }],
      readText: texts({ 'contracts/write_chapter.json': '{not json}' }),
    })
    expect(result.unsatisfied.map(item => item.errors.join(' ')).join(' ')).not.toContain('未写出 contracts/*.json')
  })
})
