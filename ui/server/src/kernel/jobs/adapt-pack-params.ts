import { WRITING_SKILL_PACK_ID_RE } from '../../novel-writing/writing-skills/installed-store'

export type AdaptPackParams = { skill_id: string }

export function parseAdaptPackParams(raw: unknown, subjectKey: unknown):
  | { ok: true; value: AdaptPackParams }
  | { ok: false; code: 'VERB_PARAMS_INVALID'; message: string } {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
  const skillId = String(obj?.skill_id || '').trim()
  const key = String(subjectKey || '').trim()
  if (!skillId || !WRITING_SKILL_PACK_ID_RE.test(skillId)) {
    return { ok: false, code: 'VERB_PARAMS_INVALID', message: 'skill_id 必须是合法写作 skill id' }
  }
  if (skillId !== key) {
    return { ok: false, code: 'VERB_PARAMS_INVALID', message: 'skill_id 必须与 subject_key 相同' }
  }
  return { ok: true, value: { skill_id: skillId } }
}
