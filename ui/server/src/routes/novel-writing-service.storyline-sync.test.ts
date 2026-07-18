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

describe('storyline sync backfill', () => {
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('storyline_updates')
    expect(source).toContain('buildStorylineSyncReport(')
    expect(source).toContain('buildStorylineSyncReviewRecord({ projectId: project.id, chapter, storylineSync })')
    expect(postDeliverySource).toContain("'storyline_sync'")
  })

  test('accepts camelCase story state agent payloads before persistence', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const helperStart = source.indexOf('const normalizeStoryStateDeltaForStorage =')
    const helperEnd = source.indexOf('const mergeStoryState =', helperStart)
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'relationship_delta_sync'")
    expect(source).toContain('buildRelationshipDeltaSyncReport(chapter, contextPackage, stateDelta, storylineUpdates)')
    expect(source).toContain('payload.relationship_delta_sync = relationshipDeltaSync')
  })

  test('builds chapter handoff delta sync from ending hook and next chapter state only', () => {
    const contextPackage = {
      chapter_target: {
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        page_turn_hook_brief: {
          next_chapter_pull: '第三个人的名字会改变旧案归属。',
        },
        scene_cards: [
          { scene_no: 2, title: '证词裂口', ending_hook_seed: '第三个人藏在缺页背面。' },
        ],
      },
    }
    const okReport = buildChapterHandoffDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      contextPackage,
      {
        open_questions: ['旧案当晚的第三个人是谁'],
        next_chapter_priorities: ['第三个人的名字会改变旧案归属'],
      },
    )
    const warnReport = buildChapterHandoffDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      contextPackage,
      {
        open_questions: [],
        next_chapter_priorities: [],
      },
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章末交接 OK')
    expect(okReport.planned_count).toBeGreaterThanOrEqual(2)
    expect(okReport.recorded_count).toBe(2)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(warnReport.next_actions.join('；')).toContain('只补本章章末交接')
  })

  test('reads raw camelCase chapter handoff delta brief after delivery', () => {
    const chapter = {
      id: 8,
      chapter_no: 8,
      title: '第二个证人',
      raw_payload: {
        preDraftBrief: {
          endingHook: '第二个证人说出旧案当晚还有第三个人。',
          pageTurnHookBrief: {
            nextChapterPull: '第三个人的名字会改变旧案归属。',
          },
        },
      },
    }
    const report = buildChapterHandoffDeltaSyncReport(
      chapter,
      {},
      {
        open_questions: ['旧案当晚的第三个人是谁'],
        next_chapter_priorities: ['第三个人的名字会改变旧案归属'],
      },
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('章末交接 OK')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(report.missed_count).toBe(0)
  })

  test('reads camelCase chapterTarget handoff delta from runtime context', () => {
    const contextPackage = {
      chapterTarget: {
        endingHook: '旧案当晚的第三个人把缺页藏进禁库门牌。',
        pageTurnHookBrief: {
          nextChapterPull: '下一章必须追查禁库门牌是谁留下的。',
        },
      },
    }
    const report = buildChapterHandoffDeltaSyncReport(
      { id: 9, chapter_no: 9, title: '禁库门牌' },
      contextPackage,
      {
        openQuestions: ['旧案当晚的第三个人为什么把缺页藏进禁库门牌'],
        nextChapterPriorities: ['下一章必须追查禁库门牌是谁留下的'],
      },
    )

    expect(report.status).toBe('ok')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(report.missed_count).toBe(0)
  })

  test('story state sync persists a chapter_handoff_delta_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_handoff_delta_sync'")
    expect(source).toContain('buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDelta)')
    expect(source).toContain('payload.chapter_handoff_delta_sync = chapterHandoffDeltaSync')
  })

  test('builds prose revision receipt sync from post-revision residual risks only', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        review: {
          score: 82,
          issues: [
            { severity: 'S2', category: 'prose', evidence: '他心中泛起复杂情绪', fix: '改成动作和对白' },
          ],
        },
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'prose',
              original_evidence: '他心中泛起复杂情绪',
              applied_fix: '补了握紧账册和逼问对白',
              changed_evidence: '他把账册按在案上，问林青禾还敢不敢作证。',
              remaining_risk: '仍有抽象心理描写，没有改成动作和对白。',
            },
            {
              issue_index: 1,
              severity: 'S3',
              category: 'pacing',
              original_evidence: '解释偏长',
              applied_fix: '压缩说明',
              changed_evidence: '三句压成一句。',
              remaining_risk: '无',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('抽象心理描写')
    expect(report.missed[0].evidence).toContain('他把账册按在案上')
    expect(report.next_actions.join('；')).toContain('只补修订后仍残留')
  })

  test('merges multi-pass revision artifacts instead of dropping earlier quality repair receipts', () => {
    const merged = mergeProseRevisionArtifacts({
      revision_receipts: [
        {
          issue_index: 1,
          applied_fix: '修复承接风险',
          changed_evidence: '江哲把清算倒计时压进最后三十息。',
        },
      ],
      oh_story_delivery_receipts: {
        delivery_risk_receipts: [
          {
            risk_item: '质量续航',
            required_action: '维持冲突压力与章尾翻页',
            delivered: true,
            evidence: '清算倒计时：三十息。',
            remaining_risk: '',
          },
        ],
      },
    }, {
      deslop_repair_receipts: [
        {
          gate: 'A',
          changed_evidence: '枪身符文倒卷，勒住追索者食指。',
          remaining_risk: '',
        },
      ],
      oh_story_delivery_receipts: {
        deslop_repair_receipts: [
          {
            gate: 'A',
            changed_evidence: '枪身符文倒卷，勒住追索者食指。',
            remaining_risk: '',
          },
        ],
      },
    })

    expect(merged.revision_receipts).toHaveLength(1)
    expect(merged.deslop_repair_receipts).toHaveLength(1)
    expect(merged.oh_story_delivery_receipts.delivery_risk_receipts).toHaveLength(1)
    expect(merged.oh_story_delivery_receipts.deslop_repair_receipts).toHaveLength(1)
  })

  test('warns when prose was revised but revision receipts are missing', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          score: 82,
          issues: [
            { severity: 'S2', category: 'prose', evidence: '他心中泛起复杂情绪', fix: '改成动作和对白' },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('修订回执未生成')
    expect(report.missed[0].text).toContain('无法确认修订是否逐条闭环')
    expect(report.next_actions.join('；')).toContain('revision_receipts')
  })

  test('warns when failed delivery risk receipts are not matched by revision receipts', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'prose',
              original_evidence: '解释偏长',
              applied_fix: '压缩说明',
              changed_evidence: '三句压成一句。',
              remaining_risk: '无',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].category).toBe('delivery_risk_receipt')
    expect(report.missed[0].text).toContain('缺少对应交稿风险修订回执')
    expect(report.missed[0].text).toContain('章末把带血腰牌')
    expect(report.missed[0].evidence).toContain('最后300字没有形成追读钩子')
    expect(report.next_actions.join('；')).toContain('delivery_risk_receipts')
    expect(report.next_actions.join('；')).toContain('changed_evidence')
  })

  test('uses stored oh-story revision receipts to close delivery risk receipt sync', () => {
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的裂缝',
        raw_payload: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].changed_evidence).toContain('带血腰牌')
  })

  test('uses nested revision oh-story receipts to close delivery risk receipt sync before storage', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].changed_evidence).toContain('带血腰牌')
  })

  test('keeps prose revision receipt sync open when a matched receipt omits changed evidence', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的缺证据闭环' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
    expect(report.missed[0].evidence).toContain('把腰牌血迹变成阵堂旧案的新问题')
  })

  test('keeps prose revision receipt sync open when changed evidence lands outside repair segment', () => {
    const middleEvidence = '中段证据：带血腰牌被夹在账册里翻出，林青禾当场改口。'
    const chapterText = [
      '开篇只写掌柜关门和主角复盘旧案。'.padEnd(320, '开'),
      middleEvidence,
      '章末只写众人沉默退场，没有新的追读钩子。'.padStart(320, '末'),
    ].join('')
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的错位证据',
        chapter_text: chapterText,
      },
      {
        revised: true,
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '补了腰牌血迹和旧案名字。',
                changed_evidence: middleEvidence,
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('最后300字')
    expect(report.missed[0].evidence).toContain('带血腰牌被夹在账册里')
  })

  test('keeps residual risks from stored oh-story revision receipts open', () => {
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的裂缝',
        raw_payload: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                severity: 'S2',
                category: 'prose',
                applied_fix: '补了一句追问。',
                changed_evidence: '他追问腰牌从哪里来。',
                remaining_risk: '追问没有造成行动后果，章末仍然停在解释。',
              },
            ],
          },
        },
      },
      {
        revised: true,
        review: { score: 82 },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('追问没有造成行动后果')
  })

  test('warns when deslop repair ran but deslop repair receipts are missing', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的裂缝' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('去AI味修复回执未生成')
    expect(report.missed[0].text).toContain('无法确认 Gate A-G 是否逐项闭环')
    expect(report.missed[0].evidence).toContain('Gate F')
    expect(report.next_actions.join('；')).toContain('deslop_repair_receipts')
  })

  test('uses nested oh-story deslop repair receipts to close deslop repair sync', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                applied_fix: '改成城门失守的可见动作。',
                changed_evidence: '城门方向的火把忽然断成两截，他把腰牌压进掌心。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('去AI味修复回执 OK')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
  })

  test('keeps deslop repair receipt sync open when keyed receipt omits changed evidence', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的键名伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

  test('keeps deslop repair receipt sync open when changed evidence is generic', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的指代伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                applied_fix: '改成城门失守的可见动作。',
                changed_evidence: '见修订稿。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('见修订稿')
  })

  test('keeps deslop repair receipt sync open when changed evidence is not in revised prose', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '去AI味后的虚构证据',
        chapter_text: '城门方向只剩冷灰，主角把旧账册塞回袖中，转身去追报信人。',
      },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                applied_fix: '改成城门失守的可见动作。',
                changed_evidence: '城门方向的火把忽然断成两截，他把腰牌压进掌心。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('无法定位到修订后正文')
    expect(report.missed[0].evidence).toContain('城门方向的火把')
  })

  test('warns when quality audit repair ran but quality audit repair receipts are missing', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的裂缝' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('质量诊断修复回执未生成')
    expect(report.missed[0].text).toContain('无法确认质量诊断缺口是否逐项闭环')
    expect(report.missed[0].evidence).toContain('章节推进')
    expect(report.next_actions.join('；')).toContain('quality_audit_repair_receipts')
  })

  test('uses nested oh-story quality audit repair receipts to close quality audit repair sync', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '守军听完旧证后立刻改了城门换防令。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('质量诊断修复回执 OK')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
  })

  test('keeps quality audit repair receipt sync open when changed evidence is not in revised prose', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '诊断修复后的虚构证据',
        chapter_text: '旧证被摊在桌上，守军没有立刻表态，只让主角明日再来。',
      },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '守军听完旧证后立刻改了城门换防令。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('无法定位到修订后正文')
    expect(report.missed[0].evidence).toContain('守军听完旧证')
  })

  test('keeps quality audit repair receipt sync open when changed evidence is generic', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已修复')
  })

  test('keeps quality audit repair receipt sync open when changed evidence only says it was adjusted', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的调整伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已经调整。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已经调整')
  })

  test('keeps quality audit repair receipt sync open when changed evidence only says it was supplemented', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的补充伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已经补充。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已经补充')
  })

  test('keeps quality audit repair receipt sync open when changed evidence points vaguely to revised prose', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的指代伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '详见修订后正文。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('详见修订后正文')
  })

  test('keeps quality audit repair receipt sync open when changed evidence is missing', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的缺证据闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
    expect(report.missed[0].evidence).toContain('让旧证触发守军换防')
  })

  test('keeps quality audit repair receipt sync open when keyed receipt omits changed evidence', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的键名伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                key: 'chapter_progress',
                label: '章节推进',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

  test('keeps quality audit repair receipt sync open when labeled receipt omits changed evidence', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的标签伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                label: '章节推进',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

  test('warns when next-chapter quality plan debt lacks receipts', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航未闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: { score: 82 },
        revision: {},
      },
    )

    expect(report.status).toBe('warn')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(0)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].key).toBe('next_chapter_quality_plan_receipts')
    expect(report.next_actions.join('；')).toContain('next_chapter_quality_plan_receipts')
  })

  test('closes next-chapter quality plan receipt sync when receipts are delivered', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              delivered: true,
              evidence: '他把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].evidence).toContain('带血腰牌')
  })

  test('keeps next-chapter quality plan receipt sync open when delivered receipts lack evidence', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航证据缺失' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首承接',
              delivered: true,
              evidence: '',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '章首承接',
    })
    expect(report.missed[0].text).toContain('缺少 evidence')
    expect(report.next_actions.join('；')).toContain('evidence')
  })

  test('keeps next-chapter quality plan receipt sync open when delivered evidence is generic', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航伪闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首承接',
              status: 'pass',
              delivered: true,
              evidence: '已完成。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '章首承接',
    })
    expect(report.missed[0].text).toContain('可定位正文证据')
    expect(report.missed[0].evidence).toContain('已完成')
  })

  test('keeps next-chapter quality plan receipt sync open when delivered evidence is not in prose', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '续航证据错位',
        chapter_text: '他把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
      },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首承接',
              delivered: true,
              evidence: '林青禾在雨巷交出青玉簪。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '章首承接',
    })
    expect(report.missed[0].text).toContain('无法定位')
  })

  test('keeps next-chapter quality plan receipt sync open when staged evidence lands in the wrong section', () => {
    const chapterText = [
      '林青禾刚推开门，就在第一段查到账册缺页，执事的脸色当场变了。',
      '第一幕继续压住现场目标。'.repeat(40),
      '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
      '中段继续推进追查。'.repeat(40),
      '钟声响起前，广播室名单在桌角翻开，所有人的呼吸都停了一拍。',
    ].join('')
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      {
        id: 10,
        chapter_no: 10,
        title: '续航落点错位',
        chapter_text: chapterText,
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            quality_focus: ['章首接住腰牌钩子'],
            opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
            middle_actions: ['中段查到账册缺页'],
            ending_actions: ['章尾压出广播室名单'],
          },
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首腰牌承接',
              delivered: true,
              evidence: '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
            {
              key: 'middle_actions',
              label: '中段账册推进',
              delivered: true,
              evidence: '林青禾刚推开门，就在第一段查到账册缺页，执事的脸色当场变了。',
              remaining_risk: '',
            },
            {
              key: 'ending_actions',
              label: '章尾名单钩子',
              delivered: true,
              evidence: '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(3)
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('前300字')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('中段')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('最后300字')
  })

  test('builds fallback status filter receipts from state tracking contract when model omits them', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选兜底闭环',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        review: { score: 82 },
        revision: {},
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBeGreaterThanOrEqual(2)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'character_states_1',
      'world_constraints_1',
    ]))
    expect(report.completed.find((item: any) => item.key === 'character_states_1')).toMatchObject({
      used_in_chapter: true,
    })
    expect(report.completed.find((item: any) => item.key === 'world_constraints_1')).toMatchObject({
      used_in_chapter: false,
    })
  })

  test('closes status filter receipt sync when used and excluded states are accounted for', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态筛选闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            foreshadowing_threads: ['旧印缺页'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾只递出半枚旧印，没有说出完整名单。',
                  remaining_risk: '',
                },
                {
                  key: 'world_constraint_outer_city',
                  label: '外城禁令',
                  used_in_chapter: false,
                  excluded_reason: '本章只在阵堂内审旧印，外城禁令不会影响本章正确性。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(2)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining(['character_state_linqinghe', 'world_constraint_outer_city']))
  })

  test('keeps status filter receipt sync open when used state evidence is generic', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态筛选伪闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  status: 'pass',
                  used_in_chapter: true,
                  evidence: '已核对。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '林青禾认知边界',
    })
    expect(report.missed[0].text).toContain('可定位正文证据')
    expect(report.missed[0].evidence).toContain('已核对')
  })

  test('keeps status filter receipt sync open when excluded state reason is generic', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态排除伪闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'world_constraint_outer_city',
                  label: '外城禁令',
                  status: 'ok',
                  used_in_chapter: false,
                  excluded_reason: '已核对。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '外城禁令',
    })
    expect(report.missed[0].text).toContain('具体 excluded_reason')
    expect(report.missed[0].excluded_reason).toContain('已核对')
  })

  test('keeps status filter receipt sync open when used state evidence is not in prose', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选证据错位',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾当场说出完整旧案名单。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '林青禾认知边界',
    })
    expect(report.missed[0].text).toContain('无法定位')
  })

  test('falls back to state tracking contract when model status receipts are stale after revision', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选兜底修复',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'stale_character_state',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾当场说出完整旧案名单。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.fallback_generated).toBe(true)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'character_states_1',
      'world_constraints_1',
    ]))
  })

  test('warns when revision changes chapter length beyond oh-story scope guard', () => {
    const report = buildRevisionScopeGuardSyncReport(
      { id: 8, chapter_no: 8, title: '修订幅度复核' },
      {
        revised: true,
        original_text: '原'.repeat(4000),
        final_text: '改'.repeat(2400),
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('修订幅度过大')
    expect(report.original_word_count).toBe(4000)
    expect(report.revised_word_count).toBe(2400)
    expect(report.delta_word_count).toBe(1600)
    expect(report.allowed_delta_word_count).toBe(1200)
    expect(report.delta_ratio).toBeGreaterThan(0.3)
    expect(report.next_actions.join('；')).toContain('30%')
    expect(report.next_actions.join('；')).toContain('800 字')
    expect(report.next_actions.join('；')).toContain('不要重写整章')
  })

  test('keeps revision scope guard open when revised text lacks auditable word counts', () => {
    const report = buildRevisionScopeGuardSyncReport(
      { id: 8, chapter_no: 8, title: '修订幅度复核' },
      {
        revised: true,
        revision_scope_guard: {
          scope_warning: '',
          reason: '已局部修订。',
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订幅度无法确认')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'revision_scope_guard',
      label: '修订幅度缺少字数',
    })
    expect(report.missed[0].text).toContain('original_word_count')
    expect(report.missed[0].text).toContain('revised_word_count')
    expect(report.next_actions.join('；')).toContain('revision_scope_guard')
  })

  test('builds revision cascade impact sync from revision receipts that affect future chapters', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '把旧印章从林青禾持有改成执事收回。',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9, 10],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
                {
                  type: 'relationship',
                  target: '李玄与林青禾互信线',
                  impact: '有限作证仍成立，但不能写成无条件结盟。',
                  required_action: '保持有限作证边界。',
                },
              ],
            },
            {
              issue_index: 1,
              severity: 'S3',
              category: 'prose',
              applied_fix: '压缩解释句。',
              changed_evidence: '三句压成一句。',
              cascade_impacts: [],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订级联影响 2')
    expect(report.missed_count).toBe(2)
    expect(report.missed[0].target).toBe('旧印章归属')
    expect(report.missed[0].affected_chapters).toEqual([9, 10])
    expect(report.missed.map((item: any) => item.required_action).join('｜')).toContain('有限作证边界')
    expect(report.next_actions.join('；')).toContain('后续章节')
  })

  test('builds revision cascade impact sync from nested oh-story revision receipts', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                issue_index: 0,
                severity: 'S2',
                category: 'continuity',
                applied_fix: '把旧印章从林青禾持有改成执事收回。',
                changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                affected_chapters: [9, 10],
                cascade_impacts: [
                  {
                    type: 'foreshadowing',
                    target: '旧印章归属',
                    impact: '后续不能让林青禾直接持有旧印章。',
                    required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  },
                ],
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订级联影响 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].target).toBe('旧印章归属')
    expect(report.missed[0].affected_chapters).toEqual([9, 10])
    expect(report.missed[0].evidence).toContain('旧印章扣进袖中')
  })

  test('warns when revision cascade impacts lack changed evidence from the revised prose', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '',
              changed_evidence: '',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(1)
    expect(report.evidence_missing.map((item: any) => item.target)).toContain('旧印章归属')
    expect(report.next_actions.join('；')).toContain('changed_evidence')
  })

  test('warns when revision cascade impact evidence cannot be located in revised prose', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的旧印',
        chapter_text: '林青禾把账册推回桌边，只承认旧印章曾经被人调包。',
      },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '把旧印章从林青禾持有改成执事收回。',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(0)
    expect(report.evidence_unlocated_count).toBe(1)
    expect(report.evidence_unlocated[0].target).toBe('旧印章归属')
    expect(report.evidence_unlocated[0].evidence_location_risk).toContain('无法定位到修订后正文')
    expect(report.next_actions.join('；')).toContain('无法定位')
  })

  test('records missing required fields in revision cascade impacts', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  target: '旧印章归属',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.structure_missing_count).toBe(1)
    expect(report.structure_missing[0]).toMatchObject({
      target: '旧印章归属',
      missing_fields: ['type', 'impact', 'required_action'],
    })
    expect(report.missed[0].missing_fields).toEqual(['type', 'impact', 'required_action'])
    expect(report.next_actions.join('；')).toContain('type, target, impact, required_action, evidence/source_excerpt')
  })

  test('prose quality stores a revision_cascade_impact_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('buildRevisionCascadeImpactSyncReviewRecord({ projectId, chapter, sync: revisionCascadeImpactSync })')
    expect(reviewRecordSource).toContain("review_type: 'revision_cascade_impact_sync'")
    expect(source).toContain('buildRevisionCascadeImpactSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionCascadeImpactSync', 'revision_cascade_impact_sync']")
    expect(source).toContain('cascade_impacts 必须逐项写 type, target, impact, required_action, evidence 或 source_excerpt')
  })

  test('prose quality stores a revision_scope_guard_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('buildRevisionScopeGuardSyncReviewRecord({ projectId, chapter, selfCheck, sync: revisionScopeGuardSync })')
    expect(reviewRecordSource).toContain("review_type: 'revision_scope_guard_sync'")
    expect(source).toContain('buildRevisionScopeGuardSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionScopeGuardSync', 'revision_scope_guard_sync']")
    expect(source).toContain('revision_scope_guard')
  })

  test('prose quality stores a prose_revision_receipt_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'prose_revision_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildProseRevisionReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['proseRevisionReceiptSync', 'prose_revision_receipt_sync']")
  })

  test('prose quality stores a deslop_repair_receipt_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'deslop_repair_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildDeslopRepairReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['deslopRepairReceiptSync', 'deslop_repair_receipt_sync']")
    expect(source).toContain('buildSkippedPostDeliveryStoryStateUpdate({')
  })
})

