import { describe, expect, test } from 'bun:test'
import {
  buildDeepDraftReviewModel,
  buildSeedRecoveryDiagnosticsView,
  deepDraftReviewModelToSeed,
  repairDeepDraftReviewModelGaps,
  type DeepDraftReviewModel,
} from './deepDraftReviewModel'

describe('deepDraftReviewModel', () => {
  test('extracts creator-facing review sections from a rich project seed', () => {
    const seed = {
      title: '阵库长明',
      genre: '仙侠',
      logline: '废弃阵库守夜人靠修复残阵改写宗门秩序',
      synopsis: '主角被贬阵库，却发现废阵连接上古阵盟遗产。',
      worldbuilding: {
        world_summary: '宗门以阵法划分阶层，阵盟垄断阵图。',
        power_system: '残阵修复、阵纹拆解、阵灵契约。',
      },
      protagonist: {
        name: '许长明',
        identity: '废弃阵库守夜人',
        goal: '重建自己的阵道传承',
      },
      antagonist: {
        name: '沈无咎',
        identity: '阵堂首席',
        goal: '夺走阵库中的上古阵图',
      },
      characters: [
        { name: '林照雪', role_type: '同盟', goal: '夺回家族阵契' },
        { name: '乌先生', role_type: '导师', summary: '被封印的阵灵' },
      ],
      volume_outlines: [
        { title: '阵库求生', goal: '守住阵库并拿到第一批追随者' },
        { title: '阵堂夺权', goal: '挑战旧阵师体系' },
      ],
      chapter_outlines: [
        { chapter_no: 1, title: '夜守阵库', chapter_goal: '开局被夺供奉资格' },
        { chapter_no: 2, title: '残阵亮起', chapter_goal: '第一次修复残阵' },
      ],
      foreshadowing_plan: [
        { name: '黑色阵旗', payoff: '第80章揭示阵盟密令' },
      ],
      open_questions: ['阵盟为何封锁低阶阵图？'],
    }

    const model = buildDeepDraftReviewModel(seed)

    expect(model.basics.title).toBe('阵库长明')
    expect(model.basics.pitch).toBe('废弃阵库守夜人靠修复残阵改写宗门秩序')
    expect(model.world.summary).toContain('宗门以阵法划分阶层')
    expect(model.world.powerSystem).toContain('阵纹拆解')
    expect(model.characters.map(character => character.name)).toEqual(['许长明', '沈无咎', '林照雪', '乌先生'])
    expect(model.volumes[0]).toEqual({ title: '阵库求生', goal: '守住阵库并拿到第一批追随者' })
    expect(model.chapters[0]).toEqual({ chapterNo: 1, title: '夜守阵库', goal: '开局被夺供奉资格' })
    expect(model.continuity.foreshadowing).toContain('黑色阵旗')
    expect(model.continuity.openQuestions).toBe('阵盟为何封锁低阶阵图？')
  })

  test('falls back to raw payload when normalized seed only exposes basics', () => {
    const model = buildDeepDraftReviewModel({
      title: '超人的规则怪谈世界',
      genre: '都市',
      raw_payload: {
        logline: '一个莽夫和一个智者在规则怪谈副本里互相补位。',
        synopsis: '双主角穿越灰域，一个负责武力战斗和搞笑，一个负责破解规则与解开迷局。',
        worldbuilding: {
          world_summary: '灰域会把现实地点复制成原创规则怪谈副本。',
          power_system: '规则推演、异常身体适应、污染抗性。',
        },
        protagonist: {
          name: '林野',
          identity: '武力担当',
          goal: '保护队友并打穿怪谈副本',
        },
        antagonist: {
          name: '管理员七号',
          identity: '副本执行者',
          goal: '阻止玩家触及灰域源头',
        },
        volume_outlines: [
          { title: '午夜员工餐厅', summary: '建立双主角搭档模式' },
        ],
        chapter_outlines: [
          { chapter_no: 1, title: '午夜入职', summary: '双主角读到第一份规则' },
        ],
        foreshadowing_plan: [
          { description: '灰域直播间第一次标记主角队伍', payoff_at: '第一卷末' },
        ],
      },
    })

    expect(model.basics.pitch).toContain('莽夫和一个智者')
    expect(model.basics.synopsis).toContain('双主角穿越灰域')
    expect(model.world.summary).toContain('原创规则怪谈副本')
    expect(model.world.powerSystem).toContain('污染抗性')
    expect(model.characters.map(character => character.name)).toEqual(['林野', '管理员七号'])
    expect(model.volumes[0]).toEqual({ title: '午夜员工餐厅', goal: '建立双主角搭档模式' })
    expect(model.chapters[0]).toEqual({ chapterNo: 1, title: '午夜入职', goal: '双主角读到第一份规则' })
    expect(model.continuity.foreshadowing).toContain('灰域直播间第一次标记主角队伍')
  })

  test('does not create blank protagonist or antagonist rows from missing objects', () => {
    const model = buildDeepDraftReviewModel({
      title: '空白草稿',
      protagonist: {},
      antagonist: {},
    })

    expect(model.characters).toEqual([])
  })

  test('keeps real protagonist and antagonist names instead of showing recovery filler names', () => {
    const model = buildDeepDraftReviewModel({
      title: '剑烛大荒',
      protagonist: {
        name: '丁松言',
        identity: '现代地球穿越者，原为民俗学研究生',
        goal: '验证山海经异兽食性并破解大荒规则',
      },
      antagonist: {
        name: '楚天行（首席反派，后期揭示为多重身份）',
        identity: '大荒宗门首席',
        goal: '夺取山海经残篇',
      },
      characters: [
        { name: '怎么', role_type: '主角', goal: '破解剑烛大荒的核心规则' },
        { name: '阶段对手', role_type: '反派/竞争者', goal: '阻止主角取得第一阶段真相' },
      ],
      volume_outlines: [
        { title: '药铺异兽案', summary: '丁松言从边陲药铺识破蛾虫药性。' },
      ],
      chapter_outlines: [
        { chapter_no: 1, title: '蛾虫入药', summary: '丁松言发现药铺里的蛾虫与山海经记忆不一致。' },
      ],
    })

    expect(model.characters.map(character => character.name)).toContain('丁松言')
    expect(model.characters.map(character => character.name)).toContain('楚天行（首席反派，后期揭示为多重身份）')
    expect(model.characters.map(character => character.name)).not.toContain('怎么')
    expect(model.characters.map(character => character.name)).not.toContain('阶段对手')
    expect(model.volumes[0]).toEqual({ title: '药铺异兽案', goal: '丁松言从边陲药铺识破蛾虫药性。' })
    expect(model.chapters[0]).toEqual({ chapterNo: 1, title: '蛾虫入药', goal: '丁松言发现药铺里的蛾虫与山海经记忆不一致。' })
  })

  test('prefers raw model facts over local recovery outline templates', () => {
    const model = buildDeepDraftReviewModel({
      title: '剑烛大荒',
      protagonist: { name: '主角', goal: '在剑烛大荒里活下来' },
      antagonist: { role_type: '反派/竞争者', goal: '阻止主角取得第一阶段真相' },
      volume_outlines: [
        { title: '开篇承诺验证', summary: '用主角、核心规则和第一场高压事件验证读者承诺。' },
        { title: '第2阶段长线扩容', summary: '围绕剑烛大荒继续扩展地图、敌对压力。' },
      ],
      chapter_outlines: [
        { chapter_no: 1, title: '异象开端', summary: '主角接触剑烛大荒的第一条异常规则。' },
        { chapter_no: 2, title: '第2章压力升级', summary: '主角在已有线索基础上推进规则验证。' },
      ],
      raw_payload: {
        protagonist: {
          name: '丁松言',
          identity: '现代地球穿越者，原为民俗学研究生',
          goal: '验证异兽食性并破解大荒规则',
        },
        antagonist: {
          name: '楚天行（首席反派，后期揭示为多重身份）',
          identity: '大荒宗门首席',
          goal: '夺取山海经残篇',
        },
        volume_outlines: [
          { title: '边陲药铺与蛾虫秘传', summary: '丁松言在药铺发现山海经食性规则。' },
        ],
        chapter_outlines: [
          { chapter_no: 1, title: '蛾虫入药', summary: '丁松言发现蛾虫药性与记忆不一致。' },
        ],
      },
    })

    expect(model.characters.map(character => character.name)).toEqual([
      '丁松言',
      '楚天行（首席反派，后期揭示为多重身份）',
    ])
    expect(model.volumes[0]).toEqual({ title: '边陲药铺与蛾虫秘传', goal: '丁松言在药铺发现山海经食性规则。' })
    expect(model.chapters[0]).toEqual({ chapterNo: 1, title: '蛾虫入药', goal: '丁松言发现蛾虫药性与记忆不一致。' })
  })

  test('converts edited review fields back to a seed without losing raw structures', () => {
    const seed = {
      title: '阵库长明',
      custom_payload: { keep: true },
      worldbuilding: { world_summary: '旧世界观' },
      protagonist: { name: '许长明', identity: '守夜人' },
      volume_outlines: [{ title: '旧卷', goal: '旧目标', extra: '保留' }],
      chapter_outlines: [{ chapter_no: 1, title: '旧章', chapter_goal: '旧章目标', extra: '保留' }],
      foreshadowing_plan: [{ name: '旧伏笔' }],
    }
    const model: DeepDraftReviewModel = {
      ...buildDeepDraftReviewModel(seed),
      basics: {
        title: '阵库长明：残阵篇',
        genre: '仙侠',
        pitch: '守夜人用残阵升级打穿阵堂。',
        synopsis: '改成更清晰的商业简介。',
      },
      world: {
        summary: '新世界观摘要',
        powerSystem: '残阵升级体系',
      },
      characters: [
        { name: '许长明', role: '主角', goal: '重建阵道' },
        { name: '沈无咎', role: '反派', goal: '垄断阵图' },
      ],
      volumes: [{ title: '阵库求生', goal: '守住阵库' }],
      chapters: [{ chapterNo: 1, title: '夜守阵库', goal: '开局被夺资格' }],
      continuity: {
        foreshadowing: '黑色阵旗 -> 第80章回收',
        openQuestions: '阵盟为何封锁阵图？',
      },
    }

    const nextSeed = deepDraftReviewModelToSeed(seed, model)

    expect(nextSeed.title).toBe('阵库长明：残阵篇')
    expect(nextSeed.genre).toBe('仙侠')
    expect(nextSeed.logline).toBe('守夜人用残阵升级打穿阵堂。')
    expect(nextSeed.synopsis).toBe('改成更清晰的商业简介。')
    expect(nextSeed.custom_payload.keep).toBe(true)
    expect(nextSeed.worldbuilding.world_summary).toBe('新世界观摘要')
    expect(nextSeed.worldbuilding.power_system).toBe('残阵升级体系')
    expect(nextSeed.protagonist).toMatchObject({ name: '许长明', role_type: '主角', goal: '重建阵道' })
    expect(nextSeed.characters[0]).toMatchObject({ name: '许长明', role_type: '主角', goal: '重建阵道' })
    expect(nextSeed.volume_outlines[0]).toMatchObject({ title: '阵库求生', goal: '守住阵库', extra: '保留' })
    expect(nextSeed.chapter_outlines[0]).toMatchObject({ chapter_no: 1, title: '夜守阵库', chapter_goal: '开局被夺资格', extra: '保留' })
    expect(nextSeed.foreshadowing_plan).toEqual([{ name: '黑色阵旗 -> 第80章回收' }])
    expect(nextSeed.open_questions).toEqual(['阵盟为何封锁阵图？'])
  })

  test('repairs empty foreshadowing and confirmation questions into editable draft fields', () => {
    const seed = {
      title: '剑烛大荒',
      genre: '仙侠',
      synopsis: '丁松言在边陲药铺发现山海经异兽食性与此世规则不一致。',
      protagonist: { name: '丁松言', identity: '边陲药铺学徒', goal: '破解大荒规则' },
      antagonist: { name: '楚天行', identity: '宗门首席', goal: '夺取残篇' },
      worldbuilding: { world_summary: '大荒异兽食性、禁忌和残篇构成修炼规则。', power_system: '辨认异兽食性并承担禁忌代价。' },
      volume_outlines: [{ title: '药铺异兽案', summary: '识破蛾虫药性。' }],
      chapter_outlines: Array.from({ length: 30 }, (_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        summary: index === 0 ? '丁松言发现蛾虫药性异常。' : `第${index + 1}章推进规则压力。`,
      })),
      foreshadowing_plan: [],
      open_questions: [
        '请确认丁松言的最终欲望、道德底线和不可退让目标。',
        '请确认核心规则的代价、禁忌和长期扩容边界。',
        '请确认第一卷读者最期待的爽点回报是什么。',
      ],
    }

    const repaired = repairDeepDraftReviewModelGaps(buildDeepDraftReviewModel(seed), seed)
    const nextSeed = deepDraftReviewModelToSeed(seed, repaired)

    expect(repaired.continuity.foreshadowing.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(8)
    expect(repaired.continuity.foreshadowing).toContain('第1章')
    expect(repaired.continuity.foreshadowing).toContain('回收')
    expect(repaired.continuity.openQuestions).toContain('最终欲望')
    expect(repaired.continuity.openQuestions).not.toContain('请确认')
    expect(nextSeed.foreshadowing_plan.length).toBeGreaterThanOrEqual(8)
    expect(nextSeed.open_questions).toEqual([])
    expect(nextSeed.author_confirmations.length).toBeGreaterThanOrEqual(3)
  })

  test('summarizes thin seed recovery diagnostics for the deep draft review UI', () => {
    const view = buildSeedRecoveryDiagnosticsView({
      seed_diagnostics: {
        status: 'needs_author_review',
        retained_fragments: ['蛾虫，食之擅伏蜇藏', '丁松在大荒遗迹里按异兽食性修炼'],
        missing_fields: ['main_conflict', 'chapter_outlines'],
        generated_fields: ['worldbuilding', 'volume_outlines'],
        suggestion: '同一模型二次补种子仍偏薄。系统已保留有效材料并生成可编辑草稿。',
      },
    })

    expect(view.visible).toBe(true)
    expect(view.type).toBe('warning')
    expect(view.title).toContain('已保留薄返回中的有效材料')
    expect(view.retainedFragments).toContain('蛾虫，食之擅伏蜇藏')
    expect(view.missingFields).toEqual(['main_conflict', 'chapter_outlines'])
    expect(view.generatedFields).toEqual(['worldbuilding', 'volume_outlines'])
  })

  test('hides seed recovery diagnostics when the seed is already ready', () => {
    const view = buildSeedRecoveryDiagnosticsView({
      seed_diagnostics: { status: 'ready', retained_fragments: ['完整种子'] },
    })

    expect(view.visible).toBe(false)
  })
})
