import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  buildChapterAttractionReviewReport,
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildInnovationSyncReport,
  buildMergedLayeredMemoryContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildSignatureSceneSyncReport,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  normalizeDeliveryRiskReceipts,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  uniqueDeliveryRiskReceipts,
} from '../novel-writing-service'
import { getStyleLock } from './novel-route-utils'
import {
  buildAssetIntakeReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'

const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')


const writingServicePackageCache = new Map<string, string>()
const writingServiceSourceCache: { value: string | null } = { value: null }

function packageSource(relativeDir: string) {
  const cached = writingServicePackageCache.get(relativeDir)
  if (cached != null) return cached
  const root = join(import.meta.dir, '..', relativeDir)
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(full)
      }
    }
  }
  walk(root)
  files.sort()
  const value = files.map((file) => readFileSync(file, 'utf8')).join('\n')
  writingServicePackageCache.set(relativeDir, value)
  return value
}

function writingServiceSource() {
  if (writingServiceSourceCache.value != null) return writingServiceSourceCache.value
  writingServiceSourceCache.value = [
    packageSource('novel-writing-service'),
    packageSource('novel-writing'),
  ].join('\n')
  return writingServiceSourceCache.value
}


function deliveryRiskCarryOverSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/post-delivery')
  return [
    'delivery-risk-carry-over.ts',
    'delivery-risk-carry-over-context.ts',
    'delivery-risk-carry-over-prose-quality.ts',
    'delivery-risk-carry-over-prose-quality-core.ts',
    'delivery-risk-carry-over-prose-quality-mid.ts',
    'delivery-risk-carry-over-prose-quality-extended.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-a.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-b.ts',
    'delivery-risk-carry-over-prose-quality-extended-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}

describe('innovation sync report', () => {
  test('marks innovation execution as delivered when the final prose contains the planned angle and scene hooks', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 21, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          innovation_brief: {
            chapter_angle: '超人硬闯被规则边界反噬。',
            execution_points: ['用饼干碎屑验证门槛清除规则'],
            differentiation_guardrails: ['不得写成普通开挂碾压'],
            ip_adaptation_hooks: ['玻璃门内外对峙'],
          },
        },
      },
      '李超想硬闯，脚尖刚越过门槛，空气就像一堵看不见的墙反噬回来。张智没有让他继续开挂碾压，而是掰下一点饼干碎屑弹出去，碎屑被门外黑暗清除，玻璃门内外形成对峙。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('创新 OK')
    expect(report.missed_count).toBe(0)
    expect(report.score).toBeGreaterThanOrEqual(78)
  })

  test('warns when innovation brief is not executed and the chapter reads like a routine scene', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 22, chapter_no: 3, title: '普通套路测试' },
      {
        chapter_target: {
          innovation_brief: {
            chapter_angle: '超人力量每次硬碰规则都会暴露新的代价。',
            execution_points: ['用规则漏洞反制门外诱饵'],
            differentiation_guardrails: ['不得写成普通校园逃生'],
            ip_adaptation_hooks: ['门内外影子贴着玻璃分界线移动'],
          },
        },
      },
      '三人在宿舍里讨论学校很危险，决定暂时不要出去。林晓解释自己见过很多怪事，张智点头记录，李超说以后再想办法。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('创新缺口 4')
    expect(report.missed_count).toBe(4)
    expect(report.next_actions[0]).toContain('创新执行')
  })

  test('reads raw camelCase innovation brief after delivery', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 23,
        chapter_no: 6,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            innovationBrief: {
              chapterAngle: '广播录音会提前播放主角未来三分钟的回答。',
              executionPoints: ['用倒放录音反推门锁暗号'],
              differentiationGuardrails: ['不得写成普通密室解谜'],
              ipAdaptationHooks: ['旧广播室磁带倒转，未来回答先于提问出现'],
            },
          },
        },
      },
      {},
      '旧广播室里，广播录音会提前播放主角未来三分钟的回答。张智用倒放录音反推门锁暗号，李超没有把它写成普通密室解谜，而是看见旧广播室磁带倒转，未来回答先于提问出现。',
    )

    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['创新角度', '执行点', '差异护栏', 'IP化场面']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists an innovation_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync'")
    expect(source).toContain('buildInnovationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.innovation_sync = innovationSync')
  })
})
describe('signature scene sync report', () => {
  test('marks planned signature scene repair as delivered when final prose lands the memorable scene and payoff', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 24, chapter_no: 4, title: '门槛反噬' },
      {
        chapter_target: {
          signature_scene_brief: {
            signature_scene: '玻璃门内外，黑影贴着判定边界移动，李超用门框当盾牌硬顶规则反噬。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '读者看到超人蛮力第一次被规则反噬后，张智用实验反杀诱饵。',
            storyline_service: '推进午夜校园规则源头主线。',
          },
        },
      },
      '玻璃门内外的黑影贴着判定边界移动，李超扯下门框当盾牌硬顶规则反噬，肩膀被震得发麻。张智没有让他硬莽，而是用实验确认诱饵的清除范围，反手让门外黑影吞掉伪装广播，午夜校园规则源头的线索第一次露出。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('强场面 OK')
    expect(report.missed_count).toBe(0)
    expect(report.score).toBeGreaterThanOrEqual(78)
  })

  test('warns when planned signature scene repair is absent from final prose', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 25, chapter_no: 5, title: '空章测试' },
      {
        chapter_target: {
          signature_scene_brief: {
            signature_scene: '审判场中央，主角把带血腰牌拍在长案上，满堂旧臣同时失声。',
            scene_repair_target: '补位强场面空窗。',
            reader_payoff: '完成一次公开反杀和身份压迫。',
            storyline_service: '推进王府夺权主线。',
          },
        },
      },
      '主角回到房间整理线索，和同伴讨论明天再去审判场。他没有公开行动，也没有带血腰牌造成压迫。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('强场面漏写 4')
    expect(report.missed_count).toBe(4)
    expect(report.next_actions[0]).toContain('标志性场面')
  })

  test('reads raw camelCase signature scene brief after delivery', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 26,
        chapter_no: 6,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            signatureSceneBrief: {
              signatureScene: '旧广播室磁带倒转，李超未来三分钟后的回答先于提问响起。',
              sceneRepairTarget: '补位旧广播室的记忆点强场面。',
              readerPayoff: '读者看到规则不只限制蛮力，还能倒置因果。',
              storylineService: '推进广播源头主线。',
            },
          },
        },
      },
      {},
      '旧广播室磁带倒转，李超未来三分钟后的回答先于提问响起。这个强场面补位了旧广播室的记忆点，读者第一次看到规则不只限制蛮力，还能倒置因果，也推进广播源头主线。',
    )

    expect(report.label).not.toBe('强场面未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['标志性场面', '补位目标', '读者回报', '剧情线服务']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a signature_scene_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'signature_scene_sync'")
    expect(source).toContain('buildSignatureSceneSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.signature_scene_sync = signatureSceneSync')
  })
})
describe('volume beat sync report', () => {
  test('marks planned volume climax beats as delivered when final prose lands the turn and payoff', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '大益武夫' },
      { id: 31, chapter_no: 18, title: '警钟入城' },
      {
        chapter_target: {
          next_batch_brief: {
            current_chapter_role: '完成当前卷中高潮：警钟入城，谢怀安当众夺回王府主动权。',
          },
          scene_cards: [
            {
              scene_no: 2,
              turning_point: '警钟第三响，带血腰牌递入王府。',
              reader_payoff: '谢怀安借警钟第一次压住王府新贵。',
            },
          ],
        },
      },
      '警钟第三响时，带血腰牌被递入王府。谢怀安借警钟第一次压住王府新贵，当众夺回主动权，这场中高潮让满堂人心变色。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('爆点 OK')
    expect(report.missed_count).toBe(0)
    expect(report.delivered.map((item: any) => item.key)).toContain('current_chapter_role')
  })

  test('warns when planned climax beats are not visible in final prose', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '大益武夫' },
      { id: 32, chapter_no: 24, title: '卷中断点' },
      {
        chapter_target: {
          next_batch_brief: {
            current_chapter_role: '完成当前卷中高潮：边军腰牌真相反转，主角夺回主动权。',
          },
          scene_cards: [
            {
              scene_no: 3,
              turning_point: '带血腰牌证明边军危机是真的。',
              reader_payoff: '主角反压王府管事。',
            },
          ],
        },
      },
      '众人在厅中闲谈许久，王府管事安排茶水，主角暂时没有行动，边军危机也没有被提起。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('爆点漏兑现 3')
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.key)).toEqual(expect.arrayContaining(['current_chapter_role', 'turning_point_1', 'reader_payoff_1']))
    expect(report.next_actions[0]).toContain('卷级爆点')
  })

  test('reads raw camelCase volume beat brief after delivery', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 33,
        chapter_no: 30,
        title: '广播源头',
        raw_payload: {
          preDraftBrief: {
            volumeBeatBrief: {
              currentChapterRole: '完成当前卷中高潮：倒放录音揭出广播源头，李超夺回主动权。',
              volumeGoal: '把广播源头主线推进到旧广播室管理员。',
              climaxPromise: '倒放录音揭出广播源头。',
              requiredBeats: ['李超当众夺回主动权'],
            },
            sceneBriefs: [
              {
                turningPoint: '磁带倒转后未来回答先于提问出现。',
                readerPayoff: '李超夺回主动权。',
                endingHook: '旧广播室管理员名字出现在下一盘磁带上。',
              },
            ],
          },
        },
      },
      {},
      '倒放录音揭出广播源头，线索指向旧广播室管理员。磁带倒转后未来回答先于提问出现，李超当众夺回主动权，把广播源头主线推进到旧广播室管理员。最后，旧广播室管理员名字出现在下一盘磁带上。',
    )

    expect(report.label).not.toBe('爆点未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章爆点职责', '卷级目标', '高潮承诺', '爆点动作', '转折点', '读者回报', '钩子推进']))
    expect(report.status).toBe('ok')
  })

  test('reads runtime camelCase chapterTarget volume beat brief after delivery', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 35, chapter_no: 35, title: '广播源头' },
      {
        chapterTarget: {
          volumeBeatBrief: {
            currentChapterRole: '完成当前卷中高潮：倒放录音揭出广播源头，李超夺回主动权。',
            volumeGoal: '把广播源头主线推进到旧广播室管理员。',
            climaxPromise: '倒放录音揭出广播源头。',
            requiredBeats: ['李超当众夺回主动权'],
          },
          sceneCards: [
            {
              turningPoint: '磁带倒转后未来回答先于提问出现。',
              readerPayoff: '李超夺回主动权。',
              endingHookSeed: '旧广播室管理员名字出现在下一盘磁带上。',
            },
          ],
        },
      },
      '倒放录音揭出广播源头，线索指向旧广播室管理员。磁带倒转后未来回答先于提问出现，李超当众夺回主动权，把广播源头主线推进到旧广播室管理员。最后，旧广播室管理员名字出现在下一盘磁带上。',
    )

    expect(report.label).not.toBe('爆点未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章爆点职责', '卷级目标', '高潮承诺', '爆点动作', '转折点', '读者回报', '钩子推进']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a volume_beat_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync'")
    expect(source).toContain('buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.volume_beat_sync = volumeBeatSync')
  })
})
describe('million word runway sync report', () => {
  test('marks runway obligations as delivered when final prose answers the course', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 2, chapter_no: 2 },
      {
        million_word_runway: {
          fourQuestions: [
            { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用' },
            { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因' },
            { key: 'mainline_move', label: '主线推进了什么', answer: '双主角确认规则并非不可破解' },
            { key: 'freshness', label: '这一章的新意在哪', answer: '超人力量先被规则压制再反制' },
          ],
          redLines: ['超人力量不能无代价碾压规则'],
          readerFuel: ['规则反制爽点', '门外学生章末钩子'],
        },
      },
      '李超第一次证明规则边界能被利用。门外学生说出李超的死因，双主角确认规则并非不可破解。超人力量先被规则压制再反制，形成规则反制爽点。结尾处，门外学生章末钩子再次敲响。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('航线 OK')
    expect(report.risk_count).toBe(0)
    expect(report.four_question_missed).toHaveLength(0)
    expect(report.reader_fuel_missed).toHaveLength(0)
    expect(report.redline_touched).toHaveLength(0)
  })

  test('warns when final prose misses runway questions or touches red lines', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 2, chapter_no: 2 },
      {
        chapter_target: {
          million_word_runway: {
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因' },
            ],
            redLines: ['提前揭露规则之源'],
            readerFuel: ['规则反制爽点'],
          },
        },
      },
      '李超站在大厅里闲聊，突然提前揭露规则之源，然后章节结束。',
    )

    expect(report.status).toBe('warn')
    expect(report.risk_count).toBeGreaterThanOrEqual(3)
    expect(report.four_question_missed.map((item: any) => item.label)).toContain('这章为什么必须写')
    expect(report.reader_fuel_missed.map((item: any) => item.text)).toContain('规则反制爽点')
    expect(report.redline_touched.map((item: any) => item.text)).toContain('提前揭露规则之源')
  })

  test('reads raw camelCase million word runway after delivery', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 34,
        chapter_no: 34,
        raw_payload: {
          preDraftBrief: {
            millionWordRunway: {
              fourQuestions: [
                { key: 'why_now', label: '这章为什么必须写', answer: '第一次确认旧广播室管理员参与广播源头' },
                { key: 'page_turn', label: '读者为什么翻页', answer: '下一盘磁带写着李超的名字' },
              ],
              readerFuel: ['倒放录音反制爽点'],
              redLines: ['提前揭露最终规则之源'],
            },
          },
        },
      },
      {},
      '本章第一次确认旧广播室管理员参与广播源头。李超完成倒放录音反制爽点，最后，下一盘磁带写着李超的名字。',
    )

    expect(report.four_questions.map((item: any) => item.label)).toEqual(expect.arrayContaining(['这章为什么必须写', '读者为什么翻页']))
    expect(report.reader_fuel.map((item: any) => item.text)).toContain('倒放录音反制爽点')
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a runway_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'runway_sync'")
    expect(source).toContain('buildRunwaySyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.runway_sync = runwaySync')
  })
})
describe('discovered asset intake', () => {
  test('normalizes discovered assets to core types and filters existing names', () => {
    const assets = normalizeDiscoveredAssets(
      [
        { entity_type: 'character', name: '林晓', summary: '已存在角色', evidence: '林晓递出背包。' },
        { type: 'character', name: '周远', summary: '新来的宿舍管理员', evidence: '周远站在门口。', suggested_state: { location: '宿舍楼' } },
        { entity_type: 'item', name: '黑色钥匙', summary: '能打开禁闭室', evidence: '黑色钥匙落在掌心。', constraints_json: { owner_rule: '不得离身' } },
        { entity_type: 'realm', name: '新人试炼者', summary: '不在第一版范围' },
        { entity_type: 'ability', name: '', summary: '缺名称' },
      ],
      {
        existingCharacters: [{ name: '林晓' }],
        existingSettings: [{ entity_type: 'item', name: '旧钥匙' }],
        chapter: { id: 101, chapter_no: 1 },
      },
    )

    expect(assets.map((item: any) => item.entity_type)).toEqual(['character', 'item'])
    expect(assets.map((item: any) => item.name)).toEqual(['周远', '黑色钥匙'])
    expect(assets[0].first_chapter_no).toBe(1)
    expect(assets[0].state_json).toMatchObject({ location: '宿舍楼', first_seen_chapter: 1 })
    expect(assets[1].constraints_json).toMatchObject({ owner_rule: '不得离身' })
    expect(assets[1].payload_json.source).toBe('story_state_discovered_asset')
  })

  test('story state prompt asks for discovered assets and creates asset intake review', () => {
    const source = writingServiceSource()

    expect(source).toContain('discovered_assets')
    expect(source).toContain('normalizeDiscoveredAssets(')
    expect(source).toContain('buildAssetIntakeReviewRecord({ projectId: project.id, chapter, discoveredAssets })')
    expect(source).toContain('asset_intake')
  })
})
describe('ip scene intake', () => {
  test('normalizes chapter IP scene candidates for post-delivery review', () => {
    const candidates = normalizeIpSceneCandidates(
      [
        {
          title: '玻璃门内外对峙',
          summary: '门外湿漉漉学生敲门，门内三人被规则边界困住。',
          visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
          adaptation_value: '适合短剧第一集结尾和漫剧分镜。',
          spread_point: '救不救门外学生的评论区争议。',
          evidence: '湿漉漉的校服男生站在玻璃门外。',
          source_excerpt: '玻璃门外的黑暗贴着门槛蠕动。',
          tags: ['短剧钩子', '规则怪谈强画面'],
        },
        { title: '玻璃门内外对峙', summary: '重复候选' },
        { title: '', summary: '缺标题' },
      ],
      { id: 101, chapter_no: 2 },
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0].title).toBe('玻璃门内外对峙')
    expect(candidates[0].chapter_no).toBe(2)
    expect(candidates[0].chapter_id).toBe(101)
    expect(candidates[0].visual_hook).toContain('判定边界')
    expect(candidates[0].adaptation_value).toContain('短剧')
    expect(candidates[0].tags).toContain('规则怪谈强画面')
  })

  test('story state prompt asks for ip scene candidates and creates ip scene intake review', () => {
    const source = writingServiceSource()

    expect(source).toContain('ip_scene_candidates')
    expect(source).toContain('normalizeIpSceneCandidates(')
    expect(source).toContain('buildIpSceneIntakeReviewRecord({ projectId: project.id, chapter, ipSceneCandidates })')
    expect(source).toContain('payload.ip_scene_intake')
  })
})
describe('commercial web novel style defaults', () => {
  test('fills writing bible style lock with current commercial web novel defaults', () => {
    const styleLock = getStyleLock({ length_target: 'epic', style_tags: [] })

    expect(styleLock.narrative_person).toContain('第三人称有限视角')
    expect(styleLock.sentence_length).toContain('短中句')
    expect(styleLock.dialogue_ratio).toContain('35%-45%')
    expect(styleLock.payoff_density).toContain('800-1200字')
    expect(styleLock.chapter_word_range).toContain('3200-5200字')
    expect(styleLock.preferred_words).toContain('爽点回收')
  })

  test('preserves explicit project style lock over defaults', () => {
    const styleLock = getStyleLock({
      reference_config: {
        style_lock: {
          narrative_person: '第一人称主视角',
          preferred_words: ['自定义口头禅'],
        },
      },
    })

    expect(styleLock.narrative_person).toBe('第一人称主视角')
    expect(styleLock.preferred_words).toEqual(['自定义口头禅'])
    expect(styleLock.sentence_length).toContain('短中句')
  })
})
