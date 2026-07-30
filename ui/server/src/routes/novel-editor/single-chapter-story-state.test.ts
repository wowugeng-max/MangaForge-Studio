import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelSettingEntity,
  claimProseQualityReceipt,
  failProseQualityReceipt,
  getNovelProject,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  mutateNovelProjectReferenceConfig,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  withProseQualityReceiptLease,
} from '../../novel'
import { openDb } from '../../novel/core'
import { setNovelMutationTestHook } from '../../novel-test-support'
import { createStoryStateMachineMethods } from '../../novel-writing-service/service/story-state-machine'
import { compactPreparedStoryStateForRecovery } from '../../novel-writing-service/service/story-state-machine-update'
import {
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
} from '../../novel-writing-service/post-delivery/asset-banks'
import { normalizeEstablishedEvent } from '../../novel-writing/established-event-canon'
import {
  buildForeshadowLifecycleBoard,
  materializeStoryRelations,
  relationPairKey,
} from '../novel-setting-story-relations'
import { createProseQualityReview } from './builders'
import { revisionTextHash } from './revision-candidate-admission'
import {
  applySingleChapterStoryState,
  prepareSingleChapterStoryState,
  storyStateReceiptKey,
  type SingleChapterStoryStateReceipt,
} from './single-chapter-story-state'

function parsedPayload(value: any) {
  if (value && typeof value === 'object') return value
  try {
    return JSON.parse(String(value || '{}'))
  } catch {
    return {}
  }
}

function storyStatePayload(key: string) {
  return {
    state_delta: {
      current_time: `${key}-time`,
      character_positions: { [key]: `${key}-location` },
      open_questions: [`${key}-question`],
      next_chapter_priorities: [`${key}-priority`],
      progress_summary: { notes: `${key}-complete` },
    },
    character_updates: [{ name: '李玄', current_state: { goals: { [key]: true } } }],
    setting_updates: [{ name: '旧印章', entity_type: 'item', state_delta: { constraints: { [key]: true } } }],
    storyline_updates: [{ name: '追查旧印章', state_delta: { constraints: { [key]: true } } }],
    discovered_assets: [{ name: `${key}新物件`, entity_type: 'item', evidence: `${key}正文证据` }],
  }
}

test('recovery compaction whitelists resumable state and strips prose-bearing nested data', () => {
  const compacted: any = compactPreparedStoryStateForRecovery({
    state_delta: {
      current_time: 'night',
      content: 'SHORT_UNKNOWN_STATE_PROSE',
      relationship_graph: {
        '李玄-顾舟': {
          status: '有限结盟',
          cost: '共同承担追查风险',
          commentary: 'UNKNOWN_RELATION_COMMENTARY',
        },
      },
      timeline: [{ event: '李玄抵达旧码头', source_excerpt: '他踏上旧码头。', commentary: 'UNKNOWN_TIMELINE_COMMENTARY' }],
      progress_summary: {
        last_completed_chapter: 1,
        notes: '下一章继续追查铜钥匙',
        commentary: 'UNKNOWN_PROGRESS_COMMENTARY',
      },
      daily_context_snapshot: {
        current_chapter: 1,
        current_scene: '旧码头',
        pending_clues: ['铜钥匙'],
        commentary: 'UNKNOWN_DAILY_COMMENTARY',
      },
      layered_memory_context: {
        recent_chapter_details: [{ chapter_no: 1, event: '发现铜钥匙', commentary: 'UNKNOWN_MEMORY_COMMENTARY' }],
        archive_refs: ['追踪/归档/第001-010章.md'],
        commentary: 'UNKNOWN_LAYERED_COMMENTARY',
      },
      style_fingerprint_contract: {
        source: 'existing_story_state',
        policy: '保持中长句节奏',
        commentary: 'UNKNOWN_STYLE_COMMENTARY',
      },
      prose_style_fingerprint: { sentence_rhythm: 'short' },
      prose_status: 'accepted',
      prose: 'DIRECT_PROSE_SECRET',
      chapter_text: 'SNAKE_PROSE_SECRET',
      chapterText: 'CAMEL_PROSE_SECRET',
      source_text: 'SNAKE_SOURCE_SECRET',
      sourceText: 'CAMEL_SOURCE_SECRET',
      nested: {
        kept: true,
        contextPackage: { prose: 'CONTEXT_SECRET' },
        providerMessages: [{ content: 'PROVIDER_SECRET' }],
        prompt: 'PROMPT_SECRET',
        messages: ['MESSAGE_SECRET'],
        raw_response: 'RAW_SNAKE_SECRET',
        rawResponse: 'RAW_CAMEL_SECRET',
        story_state_sync_receipts: { old: { payload: 'OLD_RECEIPT_SECRET' } },
      },
    },
    next_reference_config: {
      story_state: { current_time: 'must-not-copy-full-config' },
      story_state_sync_receipts: { older: { payload: 'EARLIER_RECEIPT_SECRET' } },
    },
    character_updates: [{
      name: '李玄',
      current_state: {
        location: '旧码头',
        items: ['铜钥匙'],
        body: 'SHORT_UNKNOWN_CHARACTER_PROSE',
        message: 'NESTED_MESSAGE_SECRET',
      },
    }],
    setting_updates: [{ name: '旧印章', state_delta: { found: true, description: 'UNKNOWN_SETTING_DESCRIPTION' } }],
    storyline_updates: [{ name: '追查旧印章', state_delta: { active: true, description: 'UNKNOWN_STORYLINE_DESCRIPTION' } }],
    sync_reports: { state_delta_completeness: { planned_count: 1, missed: [] } },
    hard_failures: [],
    payload: {
      discovered_assets: [{ name: '铜钥匙', evidence: '可恢复证据' }],
      ip_scene_candidates: [{ title: '门前对峙', summary: '铜钥匙在众人面前暴露' }],
      foreshadowing_status: { seal: 'open' },
      response: 'RESPONSE_SECRET',
    },
    receipt_binding: { key: 'must-remain-memory-only' },
    unrelated_top_level: { kept: false },
  } as any)
  const serialized = JSON.stringify(compacted)

  expect(compacted).toEqual({
    state_delta: {
      current_time: 'night',
      relationship_graph: {
        '李玄-顾舟': { status: '有限结盟', cost: '共同承担追查风险' },
      },
      timeline: [{ event: '李玄抵达旧码头', source_excerpt: '他踏上旧码头。' }],
      progress_summary: { last_completed_chapter: 1, notes: '下一章继续追查铜钥匙' },
      daily_context_snapshot: { current_chapter: 1, current_scene: '旧码头', pending_clues: ['铜钥匙'] },
      layered_memory_context: {
        recent_chapter_details: [{ chapter_no: 1, event: '发现铜钥匙' }],
        archive_refs: ['追踪/归档/第001-010章.md'],
      },
      style_fingerprint_contract: { source: 'existing_story_state', policy: '保持中长句节奏' },
    },
    character_updates: [{ name: '李玄', current_state: { location: '旧码头', items: ['铜钥匙'] } }],
    setting_updates: [{ name: '旧印章', state_delta: { found: true } }],
    storyline_updates: [{ name: '追查旧印章', state_delta: { active: true } }],
    sync_reports: { state_delta_completeness: { planned_count: 1, missed: [] } },
    payload: {
      discovered_assets: [{ name: '铜钥匙', evidence: '可恢复证据', source_excerpt: '可恢复证据' }],
      ip_scene_candidates: [{ title: '门前对峙', summary: '铜钥匙在众人面前暴露' }],
      foreshadowing_status: { seal: 'open' },
    },
    hard_failures: [],
  })
  expect(compacted.next_reference_config).toBeUndefined()
  expect(compacted.receipt_binding).toBeUndefined()
  expect(compacted.unrelated_top_level).toBeUndefined()
  for (const secret of [
    'DIRECT_PROSE_SECRET', 'SNAKE_PROSE_SECRET', 'CAMEL_PROSE_SECRET', 'SNAKE_SOURCE_SECRET', 'CAMEL_SOURCE_SECRET',
    'CONTEXT_SECRET', 'PROVIDER_SECRET', 'PROMPT_SECRET', 'MESSAGE_SECRET',
    'RAW_SNAKE_SECRET', 'RAW_CAMEL_SECRET', 'OLD_RECEIPT_SECRET', 'EARLIER_RECEIPT_SECRET',
    'NESTED_MESSAGE_SECRET', 'RESPONSE_SECRET', 'must-remain-memory-only',
    'SHORT_UNKNOWN_STATE_PROSE', 'SHORT_UNKNOWN_CHARACTER_PROSE',
    'UNKNOWN_RELATION_COMMENTARY',
    'UNKNOWN_TIMELINE_COMMENTARY', 'UNKNOWN_PROGRESS_COMMENTARY', 'UNKNOWN_DAILY_COMMENTARY',
    'UNKNOWN_MEMORY_COMMENTARY', 'UNKNOWN_LAYERED_COMMENTARY', 'UNKNOWN_STYLE_COMMENTARY',
    'UNKNOWN_SETTING_DESCRIPTION', 'UNKNOWN_STORYLINE_DESCRIPTION',
  ]) expect(serialized).not.toContain(secret)
})

test('recovery compaction rejects allowed semantic state that exceeds its UTF-8 checkpoint quota', () => {
  let error: any = null
  try {
    compactPreparedStoryStateForRecovery({
    state_delta: {
        current_time: '汉'.repeat(30_000),
        next_chapter_priorities: Array.from({ length: 128 }, (_, index) => `优先事项${index}${'界'.repeat(1_000)}`),
    },
      character_updates: [],
    setting_updates: [],
    storyline_updates: [],
    sync_reports: {},
    hard_failures: [],
    payload: {},
  } as any)
  } catch (caught) {
    error = caught
  }
  expect(error).toMatchObject({ code: 'STORY_STATE_RECOVERY_CHECKPOINT_TOO_LARGE' })
})

