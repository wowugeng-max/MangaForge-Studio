import { describe, expect, test } from 'bun:test'

import {
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanParagraphWallTextRisks,
  scanWebNovelParagraphShapeRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanRecapFillerRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanVagueQuantityWeightRisks,
} from './prose-craft-scans'

describe('prose craft deterministic scans', () => {
  test('allows complete one-sentence web-novel lines and only flags poem-like fragments', () => {
    const ok = scanParagraphFragmentationRisks([
      '第4章 旧楼走廊',
      '门开了。',
      '风进来。',
      '灯灭了。',
      '李辰停住。',
      '没人说话。',
      '水迹停在脚边。',
      '"别动。"',
    ].join('\n'))
    expect(ok).toEqual([])

    const checks = scanParagraphFragmentationRisks([
      '第4章 旧楼走廊',
      '冷风',
      '黑影',
      '脚步',
      '水迹',
      '锈锁',
      '旧门',
    ].join('\n'))
    expect(checks[0]?.key).toBe('paragraph_over_fragmented_short_lines')
  })

  test('flags multi-sentence paragraphs that break mobile web-novel line rhythm', () => {
    const checks = scanWebNovelParagraphShapeRisks([
      '第4章 旧楼走廊',
      '李辰停在门边，看见水迹贴着门缝往里渗。张智抬手按住门锁，指节被冷气冻得发白。走廊那头没有脚步声，只有广播滋滋作响。他忽然想起昨夜那张名单。',
      '门后传来一声轻响。',
    ].join('\n'))
    expect(checks.some(item => String(item.key).includes('web_novel'))).toBe(true)
  })

  test('detects uniform paragraph lengths', () => {
    const checks = scanParagraphLengthUniformityRisks([
      '第4章 旧楼走廊',
      '李辰停在门边，看见水迹贴着门缝往里渗。',
      '张智抬手按住门锁，指节被冷气冻得发白。',
      '走廊那头没有脚步声，只有广播滋滋作响。',
      '门外学生把校牌举高，名字被水泡得发胀。',
      '宿舍里的人都屏住呼吸，没人敢先开口。',
      '墙上的钟停在十二点，秒针却还在轻轻颤。',
      '李辰把那张旧照片翻过来，看见背面多了字。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('paragraph_length_uniformity')
  })

  test('detects comma-chain paragraphs', () => {
    const checks = scanParagraphCommaChainDensityRisks([
      '第4章 雨夜',
      '',
      '他看着窗外的雨，心中涌起一股说不清的感觉，这些年走过的路和很多已经忘记的事都在这一刻涌上心头。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('paragraph_comma_chain_density_line_3')
  })

  test('detects a wall-text paragraph while keeping evidence bounded', () => {
    const checks = scanParagraphWallTextRisks([
      '第4章 地下通道',
      '',
      '沈砚停在门边，看见铁链贴着积水滑向老陈脚边。'.repeat(24),
    ].join('\n'))

    expect(checks[0]?.key).toBe('paragraph_wall_text_line_3')
    expect(checks[0]?.evidence.length).toBeLessThanOrEqual(260)
  })

  test('does not flag already segmented web-fiction paragraphs as wall text', () => {
    const checks = scanParagraphWallTextRisks([
      '第4章 地下通道',
      '',
      '沈砚停在门边，看见铁链贴着积水滑向老陈脚边。'.repeat(4),
      '',
      '老陈抬起发抖的手，指向通道尽头那盏忽明忽暗的灯。'.repeat(4),
      '',
      '灯影一晃，水里的锁链突然绷直。'.repeat(4),
    ].join('\n'))

    expect(checks).toEqual([])
  })

  test('detects repeated still beats', () => {
    const checks = scanProseMotionStillRisks([
      '第13章 旧账',
      '',
      '李辰坐在门边，把钥匙擦了一遍，指腹停在缺口上。',
      '',
      '张智低头理平袖口，目光落在名单最后一行。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('motion_still_consecutive_still')
  })

  test('detects stacked description', () => {
    const checks = scanProseStackedDescriptionRisks([
      '第13章 签字',
      '',
      '林父低着头，左手把文书压住，右手拿笔，往纸上落。',
      '',
      '手在抖。',
      '',
      '手从肘到腕都在抖，笔尖在纸上停了停，写了一横，又停，那个林字的撇写歪了。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('prose_stacked_description')
  })

  test('does not treat action, physical feedback, and a new threat as stacked repetition', () => {
    const checks = scanProseStackedDescriptionRisks([
      '第13章 铁门',
      '',
      '沈砚抬手推开铁门，手腕擦过门框的锈钉。',
      '',
      '手腕一顿。',
      '',
      '手腕刚退半寸，门后铁链突然绷直，贴着他的指尖抽向老陈。',
    ].join('\n'))

    expect(checks).toEqual([])
  })

  test('detects static environment without character interaction', () => {
    const checks = scanProseStaticEnvironmentRisks([
      '第13章 雨夜',
      '',
      '窗外的雨越下越密，青石板被水光铺成一片，街角的灯笼在风里轻轻晃，昏黄的光落在湿漉漉的墙面上。',
      '',
      '檐下的积水顺着瓦缝滴落，空气里浮着潮冷的味道，远处偶尔传来一声闷雷，整条街都显得空旷而沉默。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('prose_static_environment')
  })

  test('detects decorative concrete details without story function', () => {
    const checks = scanProseDecorativeDetailRisks([
      '第13章 账本',
      '',
      '桌上摊着一本旧账本，第一页写着八万块，旁边放着一把旧钥匙。银色戒指压在账角，内圈刻着三年两个小字，下面还有一张800元收据，纸边已经泛黄。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('prose_decorative_detail')
  })

  test('does not flag short atmosphere or functional props as decorative filler', () => {
    const shortAtmosphere = scanProseStaticEnvironmentRisks('雨敲在铁门上。沈砚听见锁链跟着响了一声。')
    const functionalProps = scanProseDecorativeDetailRisks(
      '沈砚把八万元收据塞给老陈，又用旧钥匙打开账本夹层；银色戒指滚出来，内圈三年的刻字证明失踪者来过这里。',
    )

    expect(shortAtmosphere).toEqual([])
    expect(functionalProps).toEqual([])
  })

  test('does not flag props whose story function becomes clear in the next paragraph', () => {
    const checks = scanProseDecorativeDetailRisks([
      '桌上摊着一本旧账本，第一页写着八万块，旁边放着一把旧钥匙。银色戒指压在账角，内圈刻着三年两个小字，下面还有一张800元收据。',
      '',
      '沈砚认出戒指属于失踪者，收据日期则证明他三年前来过这里。',
    ].join('\n'))

    expect(checks).toEqual([])
  })

  test('detects vague quantity weight', () => {
    const checks = scanVagueQuantityWeightRisks([
      '沈栀看着账单，想起姐姐为了她欠了很多钱，也等了很久。',
      '',
      '姐夫转来的钱不多，她却把那条消息翻了无数次。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('prose_vague_quantity_weight_1_2')
  })

  test('detects unsafe specific character-count expressions', () => {
    const checks = scanSpecificCharacterCountExpressionRisks([
      '第8章 旧印',
      '',
      '林青禾只说：“门后有人。”这五个字一落，审判席全静了。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('specific_character_count_expression_1_1')
  })

  test('detects abstract paragraphs without camera anchor', () => {
    const checks = scanProseCameraAnchorRisks([
      '第13章 真相',
      '',
      '所谓真相从来不是答案，而是一场迟来的审判。每个人都在命运和欲望之间摇摆，所有选择最终都会指向无法回头的结局。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('prose_no_camera_anchor')
  })

  test('detects omniscient crowd camera lines', () => {
    const checks = scanProseOmniscientCrowdCameraRisks([
      '第14章 问罪',
      '',
      '整个审判厅陷入死寂。',
      '江辰听见自己指节压住纸页的声音。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('omniscient_crowd_camera_line_3')
  })

  test('detects infodump paragraphs', () => {
    const checks = scanInfodumpRisks([
      '第5章 规则课',
      '',
      '规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层则会根据违规次数触发不同惩罚。这个机制的原理来自旧校区留下的契约，因此所有进入教学楼的人都会被自动纳入名单。所谓名单并不是普通纸页，而是一种绑定灵魂的设定，通常只有管理员才能修改。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('infodump_paragraph_1')
  })

  test('detects recap filler paragraphs', () => {
    const checks = scanRecapFillerRisks([
      '第6章 旧名单',
      '',
      '李辰想起之前在旧教学楼里发生的一切。那时候广播第一次响起，名单第一次变红，门牌也曾经自己翻转。过去那些细节在脑海里一遍遍浮现，当初每个人的表情都很紧张，昨晚那阵风和那张旧纸也让他记了很久。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('recap_filler_paragraph_1')
  })

  test('detects emotion telling without body anchors', () => {
    const checks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '李辰感到一阵恐惧，他心里很慌，也不知道该怎么面对眼前的广播。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('emotion_telling_line_3')
  })

  test('detects emotional stasis without progress', () => {
    const checks = scanEmotionalStasisRisks([
      '第12章 红灯之后',
      '',
      '李辰心里一阵恐惧，广播里的清除两个字像冷水灌进后背。他感到害怕，连指尖都像被冻住。',
      '',
      '他仍然害怕，胸口的恐惧一层层压下来，脑子里只剩下如果失败就完了这个念头。',
      '',
      '恐惧继续蔓延，他感到无比不安，所有声音都像隔着水面传来。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('emotional_stasis_fear_1_3')
  })

  test('detects internal monologue runs and parenthetical labels', () => {
    const runChecks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰突然明白，管理员从一开始就在试探他。',
      '他意识到那张名单不是警告，而是筛选。',
      '他心里想，如果自己刚才开门，张智一定会被拖进走廊。',
    ].join('\n'))
    const parentheticalChecks = scanInternalMonologueRisks('（他心想：管理员果然一直在试探我。）')

    expect(runChecks[0]?.key).toBe('internal_monologue_run_3_5')
    expect(parentheticalChecks[0]?.key).toBe('parenthetical_internal_monologue_line_1')
  })
})
