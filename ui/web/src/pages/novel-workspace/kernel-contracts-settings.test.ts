import { describe, expect, mock, test } from 'bun:test'
import type { KernelContractListItem, KernelJobDetail } from '../../kernel/jobs/types'
import type { WritingSkillCatalogItem } from './writingSkillsModel'
import {
  KERNEL_DEFAULT_PICKER_VERBS,
  defaultOptionsForVerb,
  defaultPickerVerbs,
  installedAdaptTargets,
  legalAdaptContracts,
  overlayPickerOntoDefaults,
  parseAdaptUnsatisfied,
  previewAdaptContractFields,
  reloadContractsAfterAdaptCommit,
} from './kernel-contracts-settings'

function catalogItem(partial: Partial<WritingSkillCatalogItem> & Pick<WritingSkillCatalogItem, 'id'>): WritingSkillCatalogItem {
  return {
    label: partial.id,
    description: '',
    builtin: false,
    supports_mode: false,
    ...partial,
  }
}

function detail(partial: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: 'job-1', status: 'awaiting_selection' },
    candidates: [],
    artifacts: [],
    ...partial,
  }
}

describe('installedAdaptTargets', () => {
  test('keeps only non-builtin catalog skills such as my-style', () => {
    const catalog = [
      catalogItem({ id: 'fiction-humanizer-zh', label: '小说去AI味', builtin: true, supports_mode: true }),
      catalogItem({ id: 'my-style', label: 'My Style', builtin: false }),
    ]
    expect(installedAdaptTargets(catalog).map(item => item.id)).toEqual(['my-style'])
  })
})

describe('KERNEL_DEFAULT_PICKER_VERBS', () => {
  test('does not include adapt_pack', () => {
    expect(KERNEL_DEFAULT_PICKER_VERBS).not.toContain('adapt_pack')
    expect([...KERNEL_DEFAULT_PICKER_VERBS]).toEqual([
      'open_book', 'expand_outline', 'write_chapter', 'write_continue',
      'rewrite_chapter', 'review_chapter', 'apply_review', 'deslop_chapter',
    ])
    expect([...defaultPickerVerbs()]).toEqual([...KERNEL_DEFAULT_PICKER_VERBS])
  })
})

describe('parseAdaptUnsatisfied', () => {
  test('returns [] for missing, non-json, or non-array metadata', () => {
    expect(parseAdaptUnsatisfied(null)).toEqual([])
    expect(parseAdaptUnsatisfied(undefined)).toEqual([])
    expect(parseAdaptUnsatisfied(detail())).toEqual([])
    expect(parseAdaptUnsatisfied(detail({
      candidates: [{ id: 'c1', contract_id: 'meta', status: 'failed', metadata: '{not json' }],
    }))).toEqual([])
    expect(parseAdaptUnsatisfied(detail({
      candidates: [{ id: 'c1', contract_id: 'meta', status: 'failed', metadata: '{"adapt_unsatisfied":{}}' }],
    }))).toEqual([])
  })

  test('reads adapt_unsatisfied from the first candidate metadata', () => {
    const items = [{ rel_path: 'contracts/rewrite_chapter.json', verb: 'rewrite_chapter', errors: ['CONTRACT_BUILTIN'] }]
    expect(parseAdaptUnsatisfied(detail({
      candidates: [{
        id: 'c1',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'failed',
        metadata: JSON.stringify({ adapt_unsatisfied: items }),
      }],
    }))).toEqual(items)
  })
})

