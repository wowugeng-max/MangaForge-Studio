import { describe, expect, test } from 'bun:test'
import {
  classifyProseAdmission,
  markBlockedInvalidError,
  validateMinimalChapterProse,
  type ProseAdmissionHardFailure,
  type ProseAdmissionWarning,
} from './prose-admission-policy'

describe('prose admission policy', () => {
  test('accepts prose when no curated evidence is supplied', () => {
    expect(classifyProseAdmission({})).toEqual({
      status: 'accepted',
      hard_failures: [],
      warnings: [],
    })
  })

  test('accepts with subjective, word-target, and story-state warnings', () => {
    const warnings: ProseAdmissionWarning[] = [
      { code: 'quality_below_preference', source: 'quality', message: 'Subjective quality score is below preference.' },
      { code: 'word_target_missed', source: 'word_target', message: 'Draft is shorter than the requested word target.' },
      { code: 'story_state_pending', source: 'story_state', message: 'Story state will be synchronized later.' },
    ]

    expect(classifyProseAdmission({ warnings })).toEqual({
      status: 'accepted_with_warnings',
      hard_failures: [],
      warnings,
    })
  })

  test('blocks a canonical continuity hard failure even when warnings also exist', () => {
    const failure: ProseAdmissionHardFailure = {
      code: 'canonical_fact_conflict',
      source: 'canonical_continuity',
      message: 'The protagonist cannot be alive in this scene.',
    }
    const warning: ProseAdmissionWarning = {
      code: 'review_unavailable',
      source: 'review',
      message: 'Optional review was unavailable.',
    }

    expect(classifyProseAdmission({ hard_failures: [failure], warnings: [warning] })).toEqual({
      status: 'blocked_invalid',
      hard_failures: [failure],
      warnings: [warning],
    })
  })

  test('deduplicates warnings by source, code, and message while preserving first-seen order', () => {
    const first: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'review',
      message: 'Tighten the opening.',
      details: { pass: 1 },
    }
    const duplicateWithDifferentDetails: ProseAdmissionWarning = {
      ...first,
      details: { pass: 2 },
    }
    const sameCodeDifferentMessage: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'review',
      message: 'Tighten the ending.',
    }
    const differentSource: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'memory',
      message: 'Tighten the opening.',
    }

    expect(classifyProseAdmission({
      warnings: [first, duplicateWithDifferentDetails, sameCodeDifferentMessage, differentSource, first],
    }).warnings).toEqual([first, sameCodeDifferentMessage, differentSource])
  })

  test('deduplicates hard failures consistently while preserving first-seen order', () => {
    const first: ProseAdmissionHardFailure = {
      code: 'unsafe_content',
      source: 'safety',
      message: 'Safety policy rejected the payload.',
      details: { attempt: 1 },
    }
    const duplicateWithDifferentDetails: ProseAdmissionHardFailure = {
      ...first,
      details: { attempt: 2 },
    }
    const second: ProseAdmissionHardFailure = {
      code: 'atomic_commit_failed',
      source: 'atomic',
      message: 'The chapter and state could not be committed atomically.',
    }

    expect(classifyProseAdmission({
      hard_failures: [first, duplicateWithDifferentDetails, second, first],
    }).hard_failures).toEqual([first, second])
  })
})