test('recovery compaction preserves documented and Phase A semantic fields', () => {
  const compacted: any = compactPreparedStoryStateForRecovery({
    state_delta: {
      foreshadowing_status: {
        '旧印章来历': { payoff_status: 'paid', clue: '旧臣避开腰牌', triggered: true },
      },
    },
    character_updates: [{
      name: '林青禾',
      current_state: {
        public_image: '公开作证后得罪会长',
        relationship_attitudes: '有限互信',
      },
    }],
    setting_updates: [{
      name: '旧印章',
      entity_type: 'item',
      state_delta: {
        current_time: '子时',
        triggered: true,
        current_owner: '李玄',
      },
      actual_state_change: { owner_rule: '只能由李玄持有' },
    }],
    storyline_updates: [{
      name: '追查旧印章',
      entity_type: 'mainline',
      actual_state_change: {
        current_state: '当众压住王府管事',
        payoff_status: 'paid',
        clue: '旧臣避开腰牌',
        attitude_shift: '从旁观转为有限作证',
        leaked: true,
      },
      summary: '追查继续推进',
    }],
    sync_reports: {},
    hard_failures: [],
    payload: {
      foreshadowing_status: {
        '旧印章来历': { payoff_status: 'paid', clue: '旧臣避开腰牌', triggered: true },
      },
      discovered_assets: [{
        entity_type: 'item',
        name: '铜钥匙',
        first_chapter_no: 1,
        constraints_json: {
          owner_rule: '只能由李玄持有',
          forbidden_reveal: '不得提前揭露钥匙来源',
        },
        state_json: {
          first_seen_chapter: 1,
          current_owner: '李玄',
          triggered: false,
        },
      }],
    },
  } as any)

  expect(compacted).toMatchObject({
    state_delta: {
      foreshadowing_status: {
        '旧印章来历': { payoff_status: 'paid', clue: '旧臣避开腰牌', triggered: true },
      },
    },
    character_updates: [{
      name: '林青禾',
      current_state: {
        public_image: '公开作证后得罪会长',
        relationship_attitudes: '有限互信',
      },
    }],
    setting_updates: [{
      state_delta: { current_time: '子时', triggered: true, current_owner: '李玄' },
      actual_state_change: { owner_rule: '只能由李玄持有' },
    }],
    storyline_updates: [{
      actual_state_change: {
        current_state: '当众压住王府管事',
        payoff_status: 'paid',
        clue: '旧臣避开腰牌',
        attitude_shift: '从旁观转为有限作证',
        leaked: true,
      },
    }],
    payload: {
      foreshadowing_status: {
        '旧印章来历': { payoff_status: 'paid', clue: '旧臣避开腰牌', triggered: true },
      },
      discovered_assets: [{
        constraints_json: {
          owner_rule: '只能由李玄持有',
          forbidden_reveal: '不得提前揭露钥匙来源',
        },
        state_json: { first_seen_chapter: 1, current_owner: '李玄', triggered: false },
      }],
    },
  })
})

test('recovery compaction preserves authoritative relationship and foreshadow fields', () => {
  const compacted: any = compactPreparedStoryStateForRecovery({
    state_delta: {
      character_relationships: {
        '李玄-顾舟': {
          party_a: '李玄',
          party_b: '顾舟',
          current_status: '有限结盟',
          story_relation_type: '联盟',
          emotion: '正面',
          start_chapter_no: 3,
          change_nodes: [{ chapter_no: 4, note: '共同发现旧印章', event_id: 'evt-4', kind: 'cooperation' }],
        },
        '林青禾-李玄': {
          a: '林青禾',
          b: '李玄',
          status: '有限互信',
          relation_type: '工作',
          start: 5,
        },
      },
      relationship_graph: {
        '李玄↔王府管事': {
          party_a: '李玄',
          party_b: '王府管事',
          status: '公开对立',
          type: '冲突',
        },
      },
      foreshadowing_status: {
        '旧印章来历': {
          summary: '旧臣见到印章后避开',
          detail: '尚未揭示具体来历',
          lifecycle: '已埋',
          importance: '高',
          plant_chapter_no: 3,
          expected_resolve_chapter_no: 12,
          resolve_chapter_no: null,
          planted_at: '第3章',
          due: '第12章',
          resolved_at: null,
        },
      },
    },
    character_updates: [],
    setting_updates: [],
    storyline_updates: [],
    sync_reports: {},
    hard_failures: [],
    payload: {},
  } as any)

  expect(compacted.state_delta).toEqual({
    character_relationships: {
      '李玄-顾舟': {
        party_a: '李玄',
        party_b: '顾舟',
        current_status: '有限结盟',
        story_relation_type: '联盟',
        emotion: '正面',
        start_chapter_no: 3,
        change_nodes: [{ chapter_no: 4, note: '共同发现旧印章', event_id: 'evt-4', kind: 'cooperation' }],
      },
      '林青禾-李玄': {
        a: '林青禾',
        b: '李玄',
        status: '有限互信',
        relation_type: '工作',
        start: 5,
      },
    },
    relationship_graph: {
      '李玄↔王府管事': {
        party_a: '李玄',
        party_b: '王府管事',
        status: '公开对立',
        type: '冲突',
      },
    },
    foreshadowing_status: {
      '旧印章来历': {
        summary: '旧臣见到印章后避开',
        detail: '尚未揭示具体来历',
        lifecycle: '已埋',
        importance: '高',
        plant_chapter_no: 3,
        expected_resolve_chapter_no: 12,
        resolve_chapter_no: null,
        planted_at: '第3章',
        due: '第12章',
        resolved_at: null,
      },
    },
  })
})

test('recovery compaction validates dynamic keys and strips unknown canon prose', () => {
  const paragraphKey = `这是一段不应被当作角色名的正文。${'他穿过长廊继续追查。'.repeat(12)}`
  const compacted: any = compactPreparedStoryStateForRecovery({
    state_delta: {
      character_positions: {
        '李玄': '旧码头',
        [paragraphKey]: '不应保留',
      },
      canon_facts: [{ fact: '旧印章属于前朝密卫', description: 'CANON_DESCRIPTION_PROSE' }],
      style_fingerprint: '文风指纹：目标句长带 18-36 字',
    },
    character_updates: [],
    setting_updates: [],
    storyline_updates: [],
    sync_reports: {},
    hard_failures: [],
    payload: {},
  } as any)
  const serialized = JSON.stringify(compacted)

  expect(compacted.state_delta.character_positions).toEqual({ '李玄': '旧码头' })
  expect(compacted.state_delta.canon_facts).toEqual([{ fact: '旧印章属于前朝密卫' }])
  expect(compacted.state_delta.style_fingerprint).toBe('文风指纹：目标句长带 18-36 字')
  expect(serialized).not.toContain('CANON_DESCRIPTION_PROSE')
  expect(serialized).not.toContain(paragraphKey)
})

test('recovery compaction drops arbitrary nested unknown fields from every persisted branch', () => {
  const compacted: any = compactPreparedStoryStateForRecovery({
    state_delta: {
      canon_facts: [{ fact: '旧印章为真', description: { arbitrary_nested: 'ARBITRARY_STATE' } }],
    },
    character_updates: [{
      name: '李玄',
      current_state: { goals: { '追查旧印章': { status: { arbitrary_nested: 'ARBITRARY_CHARACTER' } } } },
    }],
    setting_updates: [{
      name: '旧印章',
      state_delta: { constraints: { '归属': { status: { arbitrary_nested: 'ARBITRARY_SETTING' } } } },
    }],
    storyline_updates: [{
      name: '追查旧印章',
      state_delta: { constraints: { '进展': { status: { arbitrary_nested: 'ARBITRARY_STORYLINE' } } } },
    }],
    sync_reports: {
      state_delta_completeness: { missed: [{ key: 'timeline', evidence: { arbitrary_nested: 'ARBITRARY_SYNC' } }] },
    },
    hard_failures: [{
      key: 'state_delta_completeness',
      message: '状态不完整',
      source: 'story_state',
      details: [{ key: 'timeline', evidence: { arbitrary_nested: 'ARBITRARY_FAILURE' } }],
    }],
    payload: {
      discovered_assets: [{ name: '铜钥匙', evidence: { arbitrary_nested: 'ARBITRARY_ASSET' } }],
      ip_scene_candidates: [{ title: '门前对峙', summary: { arbitrary_nested: 'ARBITRARY_SCENE' } }],
      foreshadowing_status: { '旧印章来历': { status: { arbitrary_nested: 'ARBITRARY_FORESHADOW' } } },
    },
  } as any)
  const serialized = JSON.stringify(compacted)

  expect(serialized).not.toContain('arbitrary_nested')
  expect(serialized).not.toContain('ARBITRARY_')
})

test('recovery compaction preserves every established-event normalizer alias contract', () => {
  const fixtures = [
    {
      id: 'evt-canonical',
      chapter_no: 2,
      kind: 'promise',
      subject: '李玄',
      predicate: '承诺',
      fact: '李玄承诺交还旧印章',
      source_excerpt: '李玄收起印章，说会亲手交还。',
      lock_level: 'hard',
      last_seen_chapter: 3,
      confidence: 0.9,
      status: 'confirmed',
      cause: '偿还旧臣人情',
      mechanism: '当面承诺',
      constraints: ['不得转交他人'],
      aliases: ['归还印章'],
      tags: ['promise'],
    },
    {
      id: 'evt-camel',
      chapterNo: 4,
      kind: 'identity_reveal',
      name: '顾舟',
      aspect: '身份',
      text: '顾舟是前朝密卫后人',
      sourceExcerpt: '顾舟取出密卫铜牌。',
      lockLevel: 'soft',
      lastSeenChapter: 5,
      confidence: 0.8,
    },
    {
      id: 'evt-fallback',
      chapter_no: 6,
      kind: 'secret_known',
      who: '林青禾',
      predicate: '得知',
      summary: '林青禾已知道旧印章来历',
      evidence: '她看完密信，将印章推回桌上。',
      lock_level: 'hard',
      last_seen_chapter: 6,
      confidence: 0.95,
    },
    {
      id: 'evt-falsy-canonical',
      chapter_no: 0,
      chapterNo: 7,
      kind: 'identity_reveal',
      subject: '',
      name: '沈烛',
      predicate: null,
      aspect: '身份',
      fact: '',
      text: '沈烛是旧案唯一的幸存者',
      source_excerpt: null,
      evidence: '沈烛从袖中取出当年的案卷。',
      lock_level: '',
      lockLevel: 'hard',
      last_seen_chapter: 0,
      lastSeenChapter: 7,
      confidence: 0.92,
    },
  ]

  for (const fixture of fixtures) {
    const before = normalizeEstablishedEvent(fixture)
    const compacted: any = compactPreparedStoryStateForRecovery({
      state_delta: { established_events: [fixture] },
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: {},
      hard_failures: [],
      payload: {},
    } as any)
    const after = normalizeEstablishedEvent(compacted.state_delta.established_events[0])
    expect(after).toEqual(before)
  }
})

test('recovery compaction preserves every discovered-asset normalizer alias contract', () => {
  const fixtures = [
    {
      entity_type: 'item',
      name: '铜钥匙',
      summary: '可以打开旧院地库',
      evidence: '李玄从夹层取出铜钥匙。',
      source_excerpt: '夹层里躺着一枚铜钥匙。',
      first_chapter_no: 3,
      constraints_json: { owner_rule: '只能由李玄持有' },
      state_json: { current_owner: '李玄' },
    },
    {
      type: 'ability',
      title: '听风辨位',
      description: '可循风声定位暗门',
      quote: '他闭眼听见墙后的回响。',
      constraints: { rule: '必须保持安静' },
      suggested_state: { available: true },
    },
    {
      entity_type: 'character',
      name: '秦建国',
      role: '战略防卫局局长',
      source_text: '秦建国从阴影中走出。',
      source_excerpt: '秦建国从阴影中走出。',
      state: { status: '首次出场' },
    },
    {
      entity_type: 'character',
      name: '陆遥',
      role: '密档馆守门人',
      source_text: '陆遥只在旧档案的合影中出现过。',
      state_json: { status: '待确认' },
    },
    {
      entity_type: 'item',
      name: '旧档案编号',
      summary: '指向密档馆的入库记录',
      evidence: '编号与入库表一致。',
      source_text: 'SHADOWED_ASSET_SOURCE_PROSE',
    },
    {
      entity_type: 'location',
      name: '旧码头',
      effect: '潮水会掩盖脚印',
      evidence: '涨潮正在吞没石阶。',
      constraints_json: { advance_rule: '必须在涨潮前进入' },
      state_json: { active: true },
    },
    {
      entity_type: '',
      type: 'item',
      name: null,
      title: '密库铁牌',
      summary: '',
      role: '可换取一次密库通行',
      evidence: null,
      quote: '守卫验过铁牌后让开通道。',
      source_excerpt: '',
      constraints_json: null,
      constraints: { owner_rule: '只能由沈烛持有' },
      state_json: null,
      state: { current_owner: '沈烛' },
    },
  ]
  const chapter = { id: 9, chapter_no: 3 }
  const semantic = (value: any) => {
    const { payload_json: _payloadJson, ...record } = value || {}
    return record
  }

  for (const fixture of fixtures) {
    const before = semantic(normalizeDiscoveredAssets([fixture], { chapter })[0])
    const compacted: any = compactPreparedStoryStateForRecovery({
      state_delta: {},
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: {},
      hard_failures: [],
      payload: { discovered_assets: [fixture] },
    } as any)
    const after = semantic(normalizeDiscoveredAssets(compacted.payload.discovered_assets, { chapter })[0])
    expect(after).toEqual(before)
    expect(JSON.stringify(compacted)).not.toContain('SHADOWED_ASSET_SOURCE_PROSE')
  }
})

