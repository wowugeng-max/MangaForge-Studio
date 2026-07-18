import { describe, expect, test } from 'bun:test'
import {
  mergeEstablishedEvents,
  normalizeEstablishedEvent,
  projectCanonFactsFromEvents,
  scanEstablishedEventConflicts,
  selectEstablishedEventsForChapter,
} from './established-event-canon'

describe('established-event-canon', () => {
  test('drops events without fact or source_excerpt', () => {
    expect(normalizeEstablishedEvent({
      subject: '林战',
      fact: '林战被剥皮而死',
    }, 1)).toBeNull()
  })

  test('auto-confirms high-confidence death/rule events', () => {
    const event = normalizeEstablishedEvent({
      kind: 'death',
      subject: '林战',
      predicate: '死亡方式',
      fact: '林战因违规开门，被苍白带刺之手剥皮而死',
      cause: '违规开门',
      mechanism: '苍白带刺之手剥皮',
      source_excerpt: '林战推开了不该开的门……被苍白带刺的手剥下皮来',
      confidence: 0.9,
    }, 1)
    expect(event?.status).toBe('confirmed')
    expect(event?.lock_level).toBe('hard')
  })

  test('empty incoming does not wipe previous confirmed events', () => {
    const prev = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '林战',
        predicate: '死亡方式',
        fact: '林战因违规开门被剥皮而死',
        source_excerpt: '他开了不该开的门，被剥皮',
        confidence: 0.95,
      }, 1)!,
    ]
    const merged = mergeEstablishedEvents(prev, [])
    expect(merged).toHaveLength(1)
    expect(merged[0].fact).toContain('违规开门')
  })

  test('contradicting candidate does not overwrite confirmed', () => {
    const prev = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '林战',
        predicate: '死亡方式',
        fact: '林战因违规开门被剥皮而死',
        mechanism: '苍白带刺手剥皮',
        source_excerpt: '开了不该开的门',
        confidence: 0.95,
      }, 1)!,
    ]
    const incoming = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '林战',
        predicate: '死亡方式',
        fact: '林战因回头被虚空钢丝剥皮而死',
        mechanism: '虚空钢丝',
        source_excerpt: '他回头的瞬间',
        confidence: 0.7,
      }, 2)!,
    ]
    const merged = mergeEstablishedEvents(prev, incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0].fact).toContain('违规开门')
    expect(merged[0].status).toBe('confirmed')
  })

  test('compatible richer event merges constraints without replacing core fact', () => {
    const prev = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '楚弦',
        predicate: '死亡方式',
        fact: '楚弦因非整点下车被拧杀',
        source_excerpt: '非整点不能下车',
        confidence: 0.9,
      }, 1)!,
    ]
    const incoming = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '楚弦',
        predicate: '死亡方式',
        fact: '楚弦因非整点下车规则被拧三下而死',
        cause: '非整点下车',
        mechanism: '被拧三下',
        constraints: ['非整点不能下车', '拧三下'],
        source_excerpt: '时钟慢了一秒……被拧了三下',
        confidence: 0.92,
      }, 1)!,
    ]
    const merged = mergeEstablishedEvents(prev, incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0].mechanism).toContain('拧')
    expect(merged[0].constraints?.length).toBeGreaterThan(0)
  })

  test('projectCanonFactsFromEvents outputs human-readable facts', () => {
    const events = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '林战',
        predicate: '死亡方式',
        fact: '林战因违规开门被剥皮而死',
        source_excerpt: '开了不该开的门',
        confidence: 0.95,
      }, 1)!,
    ]
    expect(projectCanonFactsFromEvents(events)[0]).toContain('林战')
  })

  test('scanEstablishedEventConflicts warns when death mechanism rewritten', () => {
    const events = [
      normalizeEstablishedEvent({
        kind: 'death',
        subject: '林战',
        predicate: '死亡方式',
        fact: '林战因违规开门被苍白带刺手剥皮而死',
        mechanism: '苍白带刺手剥皮',
        cause: '违规开门',
        constraints: ['违规开门', '苍白带刺'],
        source_excerpt: '他开了不该开的门',
        confidence: 0.95,
      }, 1)!,
    ]
    const conflicts = scanEstablishedEventConflicts({
      events,
      chapterText: '林战死了。他当时只是回头看了一眼，就被虚空钢丝剥皮。',
    })
    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts[0].message).toContain('林战')
  })

  test('selectEstablishedEventsForChapter prioritizes flashback death facts', () => {
    const selected = selectEstablishedEventsForChapter({
      events: [
        {
          kind: 'death',
          subject: '林战',
          predicate: '死亡方式',
          fact: '林战因违规开门被剥皮而死',
          mechanism: '剥皮',
          source_excerpt: '开了不该开的门',
          confidence: 0.95,
          chapter_no: 1,
        },
      ],
      chapterNo: 2,
      outlineText: '本章闪回前两任天选者的死法',
    })
    expect(selected[0]?.subject).toBe('林战')
  })
})
