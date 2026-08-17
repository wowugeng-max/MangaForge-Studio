export const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60_000
export const DEFAULT_HARD_TIMEOUT_MS = 45 * 60_000
export const OPEN_BOOK_IDLE_TIMEOUT_MS = 15 * 60_000
export const OPEN_BOOK_HARD_TIMEOUT_MS = 60 * 60_000

export function turnTimeoutsForContract(contract: { verb?: string }): {
  idleTimeoutMs: number
  hardTimeoutMs: number
} {
  if (contract.verb === 'open_book') {
    return { idleTimeoutMs: OPEN_BOOK_IDLE_TIMEOUT_MS, hardTimeoutMs: OPEN_BOOK_HARD_TIMEOUT_MS }
  }
  return { idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS, hardTimeoutMs: DEFAULT_HARD_TIMEOUT_MS }
}