test('recovery compaction preserves every IP-scene normalizer alias contract', () => {
  const fixtures = [
    {
      title: '门前对峙',
      summary: '李玄当众亮出旧印章',
      visual_hook: '雨中印章反光',
      adaptation_value: '短剧高冲突节点',
      spread_point: '身份反转',
      evidence: '李玄把印章按在门上。',
      source_excerpt: '印章在雨幕里一闪。',
      tags: ['反转'],
    },
    {
      name: '密室开门',
      description: '铜钥匙开启尘封密室',
      visual: '石门缝隙漏出蓝光',
      ip_value: '漫剧分镜高点',
      comment_point: '钥匙来历引发讨论',
      quote: '石门后的蓝光照亮了众人。',
      excerpt: '一道蓝光从门缝中溢出。',
      tags: ['密室'],
    },
    {
      title: '码头追击',
      summary: '涨潮前的最后追击',
      image_hook: '潮水吞没灯火',
      short_drama_value: '章末高压追读',
      discussion_point: '顾舟是否叛变',
      evidence: '顾舟独自跃上离岸快船。',
    },
    {
      title: '门后回声',
      summary: '所有人都听见密门后的脚步声',
      quote: '第三声脚步落下，石门忽然开了一道缝。',
    },
    {
      title: '档案对质',
      summary: '沈烛用入库表逼问守门人',
      evidence: '编号就写在入库表第一行。',
      quote: 'SHADOWED_IP_QUOTE_PROSE',
    },
    {
      title: '',
      name: '钟楼揭面',
      summary: null,
      description: '沈烛当众公布真实身份',
      visual_hook: '',
      image_hook: '钟摆后的密门打开',
      adaptation_value: null,
      short_drama_value: '身份反转高点',
      spread_point: 0,
      discussion_point: '旧案真凶是谁',
      evidence: '',
      quote: '沈烛把案卷摊在钟楼前。',
      source_excerpt: null,
      excerpt: '钟声落下时，所有人都看见了他的脸。',
    },
  ]
  const chapter = { id: 10, chapter_no: 4 }
  const semantic = (value: any) => {
    const { payload_json: _payloadJson, ...record } = value || {}
    return record
  }

  for (const fixture of fixtures) {
    const before = semantic(normalizeIpSceneCandidates([fixture], chapter)[0])
    const compacted: any = compactPreparedStoryStateForRecovery({
      state_delta: {},
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: {},
      hard_failures: [],
      payload: { ip_scene_candidates: [fixture] },
    } as any)
    const after = semantic(normalizeIpSceneCandidates(compacted.payload.ip_scene_candidates, chapter)[0])
    expect(after).toEqual(before)
    expect(JSON.stringify(compacted)).not.toContain('SHADOWED_IP_QUOTE_PROSE')
  }
})

function executeSql(workspace: string, sql: string) {
  const db = openDb(workspace)
  try {
    db.exec(sql)
  } finally {
    db.close()
  }
}

async function childResult(child: ReturnType<typeof Bun.spawn>) {
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(exitCode, stderr).toBe(0)
  const jsonLine = stdout.trim().split('\n').reverse().find(line => line.trim().startsWith('{')) || ''
  return JSON.parse(jsonLine)
}

async function waitForFile(path: string) {
  const deadline = Date.now() + 5_000
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`)
    await Bun.sleep(5)
  }
}

function spawnBarrieredStoryRelationMaterialization(
  workspace: string,
  projectId: number,
  row: Record<string, any>,
  label: string,
) {
  const readyPath = join(workspace, `${label}-ready`)
  const releasePath = join(workspace, `${label}-release`)
  const relationModule = join(import.meta.dir, '../novel-setting-story-relations.ts')
  const testSupportModule = join(import.meta.dir, '../../novel-test-support.ts')
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { existsSync } from 'fs'
      import { materializeStoryRelations } from ${JSON.stringify(relationModule)}
      import { setNovelMutationTestHook } from ${JSON.stringify(testSupportModule)}
      let blocked = false
      setNovelMutationTestHook(async event => {
        if (blocked || event.phase !== 'before_full_store_write') return
        blocked = true
        await Bun.write(process.argv[4], 'ready')
        while (!existsSync(process.argv[5])) await Bun.sleep(5)
      })
      const result = await materializeStoryRelations(process.argv[1], Number(process.argv[2]), {
        rows: [JSON.parse(process.argv[3])],
      })
      console.log(JSON.stringify(result.summary))
    `, workspace, String(projectId), JSON.stringify(row), readyPath, releasePath],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { child, readyPath, releasePath }
}

