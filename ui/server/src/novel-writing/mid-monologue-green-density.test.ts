import { describe, expect, test } from 'bun:test'
import {
  sanitizeMidMonologueGreenDensity,
  scanMidMonologueGreenDensityRisks,
  sanitizeDetectorHostileStock,
  capHostileMicroBeatStampDensity,
  countHostileMicroBeatStamps,
  MID_MONOLOGUE_GREEN_DENSITY_VERSION,
} from './human-webnovel-resistance'
import { applyR76PreStoreSanitize, R76_ZHUQUE_STACK_VERSION } from './r76-zhuque-stack'

function makeMidMonologueChapter(): string {
  const head = Array.from({ length: 12 }, (_, i) => `开篇动作${i + 1}，他先把门关上，走廊灯还亮着，他没急着往前。`).join('\n\n')
  const mid = Array.from({ length: 24 }, (_, i) => {
    if (i % 5 === 0) {
      return `他继续核对第${i + 1}处细节，把照片和纸条并排放着，想这是不是坐标，又想旧城那边到底出了什么事，越想越堵，但还是把线索往下排，把前后顺序再过一遍。`
    }
    return `他想着第${i + 1}个可能，把信息在脑子里过了一遍，没有停，也没有跟人说话，只是把线索压在手边继续往下想。`
  }).join('\n\n')
  const tail = Array.from({ length: 10 }, (_, i) => `收束动作${i + 1}，他往门口走，鞋底在地上擦了一下。`).join('\n\n')
  return [head, mid, tail].join('\n\n')
}

function maxMidRun(text: string): number {
  const paras = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
  const s = Math.floor(paras.length * 0.18)
  const e = Math.max(s + 2, Math.floor(paras.length * 0.96))
  let max = 0
  let run = 0
  for (let i = s; i <= Math.min(e, paras.length - 1); i += 1) {
    const p = paras[i]
    const isDlg = /^[“"「']/.test(p)
    const isGreen = /没再问|没吭声|认不出来|记录呢|还看|停了一|鞋底声|没抬头|先不写|没人应/.test(p)
    if (!isDlg && !isGreen) {
      run += 1
      if (run > max) max = run
    } else run = 0
  }
  return max
}

describe('mid monologue green density (ch1 R76 alignment)', () => {
  test('version + stack', () => {
    expect(MID_MONOLOGUE_GREEN_DENSITY_VERSION).toContain('mid-monologue-green-density-v3.2')
    expect(R76_ZHUQUE_STACK_VERSION).toBe('r76-stable-v1.12')
  })

  test('scan flags long mid monologue runs', () => {
    const text = makeMidMonologueChapter()
    const risks = scanMidMonologueGreenDensityRisks(text)
    expect(risks.some((r) => r.key === 'hw_mid_monologue_green_density')).toBe(true)
  })

  test('sanitize injects clustered green islands and splits long paras', () => {
    const text = makeMidMonologueChapter()
    const beforeRun = maxMidRun(text)
    const out = sanitizeMidMonologueGreenDensity(text, { maxInject: 16, clusterSize: 3, runThreshold: 2, maxPasses: 2 })
    expect(out.length).toBeGreaterThan(text.length - 50)
    expect(/没再问|没吭声|认不出来|记录呢|还看|停了一|没人应|先不写/.test(out)).toBe(true)
    expect(out.split(/\n\s*\n+/).length).toBeGreaterThan(text.split(/\n\s*\n+/).length)
    // geometry: monologue run should shrink
    expect(maxMidRun(out)).toBeLessThan(beforeRun)
  })

  test('second densify pass still changes already partially densified text', () => {
    const text = makeMidMonologueChapter()
    const once = sanitizeMidMonologueGreenDensity(text, { maxInject: 16, clusterSize: 3, runThreshold: 2, maxPasses: 2 })
    const twice = sanitizeMidMonologueGreenDensity(once, { maxInject: 16, clusterSize: 3, runThreshold: 2, maxPasses: 2 })
    // either more injects/splits or stable if already controlled
    expect(twice.length).toBeGreaterThan(1000)
    expect(maxMidRun(twice)).toBeLessThanOrEqual(Math.max(6, maxMidRun(once)))
  })

  test('detector stock + R76 prestore include mid densify path', () => {
    const text = makeMidMonologueChapter()
    const stock = sanitizeDetectorHostileStock(text)
    const r76 = applyR76PreStoreSanitize(text)
    expect(/没再问|没吭声|认不出来|记录呢|还看|纸边|停了一|没人应/.test(stock)).toBe(true)
    expect(r76.length).toBeGreaterThan(100)
  })
})

describe('hostile micro-beat stamp hard caps (v1.11)', () => {
  test('capHostileMicroBeatStampDensity enforces chapter caps', () => {
    const pause = Array.from({ length: 20 }, () => '他停了一拍。').join('\n\n')
    const unread = Array.from({ length: 10 }, () => '字迹认不出。').join('\n\n')
    const raw = [pause, unread, '他把纸塞回口袋。'].join('\n\n')
    const cleaned = capHostileMicroBeatStampDensity(raw)
    const counts = countHostileMicroBeatStamps(cleaned)
    expect(counts['他停了一拍']).toBeLessThanOrEqual(3)
    expect(counts['字迹认不出']).toBeLessThanOrEqual(2)
  })

  test('detector stock densify then cap does not leave stamp storms', () => {
    const text = makeMidMonologueChapter()
    const densified = sanitizeMidMonologueGreenDensity(text, { maxInject: 28, clusterSize: 4, runThreshold: 2, maxPasses: 2 })
    const capped = capHostileMicroBeatStampDensity(densified)
    const counts = countHostileMicroBeatStamps(capped)
    expect(counts['他停了一拍']).toBeLessThanOrEqual(3)
    expect(counts['他没吭声']).toBeLessThanOrEqual(3)
    expect(counts['鞋底声远了']).toBeLessThanOrEqual(3)
  })
})
