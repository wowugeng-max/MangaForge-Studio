import { describe, expect, test } from 'bun:test'
import {
  buildDeepDraftReviewModel,
  deepDraftReviewModelToSeed,
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
})