describe('single chapter quality review', () => {
  let workspace = ''

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-single-quality-'))
  })

  afterEach(() => {
    setNovelMutationTestHook(null)
    rmSync(workspace, { recursive: true, force: true })
  })

  async function qualityFixture() {
    const project = await createNovelProject(workspace, { title: '单章质检', reference_config: {} } as any)
    const chapters = []
    for (let chapterNo = 1; chapterNo <= 3; chapterNo += 1) {
      chapters.push(await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_goal: `旧目标${chapterNo}`,
        chapter_summary: `旧摘要${chapterNo}`,
        conflict: `旧冲突${chapterNo}`,
        ending_hook: `旧钩子${chapterNo}`,
        chapter_text: `CHAPTER_${chapterNo}_PROSE 主角完成第${chapterNo}章事件。`,
      } as any))
    }
    return { project, chapters }
  }

  test('manual quality invokes one model for the explicit chapter and mutates no sibling chapter', async () => {
    const { project, chapters } = await qualityFixture()
    const before = await listNovelChapters(workspace, project.id)
    const agentCalls: any[] = []
    const contextChapterIds: number[] = []
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: async () => getNovelProject(workspace, project.id),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async (...args: any[]) => {
        agentCalls.push(args)
        return { parsed: { passed: true, score: 91, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => {
        contextChapterIds.push(Number(chapter.id))
        return { chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }
      },
    }

    await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'manual_refresh',
      current_chapter_only: true,
    })

    const after = await listNovelChapters(workspace, project.id)
    const changedIds = after
      .filter(item => JSON.stringify(item) !== JSON.stringify(before.find(previous => previous.id === item.id)))
      .map(item => item.id)
    expect(agentCalls).toHaveLength(1)
    expect(agentCalls[0][0]).toBe('review-agent')
    expect(String(agentCalls[0][2]?.task || '')).toContain('CHAPTER_2_PROSE')
    expect(contextChapterIds).toEqual([chapters[1].id])
    expect(changedIds).toEqual([chapters[1].id])
  })

  test('revision-owned quality reuses the exact chapter receipt and persists receipt fields in review and run', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: async () => getNovelProject(workspace, project.id),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        modelCalls += 1
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => ({ chapter_target: { chapter_id: chapter.id } }),
    }
    const options = {
      source: 'post_revision',
      source_run_id: 44,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }

    const first = await createProseQualityReview(ctx, workspace, project, chapters[1], options)
    const second = await createProseQualityReview(ctx, workspace, project, chapters[1], options)
    const reviews = await listNovelReviews(workspace, project.id)
    const runs = await listNovelRuns(workspace, project.id)
    const payload = parsedPayload(reviews.find(item => item.id === first.saved.id)?.payload)
    const runOutput = parsedPayload(runs.find(item => item.run_type === 'prose_quality')?.output_ref)

    expect(second.saved.id).toBe(first.saved.id)
    expect(modelCalls).toBe(1)
    expect(payload).toMatchObject({ chapter_id: chapters[1].id, source_run_id: 44, candidate_hash: options.candidate_hash })
    expect(runOutput).toMatchObject({
      source_run_id: 44,
      candidate_hash: options.candidate_hash,
      current_chapter_only: true,
    })
  })

  test('revision-owned quality serializes concurrent replay to one model call and review', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        modelCalls += 1
        await new Promise(resolve => setTimeout(resolve, 20))
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => ({ chapter_target: { chapter_id: chapter.id } }),
    }
    const options = {
      source: 'post_revision',
      source_run_id: 45,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }

    const [first, second] = await Promise.all([
      createProseQualityReview(ctx, workspace, project, chapters[1], options),
      createProseQualityReview(ctx, workspace, project, chapters[1], options),
    ])

    expect(first.saved.id).toBe(second.saved.id)
    expect(modelCalls).toBe(1)
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(1)
  })

  test('revision-owned quality claims one receipt across independent Bun processes', async () => {
    const { project, chapters } = await qualityFixture()
    const builderModule = join(import.meta.dir, 'builders.ts')
    const novelModule = join(import.meta.dir, '../../novel.ts')
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const childSource = `
      import { writeFileSync } from 'fs'
      import { join } from 'path'
      import { createProseQualityReview } from ${JSON.stringify(builderModule)}
      import { getNovelProject, listNovelChapters } from ${JSON.stringify(novelModule)}
      const workspace = process.argv[1]
      const projectId = Number(process.argv[2])
      const chapterId = Number(process.argv[3])
      const project = await getNovelProject(workspace, projectId)
      const chapter = (await listNovelChapters(workspace, projectId)).find(item => item.id === chapterId)
      const result = await createProseQualityReview({
        getStageModelId: () => 217,
        getStageTemperature: (_project, _stage, fallback) => fallback,
        executeAgent: async () => {
          writeFileSync(join(workspace, 'quality-model-call-' + process.pid), 'called')
          await Bun.sleep(120)
          return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
        },
        buildChapterContextPackage: async (_workspace, _project, current) => ({ chapter_target: { chapter_id: current.id } }),
      }, workspace, project, chapter, {
        source: 'post_revision',
        source_run_id: 451,
        candidate_hash: process.argv[4],
        current_chapter_only: true,
      })
      console.log(JSON.stringify({ savedId: result.saved.id, reused: result.reused }))
    `
    const args = [workspace, String(project.id), String(chapters[1].id), candidateHash]
    const children = [0, 1].map(() => Bun.spawn({
      cmd: [process.execPath, '-e', childSource, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
    }))
    const results = await Promise.all(children.map(childResult))

    expect(new Set(results.map(result => result.savedId)).size).toBe(1)
    expect(readdirSync(workspace).filter(name => name.startsWith('quality-model-call-'))).toHaveLength(1)
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(1)
    const runs = await listNovelRuns(workspace, project.id)
    expect(runs.filter(item => item.run_type === 'prose_quality')).toHaveLength(1)
    expect(runs.some(item => item.run_type === 'prose_quality_receipt')).toBe(false)
  }, 30_000)

  test('quality receipt heartbeat prevents reclaim while the model outlives its initial lease', async () => {
    const { project, chapters } = await qualityFixture()
    const receiptInput = {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4511,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
      owner: 'quality-owner-a',
      leaseMs: 120,
    }
    const claimed = await claimProseQualityReceipt(workspace, receiptInput)
    expect(claimed.state).toBe('claimed')
    let modelCalls = 0
    const running = withProseQualityReceiptLease(workspace, {
      claimRunId: claimed.run.id,
      owner: receiptInput.owner,
      leaseMs: 120,
      heartbeatMs: 30,
    }, async () => {
      modelCalls += 1
      await Bun.sleep(220)
      return 'done'
    })
    await Bun.sleep(170)
    const contender = await claimProseQualityReceipt(workspace, {
      ...receiptInput,
      owner: 'quality-owner-b',
    })

    expect(contender.state).toBe('waiting')
    expect(await running).toBe('done')
    expect(modelCalls).toBe(1)
    await failProseQualityReceipt(workspace, {
      claimRunId: claimed.run.id,
      owner: receiptInput.owner,
      error: Object.assign(new Error('test cleanup'), { code: 'TEST_CLEANUP' }),
    })
  })

  test('quality receipt ignores an in-flight heartbeat after its operation commits success', async () => {
    const { project, chapters } = await qualityFixture()
    const claimed = await claimProseQualityReceipt(workspace, {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4512,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
      owner: 'quality-owner-success',
      leaseMs: 120,
    })
    let heartbeatStarted!: () => void
    let releaseHeartbeat!: () => void
    let releaseOperation!: () => void
    const heartbeatStart = new Promise<void>(resolve => { heartbeatStarted = resolve })
    const heartbeatRelease = new Promise<void>(resolve => { releaseHeartbeat = resolve })
    const operationRelease = new Promise<void>(resolve => { releaseOperation = resolve })
    let blocked = false
    setNovelMutationTestHook(async event => {
      if (blocked || event.operation !== 'renew-prose-quality-receipt') return
      blocked = true
      heartbeatStarted()
      await heartbeatRelease
    })
    const running = withProseQualityReceiptLease(workspace, {
      claimRunId: claimed.run.id,
      owner: 'quality-owner-success',
      leaseMs: 120,
      heartbeatMs: 20,
    }, async () => {
      await operationRelease
      return 'committed'
    })
    await heartbeatStart
    executeSql(workspace, `UPDATE runs SET status = 'success', lease_owner = NULL, lease_expires_at = NULL WHERE id = ${Number(claimed.run.id)}`)
    releaseOperation()
    await Bun.sleep(0)
    releaseHeartbeat()

    expect(await running).toBe('committed')
    setNovelMutationTestHook(null)
  })

  test('revision-owned quality rejects an edit made while the model is reviewing', async () => {
    const { project, chapters } = await qualityFixture()
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        await updateNovelChapter(workspace, chapters[1].id, { chapter_text: '正文在质检期间被用户改写。' } as any)
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 452,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'PROSE_QUALITY_CANDIDATE_STALE' })
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(0)
    const failedRuns = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')
    expect(failedRuns).toHaveLength(1)
    expect(failedRuns[0]).toMatchObject({ status: 'failed' })
    expect(parsedPayload(failedRuns[0].output_ref)).toMatchObject({
      chapter_id: chapters[1].id,
      source_run_id: 452,
      current_chapter_only: true,
    })
  })

  test('quality abort at commit transaction entry writes no review or success receipt', async () => {
    const { project, chapters } = await qualityFixture()
    const controller = new AbortController()
    let releaseCommit!: () => void
    let markCommitBlocked!: () => void
    const commitBlocked = new Promise<void>(resolve => { markCommitBlocked = resolve })
    const commitGate = new Promise<void>(resolve => { releaseCommit = resolve })
    let blocked = false
    setNovelMutationTestHook(async event => {
      if (blocked || event.phase !== 'before_full_store_write' || event.operation !== 'commit-prose-quality-receipt') return
      blocked = true
      markCommitBlocked()
      await commitGate
    })
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => ({ parsed: { passed: true, score: 96, issues: [], revision_directives: [] }, finish_reason: 'stop' }),
      buildChapterContextPackage: async () => ({}),
    }

    const running = createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 4521,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
      signal: controller.signal,
    })
    await commitBlocked
    controller.abort(Object.assign(new Error('quality canceled at commit'), { code: 'QUALITY_ABORTED' }))
    releaseCommit()
    const error = await running.then(() => null, caught => caught)
    setNovelMutationTestHook(null)

    expect(error).toMatchObject({ code: 'QUALITY_ABORTED' })
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(0)
    expect((await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality' && item.status === 'success')).toHaveLength(0)
  })

  test('revision-owned quality keeps one durable failed audit when the provider rejects', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { throw Object.assign(new Error('injected quality provider failure'), { code: 'PROVIDER_FAILED' }) },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 453,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }).then(() => null, caught => caught)
    const reviews = (await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')
    const runs = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(String(error?.message || '')).toContain('injected quality provider failure')
    expect(reviews).toHaveLength(0)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ status: 'failed' })
    expect(parsedPayload(runs[0].output_ref)).toMatchObject({
      chapter_id: chapters[1].id,
      source_run_id: 453,
      candidate_hash: candidateHash,
      current_chapter_only: true,
      error_code: 'PROVIDER_FAILED',
    })
  })

  test('quality lease takeover preserves the canonical run id without creating an unscoped fallback audit', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    let canonicalRunId = 0
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        const [claimed] = (await listNovelRuns(workspace, project.id))
          .filter(item => item.run_type === 'prose_quality' && item.status === 'running')
        canonicalRunId = Number(claimed?.id || 0)
        expect(canonicalRunId).toBeGreaterThan(0)
        executeSql(workspace, `
          UPDATE runs
          SET lease_owner = 'takeover-owner', lease_expires_at = datetime('now', '+10 minutes')
          WHERE id = ${canonicalRunId}
        `)
        throw Object.assign(new Error('old owner provider failure after takeover'), { code: 'PROVIDER_FAILED' })
      },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 4532,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }).then(() => null, caught => caught)
    const runs = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(error).toMatchObject({
      code: 'PROVIDER_FAILED',
      prose_quality_run_id: canonicalRunId,
    })
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ id: canonicalRunId, status: 'running', lease_owner: 'takeover-owner' })
    expect(runs.filter(item => !item.scope_key)).toHaveLength(0)
  })

  test('primitive quality failure is normalized with the canonical run id', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { throw 'primitive provider failure' },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 4534,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }).then(() => null, caught => caught)
    const [run] = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(error).toMatchObject({
      message: 'primitive provider failure',
      prose_quality_run_id: run.id,
    })
    expect(run).toMatchObject({ status: 'failed' })
  })

  test('corrupt completed quality receipt error retains the canonical run id', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const claim = await claimProseQualityReceipt(workspace, {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4535,
      candidateHash,
      owner: 'corrupt-completed-owner',
    })
    executeSql(workspace, `
      UPDATE runs
      SET status = 'success', output_ref = '{"review_id":999999}', lease_owner = NULL, lease_expires_at = NULL
      WHERE id = ${claim.run.id}
    `)

    const error = await createProseQualityReview({} as any, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 4535,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({
      message: 'completed prose quality receipt has no persisted review',
      prose_quality_run_id: claim.run.id,
    })
  })

  test('waiting quality timeout retains the canonical run id', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const claim = await claimProseQualityReceipt(workspace, {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4536,
      candidateHash,
      owner: 'active-waiting-owner',
    })
    const originalDateNow = Date.now
    let syntheticNow = originalDateNow()
    Date.now = () => {
      syntheticNow += 31_000
      return syntheticNow
    }
    let error: any = null
    try {
      error = await createProseQualityReview({} as any, workspace, project, chapters[1], {
        source: 'post_revision',
        source_run_id: 4536,
        candidate_hash: candidateHash,
        current_chapter_only: true,
      }).then(() => null, caught => caught)
    } finally {
      Date.now = originalDateNow
    }

    expect(error).toMatchObject({
      code: 'PROSE_QUALITY_RECEIPT_WAIT_TIMEOUT',
      prose_quality_run_id: claim.run.id,
    })
  })

  test('quality receipt bounds repeated failure diagnostics while preserving total attempts', async () => {
    const { project, chapters } = await qualityFixture()
    const input = {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4533,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
    }
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const claimed = await claimProseQualityReceipt(workspace, {
        ...input,
        owner: `failure-owner-${attempt}`,
      })
      expect(claimed.state).toBe('claimed')
      await failProseQualityReceipt(workspace, {
        claimRunId: claimed.run.id,
        owner: `failure-owner-${attempt}`,
        error: Object.assign(
          new Error(`attempt-${attempt}:${'诊断'.repeat(5_000)}`),
          { code: `PROVIDER_${attempt}_${'X'.repeat(1_000)}` },
        ),
      })
    }

    const [run] = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')
    const output = parsedPayload(run?.output_ref)

    expect(output.attempt).toBe(20)
    expect(output.previous_failures.length).toBeLessThanOrEqual(8)
    expect(String(output.error).length).toBeLessThanOrEqual(1_000)
    expect(String(output.error_code).length).toBeLessThanOrEqual(128)
    expect(String(run?.error_message || '').length).toBeLessThanOrEqual(1_000)
    expect(new TextEncoder().encode(String(run?.output_ref || '')).byteLength).toBeLessThanOrEqual(32_000)
  })

  test('expired quality lease owner cannot fail the canonical run', async () => {
    const { project, chapters } = await qualityFixture()
    const claim = await claimProseQualityReceipt(workspace, {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4537,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
      owner: 'expired-failure-owner',
      now: '2000-01-01T00:00:00.000Z',
      leaseMs: 50,
    })

    const failed = await failProseQualityReceipt(workspace, {
      claimRunId: claim.run.id,
      owner: 'expired-failure-owner',
      error: new Error('must not mutate after lease expiry'),
    })
    const [run] = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(failed).toBeNull()
    expect(run).toMatchObject({
      id: claim.run.id,
      status: 'running',
      lease_owner: 'expired-failure-owner',
    })
  })

  test('failed receipt-owned quality leaves current chapter plan metadata unchanged', async () => {
    const { project, chapters } = await qualityFixture()
    const target = chapters[1]
    const before = (await listNovelChapters(workspace, project.id)).find(item => item.id === target.id)
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { throw Object.assign(new Error('quality provider failed'), { code: 'PROVIDER_FAILED' }) },
      buildChapterContextPackage: async () => ({}),
    }

    await createProseQualityReview(ctx, workspace, project, target, {
      source: 'post_revision',
      source_run_id: 4531,
      candidate_hash: revisionTextHash(String(target.chapter_text || '')),
      current_chapter_only: true,
    }).then(() => null, () => null)
    const after = (await listNovelChapters(workspace, project.id)).find(item => item.id === target.id)

    expect(after).toEqual(before)
  })

  test('waiting quality followers reuse the canonical failure while a later invocation may retry', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    let providerCalls = 0
    let rejectOwner!: () => void
    const ownerGate = new Promise<void>(resolve => { rejectOwner = resolve })
    let retrySucceeds = false
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        providerCalls += 1
        if (!retrySucceeds) {
          await ownerGate
          throw Object.assign(new Error('canonical provider failure'), { code: 'PROVIDER_FAILED' })
        }
        return { parsed: { passed: true, score: 95, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async () => ({}),
    }
    const options = {
      source: 'post_revision',
      source_run_id: 454,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }
    const owner = createProseQualityReview(ctx, workspace, project, chapters[1], options)
    while ((await listNovelRuns(workspace, project.id)).every(item => item.run_type !== 'prose_quality' || item.status !== 'running')) {
      await Bun.sleep(5)
    }
    const follower = createProseQualityReview(ctx, workspace, project, chapters[1], options)
    await Bun.sleep(30)
    rejectOwner()

    const [ownerResult, followerResult] = await Promise.allSettled([owner, follower])
    const failedRuns = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(providerCalls).toBe(1)
    expect(ownerResult.status).toBe('rejected')
    expect(followerResult.status).toBe('rejected')
    if (ownerResult.status === 'rejected' && followerResult.status === 'rejected') {
      expect(ownerResult.reason).toMatchObject({ code: 'PROVIDER_FAILED', prose_quality_run_id: failedRuns[0]?.id })
      expect(followerResult.reason).toMatchObject({ code: 'PROVIDER_FAILED', prose_quality_run_id: failedRuns[0]?.id })
      expect(String(followerResult.reason.message)).toBe('canonical provider failure')
    }
    expect(failedRuns).toHaveLength(1)
    expect(failedRuns[0]).toMatchObject({ status: 'failed' })

    retrySucceeds = true
    const retried = await createProseQualityReview(ctx, workspace, project, chapters[1], options)
    const successfulRuns = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')
    const retryAudit = parsedPayload(successfulRuns[0]?.output_ref)

    expect(retried.reused).toBe(false)
    expect(providerCalls).toBe(2)
    expect(successfulRuns).toHaveLength(1)
    expect(successfulRuns[0]).toMatchObject({ status: 'success' })
    expect(retryAudit.attempt).toBe(2)
    expect(retryAudit.previous_failures).toContainEqual(expect.objectContaining({
      error: 'canonical provider failure',
      error_code: 'PROVIDER_FAILED',
    }))
  }, 30_000)

  test('revision-owned quality rejects a stale candidate receipt before the model call', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { modelCalls += 1; return { parsed: {} } },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 46,
      candidate_hash: revisionTextHash('older chapter candidate'),
      current_chapter_only: true,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'PROSE_QUALITY_CANDIDATE_STALE' })
    expect(modelCalls).toBe(0)
  })
})

