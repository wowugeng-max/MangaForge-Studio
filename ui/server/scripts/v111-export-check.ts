import { countHostileMicroBeatStamps } from '../src/novel-writing/human-webnovel-resistance.ts'
import { R76_ZHUQUE_STACK_VERSION } from '../src/novel-writing/r76-zhuque-stack.ts'
import { Database } from 'bun:sqlite'
const db = new Database('../../workspace/novel.sqlite')
const row = db.query('select chapter_text, title, chapter_no, updated_at from chapters where id=92').get() as any
const text = String(row?.chapter_text || '')
const stamps = countHostileMicroBeatStamps(text)
console.log(JSON.stringify({ version: R76_ZHUQUE_STACK_VERSION, len: text.length, stamps, title: row?.title, no: row?.chapter_no, updated: row?.updated_at }, null, 2))
