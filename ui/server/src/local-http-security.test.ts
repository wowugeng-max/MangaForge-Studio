import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertLoopbackListenHost,
  createLocalOriginGuard,
  isTrustedLocalOrigin,
} from './local-http-security'

function responseHarness() {
  return {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
}

describe('local HTTP security', () => {
  test.each(['localhost', '127.0.0.1', '::1'])('accepts loopback listen host %s', host => {
    expect(assertLoopbackListenHost(host)).toBe(host)
  })

  test.each(['0.0.0.0', '192.168.1.20', 'mangaforge.local'])('rejects non-loopback listen host %s', host => {
    expect(() => assertLoopbackListenHost(host)).toThrow('loopback')
  })

  test.each([
    undefined,
    'http://localhost:5173',
    'https://localhost',
    'http://127.0.0.1:4173',
    'http://[::1]:8787',
  ])('trusts local or Origin-less request %s', origin => {
    expect(isTrustedLocalOrigin(origin)).toBe(true)
  })

  test.each([
    'https://evil.example',
    'http://localhost.evil.example',
    'null',
    'file://localhost/tmp/index.html',
    'not a url',
  ])('rejects hostile origin %s', origin => {
    expect(isTrustedLocalOrigin(origin)).toBe(false)
  })

  test('rejects before the downstream handler executes', () => {
    let handled = false
    const res = responseHarness()
    createLocalOriginGuard()(
      { headers: { origin: 'https://evil.example' } } as any,
      res as any,
      () => { handled = true },
    )
    expect(handled).toBe(false)
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ error_code: 'LOCAL_ORIGIN_FORBIDDEN' })
  })

  test('guards WebSocket upgrades with the same local-origin predicate', () => {
    const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')
    const upgrade = source.slice(
      source.indexOf("listeningServer.on('upgrade'"),
      source.indexOf('void backgroundServices.start'),
    )
    expect(upgrade).toContain('isTrustedLocalOrigin(origin)')
    expect(upgrade.indexOf('isTrustedLocalOrigin(origin)')).toBeLessThan(
      upgrade.indexOf("pathname.startsWith('/api/ws/')"),
    )
  })
})