describe('minimal chapter prose validation', () => {
  test('rejects empty and whitespace-only inputs', () => {
    for (const input of ['', ' \n\t ', null, undefined]) {
      const result = validateMinimalChapterProse(input)
      expect(result.valid).toBe(false)
      expect(result.failures.map(item => item.code)).toContain('prose_empty')
      expect(result.failures.every(item => item.source === 'prose_shape')).toBe(true)
    }
  })

  test('rejects a short payload', () => {
    const result = validateMinimalChapterProse('雨停了。门开了！他回头？她没有回答。')

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_too_short')
  })

  test('rejects title-only and label-only payloads', () => {
    const title = validateMinimalChapterProse('第一章：雨夜归人')
    const label = validateMinimalChapterProse('小说正文：')

    expect(title.failures.map(item => item.code)).toContain('prose_title_only')
    expect(label.failures.map(item => item.code)).toContain('prose_label_only')
  })

  test('rejects explanation-only and error payloads even when they are long', () => {
    const explanation = validateMinimalChapterProse(
      '下面是根据你的要求生成的小说正文，内容将围绕雨夜重逢展开。'.repeat(12),
    )
    const error = validateMinimalChapterProse(
      '生成失败：模型调用超时，请稍后重试。'.repeat(18),
    )

    expect(explanation.failures.map(item => item.code)).toContain('prose_explanation_only')
    expect(error.failures.map(item => item.code)).toContain('prose_error_payload')
  })

  test('rejects a long refusal payload that otherwise meets the shape thresholds', () => {
    const result = validateMinimalChapterProse(
      '抱歉，我不能提供该内容，请稍后重试。'.repeat(20),
    )

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_error_payload')
  })

  test('accepts complete prose when a refusal-like phrase is only opening dialogue', () => {
    const quotedDialogue = [
      '“抱歉，我不能让你进去。”守卫把长枪横在门前，雨水沿着枪缨滴落，映出石阶上被踩乱的泥印。',
      '沈砚没有争辩，只从袖中取出那枚裂开的铜牌，让灯笼的微光照清背面新刻的一道暗纹。',
      '守卫看见暗纹时脸色骤变，握枪的手却没有松开，反而朝城楼阴影里飞快瞥了一眼！',
      '那一眼已经足够，沈砚顺着他的视线看见半扇未关的窗，以及窗后刚刚收回去的黑色衣角。',
      '他故意退下石阶，转身走进雨幕，等城门上的铜铃响过三次，才沿排水沟折回废弃的箭道？',
      '箭道尽头堆着尚带木屑的新箱，箱盖烙着父亲旧部的印记，也证明守卫拦住他并非为了城防。',
    ].join('')
    const unquotedDialogue = quotedDialogue.replace(/^“|”/, '')

    expect(validateMinimalChapterProse(quotedDialogue)).toEqual({ valid: true, failures: [] })
    expect(validateMinimalChapterProse(unquotedDialogue)).toEqual({ valid: true, failures: [] })
  })

  test('rejects JSON-like payloads', () => {
    const result = validateMinimalChapterProse(JSON.stringify({
      chapter_text: '雨落在长街上。门后没有人回答！旧钟敲了三次？他终于推门而入。'.repeat(8),
      status: 'ok',
    }))

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_json_payload')
  })

  test('accepts bracket-framed prose that is not valid JSON', () => {
    const prose = [
      '[系统提示]城门将在一刻钟后关闭，沈砚扫过告示，发现落款日期竟比今天早了整整十年。',
      '雨水浸透纸角，却没有冲淡那枚朱印，他伸手触碰时，指腹传来细微热意，像印泥刚刚干透！',
      '街边铺户陆续落闩，只有对面的旧书店仍亮着灯，一个戴斗笠的人隔着窗纸向他招了招手。',
      '沈砚推门进去，门轴没有发出声音，柜台上却整齐摆着父亲失踪前寄出的七封信，每封都写着明日的日期。',
      '“你终于看见告示了？”斗笠人没有抬头，只把第八封空白信纸推到他面前，示意他亲手写下收信人？',
      '窗外铜钟提前响起，整条街的灯火同时熄灭，沈砚握住笔，听见黑暗里有人低声念出了他的名字。[本章完]',
    ].join('')

    expect(validateMinimalChapterProse(prose)).toEqual({ valid: true, failures: [] })
  })

  test('accepts complete narrative that contains an inline valid JSON object', () => {
    const prose = [
      '沈砚在废弃值房里找到一块仍在发光的旧屏，屏幕中央只剩一行陌生记录：{"gate":"north","count":3}。',
      '他不懂这些符号的来历，却认得 north 旁边那道手绘箭头，正指向父亲当年负责守卫的北门！',
      '窗外巡夜人的脚步越来越近，他抄下记录，把屏幕塞回积灰的木柜，又用断锁伪装成多年无人开启的模样。',
      '脚步停在门外时，柜中忽然传来第二声蜂鸣，新的数字隔着木板映出来，恰好是他今夜走过的石阶数量？',
      '沈砚屏住呼吸，听见巡夜人低声报告北门一切正常，可那人的影子却从门缝下分成了完全相反的两个方向。',
      '等脚步远去，他重新拉开木柜，屏幕上的对象记录已经消失，只留下一句用父亲笔迹写成的警告。',
    ].join('')

    expect(validateMinimalChapterProse(prose)).toEqual({ valid: true, failures: [] })
  })

  test('rejects payload-level object and array JSON after an approved result prefix', () => {
    const objectPayload = `[结果] ${JSON.stringify({
      error: '生成失败。模型没有返回正文！请稍后重试？当前请求无法完成。'.repeat(8),
    })}`
    const arrayPayload = `[结果]\n${JSON.stringify([{
      chapter_text: '城门关闭了。守卫举起长枪！沈砚看见暗号？他转身走入雨中。'.repeat(10),
    }])}`

    expect(validateMinimalChapterProse(objectPayload).failures.map(item => item.code)).toContain('prose_json_payload')
    expect(validateMinimalChapterProse(arrayPayload).failures.map(item => item.code)).toContain('prose_json_payload')
  })

  test('rejects label-dominant metadata and polite assistant wrappers', () => {
    const metadata = [
      '标题：雨夜归人。',
      '角色：沈砚、守卫、斗笠人。',
      '地点：城南旧门与废弃箭道。',
      '时间：子夜到黎明。',
      '摘要：主角发现十年前的告示与未来日期的书信，并循着父亲旧部的印记进入暗道。',
      '场景：雨夜城门受阻、书店会面、铜钟提前响起。',
    ].join('\n').repeat(4)
    const wrapper = '好的，以下是根据你的要求生成的小说正文，请查收并告诉我是否需要继续修改。'.repeat(12)

    expect(validateMinimalChapterProse(metadata).failures.map(item => item.code)).toContain('prose_label_only')
    expect(validateMinimalChapterProse(wrapper).failures.map(item => item.code)).toContain('prose_explanation_only')
  })

  test('rejects valid JSON inside a polite preface and markdown fence', () => {
    const result = validateMinimalChapterProse([
      '好的，结构化结果如下：',
      '```json',
      JSON.stringify({
        title: '雨夜归人',
        characters: ['沈砚', '守卫'],
        chapter_text: '城门关闭了。守卫举起长枪！沈砚看见暗号？他转身走入雨中。'.repeat(10),
      }),
      '```',
    ].join('\n'))

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_json_payload')
  })

  test('does not reject metadata phrases or assistant-like wording embedded in real prose', () => {
    const prose = [
      '账册第一页依次写着标题、角色、地点和摘要，沈砚却知道这些整齐的栏目只是商会用来掩盖走私路线的暗号。',
      '“好的，以下是你要的全部记录。”掌柜故意提高声音，把薄册递来，目光却停在门外那双沾泥的官靴上！',
      '沈砚接过册子，随口问起昨夜的货船，指尖则沿着纸边摸到一道被针扎出的凹痕。',
      '凹痕连起来恰好是城北仓库的编号，而所谓地点一栏里多出的墨点，标出了巡夜人换岗后的空隙？',
      '他合上账册说要回去细看，掌柜却突然按住封皮，低声提醒他摘要末尾少写了一个已经死去十年的人名。',
      '门外官靴停在台阶上，沈砚把笑意压回喉间，翻到最后一页，看见父亲的名字正从潮湿墨迹里慢慢浮现。',
    ].join('')

    expect(validateMinimalChapterProse(prose)).toEqual({ valid: true, failures: [] })
  })

  test('rejects long prose with fewer than four sentence terminators', () => {
    const result = validateMinimalChapterProse('雨水沿着瓦檐落下他沿长街一路追到城门却始终没有看见那盏约定的灯'.repeat(8))

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_too_few_sentences')
  })

  test('accepts compact real Chinese prose without consulting quality or word targets', () => {
    const prose = [
      '雨从子夜下到黎明，青石巷被洗得发亮，沈砚踩过积水时没有放慢脚步，因为怀里的旧信正在一点点洇开墨迹。',
      '他赶到城南药铺，木门只留着一道缝，门槛内侧压着母亲惯用的银针，针尾却缠着陌生的红线！',
      '柜台后的药香早已散尽，地上横着半盏冷茶，墙上的影子随着灯芯摇晃，像有人刚从暗门里退了进去。',
      '沈砚没有出声，只把湿透的信塞进袖中，顺手扣住门边那枚生锈铜铃，铃舌竟带着尚未凝固的血？',
      '后院忽然传来瓦片碎裂的轻响，他越过柜台追出去，看见一道灰衣身影翻上墙头，而墙根留下了父亲失踪前佩过的木牌。',
      '他握紧木牌，终于明白这封迟到十年的信不是求救，而是有人故意把他引回这座从不肯遗忘旧债的城。',
    ].join('')
    expect(prose.replace(/\s+/g, '').length).toBeGreaterThanOrEqual(200)

    expect(validateMinimalChapterProse(prose)).toEqual({ valid: true, failures: [] })
  })
})

