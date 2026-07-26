import { applyR76PreStoreSanitize, R76_ZHUQUE_STACK_VERSION } from '../src/novel-writing/r76-zhuque-stack.ts'
import { capHostileMicroBeatStampDensity, countHostileMicroBeatStamps } from '../src/novel-writing/human-webnovel-resistance.ts'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const rawPath = resolve('../../workspace/zhuque-inputs/READY-ch2-llm-r76v1.10-skiphum-light-densify-zhuque.txt')
const raw = readFileSync(rawPath, 'utf8')
const before = countHostileMicroBeatStamps(raw)
const capped = capHostileMicroBeatStampDensity(raw)
const afterCap = countHostileMicroBeatStamps(capped)
const prestored = applyR76PreStoreSanitize(raw)
const afterPre = countHostileMicroBeatStamps(prestored)
console.log(JSON.stringify({ version: R76_ZHUQUE_STACK_VERSION, before, afterCap, afterPre, beforeLen: raw.length, capLen: capped.length, preLen: prestored.length }, null, 2))
writeFileSync(resolve('../../workspace/zhuque-inputs/READY-ch2-r76v1.11-stamp-cap-only-on-v110-zhuque.txt'), prestored)
writeFileSync(resolve('../../workspace/zhuque-inputs/READY-ch2-r76v1.11-stamp-cap-only-on-v110-zhuque.meta.json'), JSON.stringify({
  name: 'READY-ch2-r76v1.11-stamp-cap-only-on-v110-zhuque',
  note: 'Local B-only: apply R76 prestores+stamp-cap on v1.10 LLM text; no new draft. For diagnostic compare, not full A+B.',
  version: R76_ZHUQUE_STACK_VERSION,
  before,
  afterPre,
  chars: prestored.length,
}, null, 2))
