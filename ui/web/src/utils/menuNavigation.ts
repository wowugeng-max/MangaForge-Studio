export function moveMenuHighlight(current: number, delta: number, total: number): number {
  if (total <= 0) return 0
  return ((current + delta) % total + total) % total
}