describe('blocked invalid error marking', () => {
  const failure: ProseAdmissionHardFailure = {
    code: 'invalid_prose_shape',
    source: 'prose_shape',
    message: 'Generated payload is not chapter prose.',
  }

  test('preserves an Error instance and attaches admission evidence', () => {
    const original = new Error('provider returned a title')
    const marked = markBlockedInvalidError(original, failure)

    expect(marked).toBe(original)
    expect(marked.message).toBe('provider returned a title')
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })

  test('creates a stable Error for non-Error input', () => {
    const marked = markBlockedInvalidError({ message: 'plain-object failure' }, failure)

    expect(marked).toBeInstanceOf(Error)
    expect(marked.message).toBe('plain-object failure')
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })

  test('falls back safely for a frozen Error and preserves its cause', () => {
    const cause = new Error('upstream transport failed')
    const original = Object.freeze(new Error('frozen error', { cause }))
    const marked = markBlockedInvalidError(original, failure)

    expect(marked).not.toBe(original)
    expect(marked.message).toBe('frozen error')
    expect(marked.cause).toBe(cause)
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })

  test('does not invoke a hostile message getter while recovering from a non-extensible Error', () => {
    const hostile = new Error('hidden')
    Object.defineProperty(hostile, 'message', {
      configurable: false,
      get() {
        throw new Error('hostile getter invoked')
      },
    })
    Object.preventExtensions(hostile)

    const marked = markBlockedInvalidError(hostile, failure)

    expect(marked).toBeInstanceOf(Error)
    expect(marked.message).toBe(failure.message)
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })
})

  test('blocks detector_resistance hard failures as blocked_invalid', () => {
    const failure: ProseAdmissionHardFailure = {
      code: 'hw_opening_probe_cascade',
      source: 'detector_resistance',
      message: '开篇连续多类验尸/确认动作叠层，模板感过强。',
    }
    const decision = classifyProseAdmission({ hard_failures: [failure] })
    expect(decision.status).toBe('blocked_invalid')
    expect(decision.hard_failures).toEqual([failure])
  })