describe('legalAdaptContracts', () => {
  test('keeps only contract_json artifacts', () => {
    expect(legalAdaptContracts(detail({
      artifacts: [
        { id: 'a1', candidate_id: 'c1', rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' },
        { id: 'a2', candidate_id: 'c1', rel_path: 'contracts/rewrite_chapter.json', artifact_kind: 'attachment' },
      ],
    })).map(item => item.id)).toEqual(['a1'])
    expect(legalAdaptContracts(null)).toEqual([])
  })
})

describe('previewAdaptContractFields', () => {
  test('reads id, verb, and label from a write_chapter user contract JSON', () => {
    const content = JSON.stringify({
      schema_version: 1,
      id: 'my-style.write-chapter.v1',
      pack_id: 'my-style',
      skill_name: 'write-chapter',
      variant: 'v1',
      verb: 'write_chapter',
      capability: 'rewrite',
      label: '风格写章',
      invoke: { mention: '$write-chapter', prompt: '写第 {{chapter_no}} 章。只改 {{scope_files}}。' },
      projection: { mounts: ['current_chapter'] },
      outputs: [],
      write_scope: ['正文/'],
      ignore: [],
      gates: [],
      commit: { mode: 'auto_if_single', domain_writes: ['chapters'], source: 'user_write' },
      sandbox: 'workspace-write',
      approval: 'never',
    })
    const artifacts = legalAdaptContracts(detail({
      artifacts: [
        { id: 'art-1', candidate_id: 'c1', rel_path: 'contracts/write_chapter.json', artifact_kind: 'contract_json' },
      ],
    }))
    expect(previewAdaptContractFields(content, artifacts[0])).toEqual({
      id: 'my-style.write-chapter.v1',
      verb: 'write_chapter',
      label: '风格写章',
    })
    expect(previewAdaptContractFields(content, artifacts[0])).not.toEqual({
      id: artifacts[0].rel_path || artifacts[0].id,
      verb: '',
      label: '',
    })
  })

  test('falls back to verb from rel_path when JSON parse fails', () => {
    expect(previewAdaptContractFields('{not json}', {
      id: 'art-1',
      rel_path: 'contracts/write_chapter.json',
    })).toEqual({
      id: 'art-1',
      verb: 'write_chapter',
      label: '',
    })
  })
})

describe('defaultOptionsForVerb', () => {
  test('keeps implemented contracts for that verb', () => {
    const contracts: KernelContractListItem[] = [
      { id: 'user.write.v1', label: '用户写章', verb: 'write_chapter', implemented: true },
      { id: 'user.write.wip', label: '未实现写章', verb: 'write_chapter', implemented: false },
      { id: 'user.rewrite.v1', label: '用户回炉', verb: 'rewrite_chapter', implemented: true },
    ]
    expect(defaultOptionsForVerb('write_chapter', contracts).map(item => item.id)).toEqual(['user.write.v1'])
  })
})

describe('reloadContractsAfterAdaptCommit', () => {
  test('after successful commit, listContracts is called for picker refresh', async () => {
    const listContracts = mock(async () => ({
      ok: true as const,
      contracts: [
        { id: 'user.write.v1', label: '用户写章', verb: 'write_chapter', implemented: true },
      ],
    }))
    const next = await reloadContractsAfterAdaptCommit({
      committed: true,
      listContracts,
    })
    expect(listContracts).toHaveBeenCalledTimes(1)
    expect(next?.map(item => item.id)).toEqual(['user.write.v1'])
  })

  test('does not listContracts when adopt did not succeed', async () => {
    const listContracts = mock(async () => ({
      ok: true as const,
      contracts: [{ id: 'user.write.v1', label: '用户写章', verb: 'write_chapter', implemented: true }],
    }))
    expect(await reloadContractsAfterAdaptCommit({ committed: false, listContracts })).toBe(null)
    expect(listContracts).not.toHaveBeenCalled()
  })
})

describe('overlayPickerOntoDefaults', () => {
  test('overlays picker verbs and leaves adapt_pack from GET', () => {
    const next = overlayPickerOntoDefaults(
      {
        write_chapter: ['oh-story-core.story-long-write.chapter'],
        adapt_pack: ['mangaforge.adapt-pack.meta'],
        rewrite_chapter: ['oh-story-core.story-rewrite.chapter'],
      },
      { write_chapter: 'user.write.v1' },
    )
    expect(next.write_chapter).toEqual(['user.write.v1'])
    expect(next.adapt_pack).toEqual(['mangaforge.adapt-pack.meta'])
    expect(next.rewrite_chapter).toEqual(['oh-story-core.story-rewrite.chapter'])
  })
})
