import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

const WEB_SRC = join(import.meta.dir, '..', '..')
const read = (rel: string) => readFileSync(join(WEB_SRC, rel), 'utf8')

describe('fingerprint contracts page wiring', () => {
  test('router lazy-loads the page under the layout children', () => {
    const router = read('router.tsx')
    expect(router).toContain("lazy(() => import('./pages/FingerprintContracts'))")
    expect(router).toContain("path: 'fingerprint-contracts'")
  })

  test('layout exposes the menu entry and selected-key mapping', () => {
    const layout = read('components/Layout.tsx')
    expect(layout).toContain('to="/fingerprint-contracts"')
    expect(layout).toContain("path.startsWith('/fingerprint-contracts')")
    expect(layout).toContain("key: 'fingerprint-contracts'")
  })

  test('page renders the three sections and uses the api client', () => {
    const page = read('pages/FingerprintContracts/index.tsx')
    expect(page).toContain('fingerprintContractApi')
    expect(page).toContain('合同集')
    expect(page).toContain('生成合同')
    expect(page).toContain('评分看板')
    expect(page).toContain('buildContractSetRows')
    expect(page).toContain('buildCheckPassRateItems')
  })

  test('job polling wires the unmount and duplicate-poll guards from the model', () => {
    const page = read('pages/FingerprintContracts/index.tsx')
    expect(page).toContain('canApplyJobUpdate')
    expect(page).toContain('shouldResumeJobPolling')
    expect(page).toContain('mountedRef.current = false')
  })
})
