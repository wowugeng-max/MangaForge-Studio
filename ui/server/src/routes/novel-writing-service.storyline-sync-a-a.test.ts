import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildAssetStateDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildDeslopRepairReceiptSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildProseRevisionReceiptSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRelationshipDeltaSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildRevisionScopeGuardSyncReport,
  buildStateDeltaCompletenessReport,
  buildStatusFilterReceiptSyncReport,
  buildStorylineSyncReport,
  buildTimelineDeltaSyncReport,
  mergeProseRevisionArtifacts,
} from '../novel-writing-service'
import {
  buildRevisionCascadeImpactSyncReviewRecord,
  buildRevisionScopeGuardSyncReviewRecord,
  buildStorylineSyncReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'
import { buildSkippedPostDeliveryStoryStateUpdate } from '../novel-writing/post-delivery-story-state-update'

const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')

const readGenerateChapterPipelineSource = () => {
  const serviceDir = join(import.meta.dir, '../novel-writing-service/service')
  return [
    readFileSync(join(serviceDir, 'generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-draft-prose.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-editor-meme-polish.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-acceptance-prep.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-full-production-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-draft-mode-store.ts'), 'utf8'),
    ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(serviceDir, name), 'utf8')).join('\n'),
    readFileSync(join(serviceDir, 'story-state-machine.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'story-state-helpers.ts'), 'utf8'),
  ].join('\n')
}

describe('storyline sync a a', () => {
  test('builds storyline sync report from planned and actual storyline updates', () => {
    const report = buildStorylineSyncReport(
      {
        storyline_context: {
          chapter_usage: [
            { entity_id: 1, name: '夺回镜州主线', usage_type: 'advance', expected_state_change: { target: '当众压住王府管事' } },
            { entity_id: 2, name: '旧臣背刺伏笔线', usage_type: 'plant', expected_state_change: { clue: '旧臣避开腰牌' } },
            { entity_id: 3, name: '幕后主使真名', usage_type: 'forbidden', expected_state_change: { forbidden: '不得揭露真名' } },
          ],
        },
        chapter_target: {
          storyline_payoffs: ['边军腰牌支线'],
        },
      },
      [
        { entity_id: 1, name: '夺回镜州主线', entity_type: 'mainline', actual_state_change: { current_state: '当众压住王府管事' } },
        { name: '边军腰牌支线', entity_type: 'subplot', actual_state_change: { payoff_status: 'paid' } },
        { name: '额外教团渗透线', entity_type: 'faction_arc', actual_state_change: { current_state: '教团标记出现' } },
        { name: '幕后主使真名', entity_type: 'foreshadowing_arc', actual_state_change: { leaked: true } },
      ],
    )

    expect(report.status).toBe('warn')
    expect(report.planned.map((item: any) => item.name)).toEqual(expect.arrayContaining(['夺回镜州主线', '旧臣背刺伏笔线', '幕后主使真名', '边军腰牌支线']))
    expect(report.completed.map((item: any) => item.name)).toEqual(expect.arrayContaining(['夺回镜州主线', '边军腰牌支线']))
    expect(report.missed.map((item: any) => item.name)).toContain('旧臣背刺伏笔线')
    expect(report.unplanned.map((item: any) => item.name)).toContain('额外教团渗透线')
    expect(report.forbidden_touched.map((item: any) => item.name)).toContain('幕后主使真名')
  })

  test('story state prompt asks for storyline updates and sync review is created', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('storyline_updates')
    expect(source).toContain('buildStorylineSyncReport(')
    expect(source).toContain('buildStorylineSyncReviewRecord({ projectId: project.id, chapter, storylineSync })')
    expect(postDeliverySource).toContain("'storyline_sync'")
  })

  test('accepts camelCase story state agent payloads before persistence', () => {
    const source = readGenerateChapterPipelineSource()
    const helperStart = source.indexOf('function normalizeStoryStateDeltaForStorage')
    const helperEnd = source.indexOf('function mergeStoryState', helperStart)
    const helperBlock = source.slice(helperStart, helperEnd)
    const prepareStart = source.indexOf('const prepareStoryStateUpdate =')
    const prepareEnd = source.indexOf('const updateStoryStateMachine =', prepareStart)
    const prepareBlock = source.slice(prepareStart, prepareEnd)
    const acceptanceStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(')
    const acceptanceEnd = source.indexOf('const updated = acceptance.chapter', acceptanceStart)
    const acceptanceBlock = source.slice(acceptanceStart, acceptanceEnd)

    expect(helperStart).toBeGreaterThanOrEqual(0)
    expect(helperEnd).toBeGreaterThan(helperStart)
    expect(helperBlock).toContain('characterPositions')
    expect(helperBlock).toContain('relationshipGraph')
    expect(helperBlock).toContain('itemOwnership')
    expect(helperBlock).toContain('nextChapterPriorities')
    expect(helperBlock).toContain('layeredMemoryContext')
    expect(prepareBlock).toContain('payload?.state_delta || payload?.stateDelta')
    expect(prepareBlock).toContain('payload?.character_updates || payload?.characterUpdates')
    expect(prepareBlock).toContain('payload?.setting_updates || payload?.settingUpdates')
    expect(prepareBlock).toContain('payload?.storyline_updates || payload?.storylineUpdates')
    expect(prepareBlock).toContain('payload?.discovered_assets || payload?.discoveredAssets')
    expect(acceptanceBlock).toContain('next_reference_config: preparedStoryStateUpdate.next_reference_config')
    expect(acceptanceBlock).toContain('character_updates: acceptanceCharacterUpdates')
    expect(acceptanceBlock).toContain('setting_updates: acceptanceSettingUpdates')
    expect(acceptanceBlock).toContain('usage_updates: acceptanceUsageUpdates')
  })

  test('detects missing state delta records when prose visibly changes chapter state', () => {
    const chapterText = [
      '子时前，李玄潜入禁库，把第二本账册从暗格里取出来。',
      '林青禾公开作证，等于当场得罪会长，李玄与林青禾从旁观关系变成有限互信。',
      '旧印章只露出半枚印纹，背面却压着第二个证人的名字。',
      '门后传来第三个人的咳声，这条线索把旧案真相继续压到下一章。',
    ].join('\n')

    const report = buildStateDeltaCompletenessReport(
      { id: 12, chapter_no: 12, title: '禁库半印' },
      chapterText,
      {},
      {
        settingUpdates: [],
        characterUpdates: [],
        storylineUpdates: [],
        discoveredAssets: [],
        foreshadowingStatus: {},
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('状态增量漏记')
    expect(report.missed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'timeline',
      'character_state',
      'asset_state',
      'relationship',
      'foreshadowing_or_handoff',
    ]))
    expect(report.next_actions.join('；')).toContain('每章写完立即更新')
  })

  test('does not flag state delta completeness when visible prose changes are recorded', () => {
    const chapterText = [
      '子时前，李玄潜入禁库，把第二本账册从暗格里取出来。',
      '林青禾公开作证，等于当场得罪会长，李玄与林青禾从旁观关系变成有限互信。',
      '旧印章只露出半枚印纹，背面却压着第二个证人的名字。',
      '门后传来第三个人的咳声，这条线索把旧案真相继续压到下一章。',
    ].join('\n')

    const report = buildStateDeltaCompletenessReport(
      { id: 12, chapter_no: 12, title: '禁库半印' },
      chapterText,
      {
        current_time: '子时前',
        active_locations: ['禁库'],
        timeline: ['李玄潜入禁库取出第二本账册。'],
        character_relationships: { 林青禾: '公开作证，得罪会长；与李玄形成有限互信' },
        resource_status: { 旧印章: '只露出半枚印纹' },
        item_ownership: { 第二本账册: '李玄' },
        open_questions: ['第二个证人的名字和第三个人是谁。'],
        next_chapter_priorities: ['追查第三个人和旧案真相。'],
      },
      {
        settingUpdates: [
          { name: '旧印章', entity_type: 'item', state_delta: { visibility: '半枚印纹' } },
        ],
        characterUpdates: [
          { name: '林青禾', current_state: { relationship_attitudes: '有限互信', public_image: '公开作证后得罪会长' } },
        ],
        storylineUpdates: [
          { name: '李玄与林青禾互信线', entity_type: 'relationship_arc', actual_state_change: { status: '有限互信' } },
        ],
        discoveredAssets: [
          { entity_type: 'foreshadowing', name: '第二个证人名字', summary: '旧印章背面露出第二个证人的名字。' },
        ],
        foreshadowingStatus: {
          第二个证人名字: { status: '已埋', summary: '旧印章背面露出名字。' },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.missed_count).toBe(0)
  })

  test('story state sync persists a state delta completeness review', () => {
    const source = readGenerateChapterPipelineSource()

    expect(source).toContain("reviewType: 'state_delta_completeness'")
    expect(source).toContain('buildStateDeltaCompletenessReport(chapter, chapterText, stateDelta')
    expect(source).toContain('payload.state_delta_completeness = stateDeltaCompleteness')
  })

  test('builds foreshadowing delta sync from current-chapter plant advance and payoff updates only', () => {
    const contextPackage = {
      storyline_context: {
        chapter_usage: [
          { entity_id: 11, name: '旧臣背刺伏笔线', entity_type: 'foreshadowing_arc', usage_type: 'plant', expected_state_change: { clue: '旧臣避开腰牌' } },
          { entity_id: 12, name: '边军腰牌支线', entity_type: 'foreshadowing_arc', usage_type: 'payoff', expected_state_change: { payoff_status: 'paid' } },
          { entity_id: 13, name: '盐商暗线', entity_type: 'subplot', usage_type: 'advance', expected_state_change: { clue: '盐票异常' } },
        ],
      },
      chapter_target: {
        storyline_plants: ['暗门钥匙伏笔'],
      },
    }
    const okReport = buildForeshadowingDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '腰牌' },
      contextPackage,
      [
        { entity_id: 12, name: '边军腰牌支线', entity_type: 'foreshadowing_arc', usage_type: 'payoff', actual_state_change: { payoff_status: 'paid' } },
        { entity_id: 11, name: '旧臣背刺伏笔线', entity_type: 'foreshadowing_arc', usage_type: 'plant', actual_state_change: { clue: '旧臣避开腰牌' } },
      ],
      [
        { entity_type: 'foreshadowing', name: '暗门钥匙伏笔', summary: '门环背面缺口和钥匙齿痕对应。' },
      ],
      {},
    )
    const warnReport = buildForeshadowingDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '腰牌' },
      contextPackage,
      [
        { entity_id: 12, name: '边军腰牌支线', entity_type: 'foreshadowing_arc', usage_type: 'payoff', actual_state_change: { payoff_status: 'paid' } },
      ],
      [],
      {},
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('伏笔增量 OK')
    expect(okReport.planned_count).toBe(3)
    expect(okReport.recorded_count).toBe(3)
    expect(okReport.missed_count).toBe(0)
    expect(okReport.recorded.map((item: any) => item.name)).toEqual(expect.arrayContaining(['旧臣背刺伏笔线', '边军腰牌支线', '暗门钥匙伏笔']))
    expect(okReport.unrelated_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.name)).toEqual(expect.arrayContaining(['旧臣背刺伏笔线', '暗门钥匙伏笔']))
    expect(warnReport.next_actions.join('；')).toContain('本轮新增/推进/回收')
  })

  test('story state sync persists a foreshadowing_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain("reviewType: 'foreshadowing_delta_sync'")
    expect(source).toContain('buildForeshadowingDeltaSyncReport(chapter, contextPackage, storylineUpdates, discoveredAssets, payload?.foreshadowing_status || payload?.foreshadowingStatus || {})')
    expect(source).toContain('payload.foreshadowing_delta_sync = foreshadowingDeltaSync')
    expect(postDeliverySource).toContain("'foreshadowing_delta_sync'")
  })

  test('builds timeline delta sync from current-chapter time, location, and scene order only', () => {
    const contextPackage = {
      chapter_target: {
        current_time: '戌时三刻',
        active_locations: ['镜州暗门外廊'],
        timeline_beats: [
          { label: '腰牌复核', text: '主角先在外廊确认腰牌裂痕。' },
          { label: '暗门开启', text: '随后暗门在戌时三刻打开。' },
        ],
        scene_cards: [
          {
            scene_no: 1,
            title: '外廊对证',
            time: '戌时三刻前',
            location: '镜州暗门外廊',
          },
        ],
      },
    }
    const okReport = buildTimelineDeltaSyncReport(
      { id: 9, chapter_no: 9, title: '旧臣回声' },
      contextPackage,
      {
        current_time: '戌时三刻',
        active_locations: [{ name: '镜州暗门外廊', source_excerpt: '戌时三刻，李玄停在镜州暗门外廊。' }],
        timeline: [
          { event: '主角先在镜州暗门外廊确认腰牌裂痕。', source_excerpt: '他先在镜州暗门外廊确认腰牌裂痕。' },
          { event: '随后暗门在戌时三刻打开。', source_excerpt: '随后暗门在戌时三刻打开。' },
        ],
      },
      [{ name: '镜州暗门外廊', entity_type: 'location', actual_state_change: { current_time: '戌时三刻' }, source_excerpt: '戌时三刻，镜州暗门外廊终于露出缝隙。' }],
    )
    const warnReport = buildTimelineDeltaSyncReport(
      { id: 9, chapter_no: 9, title: '旧臣回声' },
      contextPackage,
      {
        current_time: '',
        active_locations: [],
        timeline: ['主角追查旧臣。'],
      },
      [],
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('时间线增量 OK')
    expect(okReport.planned_count).toBeGreaterThanOrEqual(4)
    expect(okReport.recorded_count).toBeGreaterThanOrEqual(3)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['当前时间', '活动地点', '腰牌复核', '暗门开启']))
    expect(warnReport.next_actions.join('；')).toContain('只补本章时间线增量')
  })

  test('warns when timeline delta records lack source evidence from the chapter text', () => {
    const contextPackage = {
      chapter_target: {
        current_time: '戌时三刻',
        active_locations: ['镜州暗门外廊'],
        timeline_beats: ['随后暗门在戌时三刻打开。'],
      },
    }

    const report = buildTimelineDeltaSyncReport(
      { id: 9, chapter_no: 9, title: '旧臣回声' },
      contextPackage,
      {
        current_time: '戌时三刻',
        active_locations: ['镜州暗门外廊'],
        timeline: ['随后暗门在戌时三刻打开。'],
      },
      [],
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBeGreaterThanOrEqual(3)
    expect(report.evidence_missing.map((item: any) => item.label)).toEqual(expect.arrayContaining(['当前时间', '活动地点', '时间线节点']))
    expect(report.next_actions.join('；')).toContain('source_excerpt')
  })

  test('story state sync persists a timeline_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const promptSource = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(source).toContain("reviewType: 'timeline_delta_sync'")
    expect(source).toContain('buildTimelineDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates)')
    expect(source).toContain('payload.timeline_delta_sync = timelineDeltaSync')
    expect(promptSource).toContain('state_delta.timeline/current_time/active_locations 要尽量带 source_excerpt 或 evidence')
  })

  test('builds character state delta sync from current-chapter involved characters only', () => {
    const contextPackage = {
      chapter_target: {
        state_tracking_contract: {
          character_states: [
            '李玄：位置：审判庭；能力：残阵只能维持三息；持有物：第二本账册；认知边界：还不知道旧印章主人。',
            '林青禾：位置：旁听席；关系态度：愿意有限作证；公众形象：仍被家族盯着。',
          ],
        },
      },
    }
    const okReport = buildCharacterStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        character_positions: { 李玄: '审判庭', 林青禾: '旁听席' },
        character_relationships: { 林青禾: '愿意有限作证' },
      },
      [
        { name: '李玄', current_state: { ability_status: '残阵只能维持三息', items: ['第二本账册'], knowledge_scope: '还不知道旧印章主人' }, source_excerpt: '李玄把残阵压到三息内，第二本账册还扣在掌心。' },
        { name: '林青禾', current_state: { public_image: '仍被家族盯着', relationship_attitudes: '愿意有限作证' }, source_excerpt: '林青禾站在旁听席边，顶着家族目光点头作证。' },
      ],
    )
    const warnReport = buildCharacterStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        character_positions: { 李玄: '审判庭' },
      },
      [
        { name: '李玄', current_state: { ability_status: '残阵只能维持三息' } },
      ],
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('角色状态增量 OK')
    expect(okReport.planned_count).toBe(2)
    expect(okReport.recorded_count).toBeGreaterThanOrEqual(2)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.name)).toContain('林青禾')
    expect(warnReport.next_actions.join('；')).toContain('只补本章角色状态增量')
  })

  test('warns when character state updates lack source evidence from the chapter text', () => {
    const contextPackage = {
      chapter_target: {
        state_tracking_contract: {
          character_states: [
            '林青禾：关系态度：愿意有限作证；公众形象：仍被家族盯着。',
          ],
        },
      },
    }

    const report = buildCharacterStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        character_positions: { 林青禾: '旁听席' },
        character_relationships: { 林青禾: '愿意有限作证' },
      },
      [
        { name: '林青禾', current_state: { public_image: '仍被家族盯着', relationship_attitudes: '愿意有限作证' } },
      ],
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(1)
    expect(report.evidence_missing.map((item: any) => item.name)).toContain('林青禾')
    expect(report.next_actions.join('；')).toContain('source_excerpt')
  })

  test('story state sync persists a character_state_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()

    expect(source).toContain("reviewType: 'character_state_delta_sync'")
    expect(source).toContain('buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDelta, characterUpdates)')
    expect(source).toContain('payload.character_state_delta_sync = characterStateDeltaSync')
    expect(source).toContain('source_excerpt')
  })

  test('builds asset state delta sync from current-chapter key assets and setting updates', () => {
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          key_assets: ['第二本账册：从证据变成勒索筹码', '旧印章：只露出半枚印纹'],
          linkage_plan: [
            '第二本账册必须改变归属，落到李玄手里。',
            '旧印章必须改变可见性，只露半枚印纹。',
          ],
          state_tracking: ['第二本账册当前归属未知', '旧印章仍未完整公开'],
        },
      },
      setting_context: {
        chapter_usage: [
          { entity_id: 31, name: '第二本账册', entity_type: 'item', usage_type: 'payoff', expected_state_change: { owner: '李玄' } },
          { entity_id: 32, name: '旧印章', entity_type: 'item', usage_type: 'plant', expected_state_change: { visibility: '半枚印纹' } },
        ],
      },
    }
    const okReport = buildAssetStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        item_ownership: { 第二本账册: '李玄' },
        resource_status: { 旧印章: '只露半枚印纹' },
      },
      [
        { entity_id: 31, name: '第二本账册', entity_type: 'item', actual_state_change: { owner: '李玄' }, source_excerpt: '第二本账册被李玄扣进袖中。' },
        { entity_id: 32, name: '旧印章', entity_type: 'item', state_delta: { visibility: '半枚印纹' }, source_excerpt: '旧印章只在灯下露出半枚印纹。' },
      ],
      [],
    )
    const warnReport = buildAssetStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        item_ownership: { 第二本账册: '李玄' },
      },
      [
        { entity_id: 31, name: '第二本账册', entity_type: 'item', actual_state_change: { owner: '李玄' } },
      ],
      [],
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('资产状态增量 OK')
    expect(okReport.planned_count).toBe(2)
    expect(okReport.recorded_count).toBeGreaterThanOrEqual(2)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.name)).toContain('旧印章')
    expect(warnReport.next_actions.join('；')).toContain('只补本章资产状态增量')
  })

  test('warns when asset state records lack source evidence from the chapter text', () => {
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          key_assets: ['第二本账册：从证据变成勒索筹码'],
        },
      },
      setting_context: {
        chapter_usage: [
          { entity_id: 31, name: '第二本账册', entity_type: 'item', usage_type: 'payoff', expected_state_change: { owner: '李玄' } },
        ],
      },
    }

    const report = buildAssetStateDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        item_ownership: { 第二本账册: '李玄' },
      },
      [
        { entity_id: 31, name: '第二本账册', entity_type: 'item', actual_state_change: { owner: '李玄' } },
      ],
      [],
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(1)
    expect(report.evidence_missing.map((item: any) => item.name)).toContain('第二本账册')
    expect(report.next_actions.join('；')).toContain('source_excerpt')
  })

  test('story state sync persists an asset_state_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const promptSource = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(source).toContain("reviewType: 'asset_state_delta_sync'")
    expect(source).toContain('buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates, discoveredAssets)')
    expect(source).toContain('payload.asset_state_delta_sync = assetStateDeltaSync')
    expect(promptSource).toContain('setting_updates: array，每项包含 entity_id 或 name, entity_type, state_delta, actual_state_change, source_excerpt 或 evidence')
  })

  test('builds relationship delta sync from current-chapter relation contract and relationship graph updates', () => {
    const contextPackage = {
      chapter_target: {
        character_relation_contract: {
          important_relationships: ['李玄与林青禾互信线'],
          tests_or_pressure: ['公开作证会让林青禾承受家族压力'],
          attitude_shifts: ['林青禾从旁观转为有限作证'],
        },
      },
      storyline_context: {
        chapter_usage: [
          {
            entity_id: 41,
            name: '李玄与林青禾互信线',
            entity_type: 'relationship_arc',
            usage_type: 'advance',
            expected_state_change: { attitude_shift: '从旁观转为有限作证' },
          },
        ],
      },
    }
    const okReport = buildRelationshipDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        character_relationships: { 林青禾: '从旁观转为有限作证' },
        relationship_graph: { '李玄-林青禾': { status: '有限互信', cost: '林青禾承受家族压力' } },
      },
      [
        {
          entity_id: 41,
          name: '李玄与林青禾互信线',
          entity_type: 'relationship_arc',
          actual_state_change: { attitude_shift: '从旁观转为有限作证', cost: '家族压力' },
        },
      ],
    )
    const warnReport = buildRelationshipDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '公开作证' },
      contextPackage,
      {
        character_relationships: {},
        relationship_graph: {},
      },
      [],
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('关系增量 OK')
    expect(okReport.planned_count).toBe(1)
    expect(okReport.recorded_count).toBeGreaterThanOrEqual(2)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.name)).toContain('李玄与林青禾互信线')
    expect(warnReport.next_actions.join('；')).toContain('只补本章关系增量')
  })

  test('story state sync persists a relationship_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()

    expect(source).toContain("reviewType: 'relationship_delta_sync'")
    expect(source).toContain('buildRelationshipDeltaSyncReport(chapter, contextPackage, stateDelta, storylineUpdates)')
    expect(source).toContain('payload.relationship_delta_sync = relationshipDeltaSync')
  })

})