describe('single chapter Story State', () => {
  let workspace = ''

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-single-story-state-'))
  })

  afterEach(() => {
    setNovelMutationTestHook(null)
    rmSync(workspace, { recursive: true, force: true })
  })

  async function storyFixture(chapterCount = 3, execute?: (...args: any[]) => Promise<any>) {
    const project = await createNovelProject(workspace, {
      title: '精确状态同步',
      genre: '悬疑',
      reference_config: { story_state: { character_positions: { seed: 'start' }, open_questions: ['seed'] } },
    } as any)
    const chapters = []
    for (let chapterNo = 1; chapterNo <= chapterCount; chapterNo += 1) {
      chapters.push(await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_text: `CHAPTER_${chapterNo}_TEXT 事情继续。`,
      } as any))
    }
    const character = await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '李玄',
      current_state: { seed: true },
    } as any)
    const item = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'item',
      name: '旧印章',
      state_json: { seed: true },
    } as any)
    const storyline = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'mainline',
      name: '追查旧印章',
      state_json: { seed: true },
    } as any)
    for (const chapter of chapters.slice(0, 2)) {
      await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [
        { entity_id: item.id, actual_state_change: { seed: true } },
        { entity_id: storyline.id, actual_state_change: { seed: true } },
      ])
    }
    const modelCalls: any[] = []
    let followerRefreshCalls = 0
    let projectReadCalls = 0
    let storyStateUpdateCalls = 0
    const executeAgent = async (...args: any[]) => {
      modelCalls.push(args)
      return execute
        ? execute(...args)
        : { parsed: storyStatePayload(`chapter_${String(args[2]?.task || '').match(/CHAPTER_(\d+)_TEXT/)?.[1] || 'unknown'}`), finish_reason: 'stop' }
    }
    const methods = createStoryStateMachineMethods({
      executeAgent,
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => { followerRefreshCalls += 1 },
    })
    const contextChapterIds: number[] = []
    const ctx: any = {
      getProject: async (_activeWorkspace: string, id: number) => {
        projectReadCalls += 1
        return getNovelProject(workspace, id)
      },
      buildChapterContextPackage: async (_activeWorkspace: string, _project: any, chapter: any) => {
        contextChapterIds.push(Number(chapter.id))
        return { chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }
      },
      executeAgent,
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      updateStoryStateMachine: (...args: any[]) => {
        storyStateUpdateCalls += 1
        return (methods.updateStoryStateMachine as any)(...args)
      },
    }
    return {
      project,
      chapters,
      character,
      item,
      storyline,
      ctx,
      modelCalls,
      contextChapterIds,
      followerRefreshCalls: () => followerRefreshCalls,
      projectReadCalls: () => projectReadCalls,
      storyStateUpdateCalls: () => storyStateUpdateCalls,
    }
  }

  function receipt(chapterId: number, hash = `candidate-${chapterId}`, runId: number | null = 44): SingleChapterStoryStateReceipt {
    return { source_run_id: runId, candidate_hash: hash, chapter_id: chapterId }
  }

  test('generic project reference mutation uses the named operation contract', async () => {
    const project = await createNovelProject(workspace, { title: '事务引用配置', reference_config: { seed: true } } as any)
    const mutation = await mutateNovelProjectReferenceConfig(workspace, {
      projectId: project.id,
      operation: 'test-story-state-reference-mutation',
      mutate: currentConfig => ({
        referenceConfig: { ...currentConfig, applied: true },
        result: 'applied',
      }),
    })

    expect(mutation?.result).toBe('applied')
    expect(mutation?.project.reference_config).toMatchObject({ seed: true, applied: true })
  })

  test('rejects a receipt bound to a different chapter before prepare or apply', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const mismatchedReceipt = receipt(fixture.chapters[1].id, 'wrong-chapter')

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: mismatchedReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: mismatchedReceipt,
      prepared: {},
    }).then(() => null, caught => caught)
    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt chapter does not match target chapter')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('requires strict numeric chapter identity in a receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const stringChapterReceipt = { ...receipt(target.id), chapter_id: String(target.id) } as any

    const error = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: stringChapterReceipt,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('rejects a non-canonical candidate hash before prepare or apply', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const emptyHashReceipt = receipt(target.id, ' candidate-with-padding ')

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: emptyHashReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: emptyHashReceipt,
      prepared: {},
    }).then(() => null, caught => caught)
    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt candidate hash must be a non-empty canonical string')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('requires a null or positive integer source run id in a receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const invalidRunReceipt = receipt(target.id, 'invalid-run', 0)

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: invalidRunReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: invalidRunReceipt,
      prepared: {},
    }).then(() => null, caught => caught)

    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt source run id must be null or a positive integer')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('30 chapter prepare/apply invokes one model for chapter 1, writes no follower, and replays idempotently', async () => {
    const fixture = await storyFixture(30)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')))
    const followerBefore = (await listNovelChapters(workspace, fixture.project.id)).slice(1)

    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    expect(preparedResult.reused).toBe(false)
    expect(preparedResult.prepared).not.toBeNull()
    expect(fixture.modelCalls).toHaveLength(1)
    expect(fixture.storyStateUpdateCalls()).toBe(0)

    const first = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    const projectAfterFirst = await getNovelProject(workspace, fixture.project.id)
    const reviewCountAfterFirst = (await listNovelReviews(workspace, fixture.project.id)).length
    const contextBuildCountAfterFirst = fixture.contextChapterIds.length
    const replayPrepared = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const second = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: replayPrepared.prepared,
    })
    const projectAfterSecond = await getNovelProject(workspace, fixture.project.id)
    const followerAfter = (await listNovelChapters(workspace, fixture.project.id)).slice(1)
    const reviewsAfter = await listNovelReviews(workspace, fixture.project.id)
    const derivedKeys = reviewsAfter.map(item => parsedPayload(item.payload).derived_key).filter(Boolean)

    expect(first.reused).toBe(false)
    expect(fixture.storyStateUpdateCalls()).toBe(1)
    expect(replayPrepared).toMatchObject({ reused: true, prepared: null })
    expect(second.reused).toBe(true)
    expect(fixture.contextChapterIds).toHaveLength(contextBuildCountAfterFirst)
    expect(projectAfterSecond?.reference_config).toEqual(projectAfterFirst?.reference_config)
    expect(reviewsAfter).toHaveLength(reviewCountAfterFirst)
    expect(new Set(derivedKeys).size).toBe(derivedKeys.length)
    expect(followerAfter.map(item => item.raw_payload)).toEqual(followerBefore.map(item => item.raw_payload))
    expect(fixture.followerRefreshCalls()).toBe(0)
    expect(fixture.contextChapterIds.every(id => id === target.id)).toBe(true)
  }, 30_000)

  test('aborting after prepare and before apply performs zero Story State writes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')))
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const snapshot = async () => ({
      project: (await getNovelProject(workspace, fixture.project.id))?.reference_config,
      characters: (await listNovelCharacters(workspace, fixture.project.id)).map(item => item.current_state),
      settings: (await listNovelSettingEntities(workspace, fixture.project.id)).map(item => item.state_json),
      chapter: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id)?.raw_payload,
      reviews: await listNovelReviews(workspace, fixture.project.id),
    })
    const before = await snapshot()
    const controller = new AbortController()
    controller.abort(Object.assign(new Error('Story State canceled before apply'), { code: 'STORY_STATE_ABORTED' }))

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
      signal: controller.signal,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_ABORTED' })
    expect(await snapshot()).toEqual(before)
  })

  test('oversized allowed recovery state fails before the state transaction and performs zero writes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 5001)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const prepared = {
      ...preparedResult.prepared,
      state_delta: {
        ...(preparedResult.prepared?.state_delta || {}),
        current_time: '时'.repeat(30_000),
      },
    } as any
    const snapshot = async () => ({
      project: (await getNovelProject(workspace, fixture.project.id))?.reference_config,
      characters: await listNovelCharacters(workspace, fixture.project.id),
      settings: await listNovelSettingEntities(workspace, fixture.project.id),
      chapter: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id)?.raw_payload,
      reviews: await listNovelReviews(workspace, fixture.project.id),
    })
    const before = await snapshot()

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_RECOVERY_CHECKPOINT_TOO_LARGE' })
    expect(await snapshot()).toEqual(before)
  })

  test('aborting exact Story State at transaction entry performs zero state or derived writes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 501)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const snapshot = async () => ({
      project: (await getNovelProject(workspace, fixture.project.id))?.reference_config,
      characters: await listNovelCharacters(workspace, fixture.project.id),
      settings: await listNovelSettingEntities(workspace, fixture.project.id),
      chapter: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id),
      reviews: await listNovelReviews(workspace, fixture.project.id),
    })
    const before = await snapshot()
    const controller = new AbortController()
    let releaseApply!: () => void
    let markApplyBlocked!: () => void
    const applyBlocked = new Promise<void>(resolve => { markApplyBlocked = resolve })
    const applyGate = new Promise<void>(resolve => { releaseApply = resolve })
    let blocked = false
    setNovelMutationTestHook(async event => {
      if (blocked || event.phase !== 'before_full_store_write' || event.operation !== 'apply-exact-story-state') return
      blocked = true
      markApplyBlocked()
      await applyGate
    })

    const running = applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
      signal: controller.signal,
    })
    await applyBlocked
    controller.abort(Object.assign(new Error('Story State canceled at commit'), { code: 'STORY_STATE_ABORTED' }))
    releaseApply()
    const error = await running.then(() => null, caught => caught)
    setNovelMutationTestHook(null)

    expect(error).toMatchObject({ code: 'STORY_STATE_ABORTED' })
    expect(await snapshot()).toEqual(before)
  })

  test('aborting exact Story State at completion transaction entry retains recovery receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 502)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const controller = new AbortController()
    let releaseCompletion!: () => void
    let markCompletionBlocked!: () => void
    const completionBlocked = new Promise<void>(resolve => { markCompletionBlocked = resolve })
    const completionGate = new Promise<void>(resolve => { releaseCompletion = resolve })
    let blocked = false
    setNovelMutationTestHook(async event => {
      if (blocked || event.phase !== 'before_full_store_write' || event.operation !== 'complete-exact-story-state') return
      blocked = true
      markCompletionBlocked()
      await completionGate
    })

    const running = applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
      signal: controller.signal,
    })
    await completionBlocked
    const queuedReceipt = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    controller.abort(Object.assign(new Error('Story State canceled before completion commit'), {
      code: 'STORY_STATE_COMPLETION_ABORTED',
    }))
    releaseCompletion()
    const error = await running.then(() => null, caught => caught)
    setNovelMutationTestHook(null)
    const durableReceipt = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(queuedReceipt).toMatchObject({ status: 'state_applied' })
    expect(queuedReceipt?.prepared_for_recovery).toBeTruthy()
    expect(error).toMatchObject({
      code: 'STORY_STATE_COMPLETION_ABORTED',
      message: 'Story State canceled before completion commit',
    })
    expect(durableReceipt).toMatchObject({ status: 'state_applied' })
    expect(durableReceipt?.prepared_for_recovery).toBeTruthy()
  })

  test('concurrent apply rebases two prepared deltas and retains both receipt keys', async () => {
    const fixture = await storyFixture(3)
    const firstReceipt = receipt(fixture.chapters[0].id, revisionTextHash(String(fixture.chapters[0].chapter_text || '')), 51)
    const secondReceipt = receipt(fixture.chapters[1].id, revisionTextHash(String(fixture.chapters[1].chapter_text || '')), 52)
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[0].id,
        receipt: firstReceipt,
      }),
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[1].id,
        receipt: secondReceipt,
      }),
    ])

    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[0].id,
        receipt: firstReceipt,
        prepared: firstPrepared.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[1].id,
        receipt: secondReceipt,
        prepared: secondPrepared.prepared,
      }),
    ])

    const stored = await getNovelProject(workspace, fixture.project.id)
    const storedCharacter = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)
    const storedSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const storedItem = storedSettings.find(item => item.id === fixture.item.id)
    const storedStoryline = storedSettings.find(item => item.id === fixture.storyline.id)
    expect(stored?.reference_config?.story_state?.character_positions).toMatchObject({
      chapter_1: 'chapter_1-location',
      chapter_2: 'chapter_2-location',
    })
    expect(storedCharacter?.current_state?.goals).toMatchObject({ chapter_1: true, chapter_2: true })
    expect(storedItem?.state_json?.constraints).toMatchObject({ chapter_1: true, chapter_2: true })
    expect(storedStoryline?.state_json?.constraints).toMatchObject({ chapter_1: true, chapter_2: true })
    expect(Object.keys(stored?.reference_config?.story_state_sync_receipts || {})).toEqual(expect.arrayContaining([
      storyStateReceiptKey(firstReceipt),
      storyStateReceiptKey(secondReceipt),
    ]))
  }, 30_000)

  test('concurrent divergent applies for one receipt materialize only canonical prepared state', async () => {
    let preparationCount = 0
    const fixture = await storyFixture(1, async () => {
      preparationCount += 1
      return { parsed: storyStatePayload(`same_receipt_${preparationCount}`), finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 511)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
      }),
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
      }),
    ])
    expect(fixture.modelCalls).toHaveLength(2)

    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: firstPrepared.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: secondPrepared.prepared,
      }),
    ])

    const storedProject = await getNovelProject(workspace, fixture.project.id)
    const canonicalKey = String(storedProject?.reference_config?.story_state?.current_time || '').replace(/-time$/, '')
    const losingKey = canonicalKey === 'same_receipt_1' ? 'same_receipt_2' : 'same_receipt_1'
    const storedCharacter = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)
    const storedSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const storedItem = storedSettings.find(item => item.id === fixture.item.id)
    const storedStoryline = storedSettings.find(item => item.id === fixture.storyline.id)
    const usage = await listNovelChapterSettingUsage(workspace, fixture.project.id, target.id)
    const itemUsage = usage.find(item => item.entity_id === fixture.item.id)
    const storylineUsage = usage.find(item => item.entity_id === fixture.storyline.id)
    const completedReceipt = storedProject?.reference_config?.story_state_sync_receipts?.[receiptKey]
    const reviewsJson = JSON.stringify(await listNovelReviews(workspace, fixture.project.id))

    expect(['same_receipt_1', 'same_receipt_2']).toContain(canonicalKey)
    expect(storedCharacter?.current_state?.goals?.[canonicalKey]).toBe(true)
    expect(storedCharacter?.current_state?.goals?.[losingKey]).toBeUndefined()
    expect(storedItem?.state_json?.constraints?.[canonicalKey]).toBe(true)
    expect(storedItem?.state_json?.constraints?.[losingKey]).toBeUndefined()
    expect(storedStoryline?.state_json?.constraints?.[canonicalKey]).toBe(true)
    expect(storedStoryline?.state_json?.constraints?.[losingKey]).toBeUndefined()
    expect(itemUsage?.actual_state_change?.constraints?.[canonicalKey]).toBe(true)
    expect(itemUsage?.actual_state_change?.constraints?.[losingKey]).toBeUndefined()
    expect(storylineUsage?.actual_state_change?.constraints?.[canonicalKey]).toBe(true)
    expect(storylineUsage?.actual_state_change?.constraints?.[losingKey]).toBeUndefined()
    expect(JSON.stringify(completedReceipt?.payload || {})).toContain(`${canonicalKey}新物件`)
    expect(JSON.stringify(completedReceipt?.payload || {})).not.toContain(`${losingKey}新物件`)
    expect(reviewsJson).not.toContain(`${losingKey}新物件`)
  }, 30_000)

  test('concurrent exact applies upsert one shared relationship entity', async () => {
    const fixture = await storyFixture(3, async (...args: any[]) => {
      const key = `relation_${String(args[2]?.task || '').match(/CHAPTER_(\d+)_TEXT/)?.[1] || 'unknown'}`
      const payload = storyStatePayload(key)
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const targets = fixture.chapters.slice(0, 2)
    const receipts = targets.map((target, index) => receipt(
      target.id,
      revisionTextHash(String(target.chapter_text || '')),
      520 + index,
    ))
    const prepared = await Promise.all(targets.map((target, index) => prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipts[index],
    })))

    await Promise.all(targets.map((target, index) => applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipts[index],
      prepared: prepared[index].prepared,
    })))

    const relationships = (await listNovelSettingEntities(workspace, fixture.project.id))
      .filter(item => item.entity_type === 'relationship')
    expect(relationships).toHaveLength(1)
  }, 30_000)

  test('relationship pair upsert is unique across independent Bun processes', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    const row = {
      party_a: '李玄',
      party_b: '顾舟',
      current_status: '结盟追查旧印章',
      story_relation_type: '联盟',
    }
    const first = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, row, 'same-pair-first')
    const second = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, row, 'same-pair-second')
    await Promise.all([waitForFile(first.readyPath), waitForFile(second.readyPath)])
    writeFileSync(first.releasePath, 'release')
    writeFileSync(second.releasePath, 'release')
    await Promise.all([childResult(first.child), childResult(second.child)])

    const relationships = (await listNovelSettingEntities(workspace, fixture.project.id))
      .filter(item => item.entity_type === 'relationship')
    expect(relationships).toHaveLength(1)
  }, 30_000)

  test('relationship materialization reuses a legacy row matched by pair key', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '甲' } as any)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '乙' } as any)
    const pairKey = relationPairKey('甲', '乙')
    const legacy = await createNovelSettingEntity(workspace, {
      project_id: fixture.project.id,
      entity_type: 'relationship',
      name: '甲乙旧关系卡',
      summary: '旧状态',
      state_json: {
        party_a: '甲',
        party_b: '乙',
        current_status: '旧状态',
      },
      payload_json: { pair_key: pairKey },
    } as any)

    const result = await materializeStoryRelations(workspace, fixture.project.id, {
      rows: [{
        party_a: '甲',
        party_b: '乙',
        current_status: '携手追查旧案',
        story_relation_type: '联盟',
        emotion: '正面',
      }],
    })

    const relationships = (await listNovelSettingEntities(workspace, fixture.project.id))
      .filter(item => item.entity_type === 'relationship')
    const characters = await listNovelCharacters(workspace, fixture.project.id)
    const characterRelations = characters
      .filter(item => item.name === '甲' || item.name === '乙')
      .flatMap(item => item.relationships || [])

    expect(result.summary).toMatchObject({ created: 0, updated: 1, character_patches: 2 })
    expect(result.updated[0]?.id).toBe(legacy.id)
    expect(relationships).toHaveLength(1)
    expect(relationships[0]).toMatchObject({
      id: legacy.id,
      name: pairKey,
      summary: '携手追查旧案',
      state_json: {
        party_a: '甲',
        party_b: '乙',
        current_status: '携手追查旧案',
        story_relation_type: '联盟',
        emotion: '正面',
      },
    })
    expect(characterRelations).toHaveLength(2)
    expect(characterRelations).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '乙', status: '携手追查旧案', type: '联盟', emotion: '正面' }),
      expect.objectContaining({ name: '甲', status: '携手追查旧案', type: '联盟', emotion: '正面' }),
    ]))
  })

  test('relationship materialization applies authoritative scalar transitions while preserving structured history', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    await materializeStoryRelations(workspace, fixture.project.id, {
      rows: [{
        party_a: '李玄',
        party_b: '顾舟',
        current_status: '敌对',
        story_relation_type: '对立',
        emotion: '负面',
        change_nodes: [{ chapter_no: 1, note: '首次交锋' }],
      }],
    })
    await materializeStoryRelations(workspace, fixture.project.id, {
      rows: [{
        party_a: '李玄',
        party_b: '顾舟',
        current_status: '结盟',
        story_relation_type: '联盟',
        emotion: '正面',
        change_nodes: [
          { chapter_no: 1, note: '首次交锋' },
          { chapter_no: 2, note: '共同破局' },
        ],
      }],
    })

    const entity = (await listNovelSettingEntities(workspace, fixture.project.id))
      .find(item => item.entity_type === 'relationship')
    const characters = await listNovelCharacters(workspace, fixture.project.id)
    const relationCards = characters
      .flatMap(item => item.relationships || [])
      .filter((item: any) => String(item?.name || item?.target || '') === (item?.name === '顾舟' ? '顾舟' : '李玄'))

    expect(entity?.state_json).toMatchObject({
      current_status: '结盟',
      story_relation_type: '联盟',
      emotion: '正面',
      change_nodes: [
        { chapter_no: 1, note: '首次交锋' },
        { chapter_no: 2, note: '共同破局' },
      ],
    })
    expect(relationCards).toHaveLength(2)
    expect(relationCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: '结盟', type: '联盟', emotion: '正面' }),
    ]))
  })

  test('relationship materialization merges transaction-current character relationships across processes', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '林青禾' } as any)
    const first = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, {
      party_a: '李玄',
      party_b: '顾舟',
      current_status: '结盟追查旧印章',
      story_relation_type: '联盟',
    }, 'different-pair-first')
    const second = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, {
      party_a: '李玄',
      party_b: '林青禾',
      current_status: '有限互信并交换线索',
      story_relation_type: '联盟',
    }, 'different-pair-second')
    await Promise.all([waitForFile(first.readyPath), waitForFile(second.readyPath)])
    writeFileSync(first.releasePath, 'release')
    writeFileSync(second.releasePath, 'release')
    await Promise.all([childResult(first.child), childResult(second.child)])

    const stored = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.name === '李玄')
    const targets = (stored?.relationships || []).map((item: any) => String(item?.name || item?.target || item))
    expect(targets).toEqual(expect.arrayContaining(['顾舟', '林青禾']))
  }, 30_000)

  test('concurrent receipts merge nested state into the same chapter entity and usage rows', async () => {
    let prepareCalls = 0
    const fixture = await storyFixture(3, async () => {
      prepareCalls += 1
      const key = `delta_${prepareCalls}`
      const payload = storyStatePayload(key)
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const candidateHash = revisionTextHash(String(target.chapter_text || ''))
    const firstReceipt = receipt(target.id, candidateHash, 53)
    const secondReceipt = receipt(target.id, candidateHash, 54)
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: firstReceipt,
      }),
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: secondReceipt,
      }),
    ])

    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: firstReceipt,
        prepared: firstPrepared.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: secondReceipt,
        prepared: secondPrepared.prepared,
      }),
    ])

    const stored = await getNovelProject(workspace, fixture.project.id)
    const storedCharacter = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)
    const storedSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const storedItem = storedSettings.find(item => item.id === fixture.item.id)
    const storedStoryline = storedSettings.find(item => item.id === fixture.storyline.id)
    const storedUsage = await listNovelChapterSettingUsage(workspace, fixture.project.id, target.id)
    const itemUsage = storedUsage.find(item => item.entity_id === fixture.item.id)
    const storylineUsage = storedUsage.find(item => item.entity_id === fixture.storyline.id)

    expect(stored?.reference_config?.story_state?.character_positions).toMatchObject({
      delta_1: 'delta_1-location',
      delta_2: 'delta_2-location',
    })
    expect(storedCharacter?.current_state?.goals).toMatchObject({ delta_1: true, delta_2: true })
    expect(storedItem?.state_json?.constraints).toMatchObject({ delta_1: true, delta_2: true })
    expect(storedStoryline?.state_json?.constraints).toMatchObject({ delta_1: true, delta_2: true })
    expect(itemUsage?.actual_state_change?.constraints).toMatchObject({ delta_1: true, delta_2: true })
    expect(storylineUsage?.actual_state_change?.constraints).toMatchObject({ delta_1: true, delta_2: true })
  }, 30_000)

  test('first exact apply preserves authoritative relationship and foreshadow contracts', async () => {
    const fixture = await storyFixture(1, async () => {
      const payload = storyStatePayload('authoritative_contracts')
      payload.state_delta.character_relationships = {
        '李玄-顾舟': {
          party_a: '李玄',
          party_b: '顾舟',
          current_status: '有限结盟',
          story_relation_type: '联盟',
          emotion: '正面',
          start_chapter_no: 1,
          change_nodes: [{ chapter_no: 1, note: '共同追查旧印章' }],
        },
      }
      payload.state_delta.foreshadowing_status = {
        '旧印章来历': {
          summary: '旧臣见到印章后避开',
          lifecycle: '已埋',
          importance: '高',
          plant_chapter_no: 1,
          expected_resolve_chapter_no: 12,
        },
      }
      payload.state_delta.established_events = [{
        id: 'evt-alias-first-apply',
        chapterNo: 1,
        kind: 'promise',
        name: '李玄',
        aspect: '承诺',
        text: '李玄承诺把旧印章交还顾舟',
        sourceExcerpt: '李玄把印章推向顾舟，说会亲手归还。',
        lockLevel: 'hard',
        lastSeenChapter: 1,
        confidence: 0.9,
      }]
      payload.discovered_assets = [{
        type: 'item',
        title: '别院铜钥匙',
        description: '可以打开别院地库',
        quote: '李玄从旧印章夹层取出铜钥匙。',
        constraints: { owner_rule: '只能由李玄持有' },
        suggested_state: { current_owner: '李玄' },
      }]
      payload.ip_scene_candidates = [{
        name: '印章门前对峙',
        description: '李玄当众亮出旧印章',
        visual: '雨中印章反光',
        ip_value: '短剧高冲突节点',
        comment_point: '身份反转',
        quote: '印章在雨幕里一闪。',
      }]
      return { parsed: payload, finish_reason: 'stop' }
    })
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 60)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })

    const applied = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })

    const storedProject = await getNovelProject(workspace, fixture.project.id)
    const storyState = storedProject?.reference_config?.story_state
    const relationship = (await listNovelSettingEntities(workspace, fixture.project.id))
      .find(item => item.entity_type === 'relationship')
    const foreshadow = buildForeshadowLifecycleBoard({ storyState }).rows
      .find(item => item.name === '旧印章来历')

    expect(storyState?.character_relationships?.['李玄-顾舟']).toEqual({
      party_a: '李玄',
      party_b: '顾舟',
      current_status: '有限结盟',
      story_relation_type: '联盟',
      emotion: '正面',
      start_chapter_no: 1,
      change_nodes: [{ chapter_no: 1, note: '共同追查旧印章' }],
    })
    expect(relationship?.state_json).toMatchObject({
      current_status: '有限结盟',
      story_relation_type: '联盟',
      emotion: '正面',
      start_chapter_no: 1,
      change_nodes: expect.arrayContaining([
        { chapter_no: 1, note: '共同追查旧印章' },
        { chapter_no: 1, note: '李玄承诺把旧印章交还顾舟' },
      ]),
    })
    expect(storyState?.foreshadowing_status?.['旧印章来历']).toMatchObject({
      lifecycle: '已埋',
      importance: '高',
      plant_chapter_no: 1,
      expected_resolve_chapter_no: 12,
    })
    expect(foreshadow).toMatchObject({
      lifecycle: '已埋',
      importance: '高',
      plant_chapter_no: 1,
      expected_resolve_chapter_no: 12,
    })
    expect(storyState?.established_events).toContainEqual(expect.objectContaining({
      id: 'evt-alias-first-apply',
      chapter_no: 1,
      subject: '李玄',
      predicate: '承诺',
      fact: '李玄承诺把旧印章交还顾舟',
      source_excerpt: '李玄把印章推向顾舟，说会亲手归还。',
      lock_level: 'hard',
    }))
    expect(applied.update?.asset_intake?.discovered_assets).toContainEqual(expect.objectContaining({
      entity_type: 'item',
      name: '别院铜钥匙',
      summary: '可以打开别院地库',
      evidence: '李玄从旧印章夹层取出铜钥匙。',
      constraints_json: { owner_rule: '只能由李玄持有' },
      state_json: expect.objectContaining({ current_owner: '李玄' }),
    }))
    expect(applied.update?.ip_scene_intake?.ip_scene_candidates).toContainEqual(expect.objectContaining({
      title: '印章门前对峙',
      summary: '李玄当众亮出旧印章',
      visual_hook: '雨中印章反光',
      adaptation_value: '短剧高冲突节点',
      spread_point: '身份反转',
      evidence: '印章在雨幕里一闪。',
    }))
  }, 30_000)

  test('resumes state-applied derived materialization without another model call', async () => {
    const fixture = await storyFixture(3, async () => {
      const payload = storyStatePayload('semantic_recovery')
      payload.state_delta.character_relationships = {
        '李玄-顾舟': {
          party_a: '李玄',
          party_b: '顾舟',
          current_status: '有限结盟',
          relation_type: '联盟',
          emotion: '正面',
          start: 1,
          change_nodes: [{ chapter_no: 1, note: '共同追查旧印章' }],
        },
      }
      payload.state_delta.foreshadowing_status = {
        '旧印章来历': {
          payoff_status: 'paid',
          clue: '旧臣避开腰牌',
          triggered: true,
          lifecycle: '已回收',
          importance: '高',
          plant_chapter_no: 1,
          expected_resolve_chapter_no: 12,
          resolve_chapter_no: 3,
        },
      }
      payload.state_delta.established_events = [{
        id: 'evt-alias-recovery',
        chapterNo: 1,
        kind: 'identity_reveal',
        who: '顾舟',
        aspect: '身份',
        summary: '顾舟是前朝密卫后人',
        evidence: '顾舟取出密卫铜牌。',
        lockLevel: 'hard',
        lastSeenChapter: 1,
        confidence: 0.95,
      }]
      payload.character_updates[0].current_state.public_image = '公开作证后得罪会长'
      payload.setting_updates[0].state_delta = {
        current_time: '子时',
        triggered: true,
        current_owner: '李玄',
      }
      payload.storyline_updates[0].actual_state_change = {
        current_state: '当众压住王府管事',
        payoff_status: 'paid',
        clue: '旧臣避开腰牌',
        attitude_shift: '从旁观转为有限作证',
        leaked: true,
      }
      payload.discovered_assets = [{
        title: '语义恢复铜钥匙',
        type: 'item',
        description: '可以打开旧院密室',
        quote: '李玄收起铜钥匙。',
        constraints: {
          owner_rule: '只能由李玄持有',
          forbidden_reveal: '不得提前揭露钥匙来源',
        },
        suggested_state: { current_owner: '李玄', triggered: false },
      }]
      payload.ip_scene_candidates = [{
        name: '密室蓝光',
        description: '铜钥匙开启尘封密室',
        image_hook: '石门缝隙漏出蓝光',
        short_drama_value: '章末高压追读',
        discussion_point: '密室主人身份',
        quote: '蓝光照亮了众人的脸。',
      }]
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 61)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const updateStoryStateMachine = fixture.ctx.updateStoryStateMachine
    let failDerivedReview = true
    fixture.ctx.updateStoryStateMachine = (...args: any[]) => updateStoryStateMachine(
      ...args.slice(0, 6),
      {
        ...(args[6] || {}),
        saveDerivedReview: failDerivedReview
          ? async () => { throw new Error('simulated derived review failure') }
          : undefined,
      },
    )
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('simulated derived review failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(stateApplied?.prepared_for_recovery?.receipt_binding).toBeUndefined()
    expect(fixture.modelCalls).toHaveLength(1)

    failDerivedReview = false
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const recoveredApply = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(recoveredPrepare.reused).toBe(true)
    expect(recoveredPrepare.prepared).toBeTruthy()
    expect(recoveredPrepare.prepared?.receipt_binding).toMatchObject({ key: receiptKey })
    expect(recoveredPrepare.prepared).toMatchObject({
      state_delta: {
        established_events: [expect.objectContaining({
          id: 'evt-alias-recovery',
          chapter_no: 1,
          subject: '顾舟',
          predicate: '身份',
          fact: '顾舟是前朝密卫后人',
          source_excerpt: '顾舟取出密卫铜牌。',
          lock_level: 'hard',
        })],
        character_relationships: {
          '李玄-顾舟': {
            party_a: '李玄',
            party_b: '顾舟',
            current_status: '有限结盟',
            relation_type: '联盟',
            emotion: '正面',
            start: 1,
            change_nodes: [{ chapter_no: 1, note: '共同追查旧印章' }],
          },
        },
        foreshadowing_status: {
          '旧印章来历': {
            payoff_status: 'paid',
            clue: '旧臣避开腰牌',
            triggered: true,
            lifecycle: '已回收',
            importance: '高',
            plant_chapter_no: 1,
            expected_resolve_chapter_no: 12,
            resolve_chapter_no: 3,
          },
        },
      },
      character_updates: [{ current_state: { public_image: '公开作证后得罪会长' } }],
      setting_updates: [{
        state_delta: { current_time: '子时', triggered: true, current_owner: '李玄' },
      }],
      storyline_updates: [{
        actual_state_change: {
          current_state: '当众压住王府管事',
          payoff_status: 'paid',
          clue: '旧臣避开腰牌',
          attitude_shift: '从旁观转为有限作证',
          leaked: true,
        },
      }],
      payload: {
        discovered_assets: [{
          entity_type: 'item',
          name: '语义恢复铜钥匙',
          summary: '可以打开旧院密室',
          evidence: '李玄收起铜钥匙。',
          source_excerpt: '李玄收起铜钥匙。',
          constraints_json: {
            owner_rule: '只能由李玄持有',
            forbidden_reveal: '不得提前揭露钥匙来源',
          },
          state_json: { current_owner: '李玄', triggered: false },
        }],
        ip_scene_candidates: [expect.objectContaining({
          title: '密室蓝光',
          summary: '铜钥匙开启尘封密室',
          visual_hook: '石门缝隙漏出蓝光',
          adaptation_value: '章末高压追读',
          spread_point: '密室主人身份',
          quote: '蓝光照亮了众人的脸。',
        })],
      },
    })
    expect(recoveredApply.reused).toBe(true)
    expect(recoveredApply.update?.asset_intake?.discovered_assets).toContainEqual(expect.objectContaining({
      entity_type: 'item',
      name: '语义恢复铜钥匙',
      summary: '可以打开旧院密室',
    }))
    expect(recoveredApply.update?.ip_scene_intake?.ip_scene_candidates).toContainEqual(expect.objectContaining({
      title: '密室蓝光',
      summary: '铜钥匙开启尘封密室',
    }))
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(completed?.prepared_for_recovery).toBeUndefined()
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('keeps exact receipt state-applied when relation materialization fails and recovers without another model call', async () => {
    const fixture = await storyFixture(3, async () => {
      const payload = storyStatePayload('relation_failure')
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 62)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_exact_story_relation_insert
      BEFORE INSERT ON setting_entities WHEN NEW.entity_type = 'relationship'
      BEGIN SELECT RAISE(ABORT, 'injected relation materialization failure'); END;
    `)

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('injected relation materialization failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(fixture.modelCalls).toHaveLength(1)

    executeSql(workspace, 'DROP TRIGGER fail_exact_story_relation_insert')
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('concurrent recovery creates each receipt-derived review once', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 621)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const updateStoryStateMachine = fixture.ctx.updateStoryStateMachine
    let failFirstReview = true
    fixture.ctx.updateStoryStateMachine = (...args: any[]) => updateStoryStateMachine(
      ...args.slice(0, 6),
      {
        ...(args[6] || {}),
        saveDerivedReview: failFirstReview
          ? async () => { throw new Error('pause receipt at state-applied') }
          : undefined,
      },
    )
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).catch(() => null)

    failFirstReview = false
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: recoveredPrepare.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: recoveredPrepare.prepared,
      }),
    ])
    const receiptReviews = (await listNovelReviews(workspace, fixture.project.id))
      .filter(item => parsedPayload(item.payload).story_state_receipt_key === receiptKey)
    const derivedKeys = receiptReviews.map(item => parsedPayload(item.payload).derived_key)

    expect(receiptReviews.length).toBeGreaterThan(0)
    expect(new Set(derivedKeys).size).toBe(derivedKeys.length)
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('keeps exact receipt state-applied when chapter raw-payload write fails and recovers without another model call', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 63)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_exact_story_state_raw_payload
      BEFORE UPDATE ON chapters WHEN OLD.id = ${target.id}
      BEGIN SELECT RAISE(ABORT, 'injected story state raw payload failure'); END;
    `)

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('injected story state raw payload failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(fixture.modelCalls).toHaveLength(1)

    executeSql(workspace, 'DROP TRIGGER fail_exact_story_state_raw_payload')
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('non-exact Story State keeps relation and chapter raw-payload writes best-effort', async () => {
    const fixture = await storyFixture(3, async () => {
      const payload = storyStatePayload('non_exact_failure')
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 64),
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_non_exact_story_relation_insert
      BEFORE INSERT ON setting_entities WHEN NEW.entity_type = 'relationship'
      BEGIN SELECT RAISE(ABORT, 'injected non-exact relation failure'); END;
      CREATE TRIGGER fail_non_exact_story_state_raw_payload
      BEFORE UPDATE ON chapters WHEN OLD.id = ${target.id}
      BEGIN SELECT RAISE(ABORT, 'injected non-exact raw payload failure'); END;
    `)

    const result = await fixture.ctx.updateStoryStateMachine(
      workspace,
      fixture.project,
      target,
      { chapter_target: { chapter_id: target.id, chapter_no: target.chapter_no } },
      String(target.chapter_text || ''),
      undefined,
      { prepared: preparedResult.prepared },
    )

    expect(result.story_relation_materialize_error).toContain('injected non-exact relation failure')
  }, 30_000)

  test('completed replay returns the compact durable receipt payload', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 65)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const first = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    const replay = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: null,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(completed?.prepared_for_recovery).toBeUndefined()
    expect(completed?.payload).toEqual(first.update)
    expect(replay).toMatchObject({ reused: true, update: first.update })
  }, 30_000)

  test('prepare binds the prepared delta to its receipt and apply rejects another valid receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const candidateHash = revisionTextHash(String(target.chapter_text || ''))
    const preparedReceipt = receipt(target.id, candidateHash, 66)
    const otherReceipt = receipt(target.id, candidateHash, 67)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: preparedReceipt,
    })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: otherReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)

    expect(preparedResult.prepared?.receipt_binding).toMatchObject({ key: storyStateReceiptKey(preparedReceipt) })
    expect(error).toMatchObject({ code: 'STORY_STATE_PREPARED_RECEIPT_MISMATCH' })
  })

  test('apply rejects a prepared delta after the chapter candidate changes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 68)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await updateNovelChapter(workspace, target.id, { chapter_text: `${target.chapter_text} NEW_REVISION` }, { createVersion: false })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_CANDIDATE_STALE' })
  })

  test('apply revalidates the candidate inside the project receipt transaction', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 681)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const beforeProject = await getNovelProject(workspace, fixture.project.id)
    const beforeCharacters = await listNovelCharacters(workspace, fixture.project.id)
    const beforeSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const beforeReviews = await listNovelReviews(workspace, fixture.project.id)
    let injected = false
    setNovelMutationTestHook(event => {
      if (injected || event.operation !== 'apply-exact-story-state') return
      injected = true
      executeSql(workspace, `UPDATE chapters SET chapter_text = 'EDITED_DURING_APPLY' WHERE id = ${Number(target.id)}`)
    })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    setNovelMutationTestHook(null)
    const afterProject = await getNovelProject(workspace, fixture.project.id)

    expect(injected).toBe(true)
    expect(error).toMatchObject({ code: 'STORY_STATE_CANDIDATE_STALE' })
    expect(afterProject?.reference_config).toEqual(beforeProject?.reference_config)
    expect(await listNovelCharacters(workspace, fixture.project.id)).toEqual(beforeCharacters)
    expect(await listNovelSettingEntities(workspace, fixture.project.id)).toEqual(beforeSettings)
    expect(await listNovelReviews(workspace, fixture.project.id)).toEqual(beforeReviews)
  })

  test('apply requires prepared state when no completed receipt exists', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 69),
      prepared: null,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_PREPARED_REQUIRED' })
  })

  test('exact prepare disables application-level retry for truncated model output', async () => {
    const fixture = await storyFixture(3, async () => ({ parsed: { state_delta: {} }, finish_reason: 'length' }))
    const target = fixture.chapters[0]
    const result = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || ''))),
    })

    expect(result.prepared?.hard_failures).toContainEqual(expect.objectContaining({ key: 'story_state_transport_incomplete' }))
    expect(fixture.modelCalls).toHaveLength(1)
  })

  test('exact prepare forwards the configured Story State output budget to one model call', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      maxTokens: 12_000,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || ''))),
    })

    expect(fixture.modelCalls).toHaveLength(1)
    expect(fixture.modelCalls[0][3]).toEqual({
      activeWorkspace: workspace,
      modelId: '217',
      maxTokens: 12_000,
      temperature: 0.15,
      skipMemory: true,
      signal: undefined,
      timeoutMs: 180_000,
      maxRetries: 1,
    })
  })

  test('replay keeps character, setting, usage, raw payload, relation and asset-derived reviews idempotent', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 77)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const apply = () => applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    await apply()
    const semanticSnapshot = async () => ({
      character: (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)?.current_state,
      settings: (await listNovelSettingEntities(workspace, fixture.project.id)).map(item => ({ id: item.id, state: item.state_json })),
      usages: (await listNovelChapterSettingUsage(workspace, fixture.project.id, target.id)).map(item => ({ entity_id: item.entity_id, state: item.actual_state_change })),
      raw: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id)?.raw_payload,
      reviews: (await listNovelReviews(workspace, fixture.project.id)).map(item => ({ type: item.review_type, key: parsedPayload(item.payload).derived_key })),
    })
    const once = await semanticSnapshot()
    await apply()
    const twice = await semanticSnapshot()

    expect(twice).toEqual(once)
    expect(twice.reviews.some(item => item.type === 'asset_intake')).toBe(true)
    expect(twice.raw?.prose_admission?.story_state_status).toBe('synced')
  }, 30_000)
})
