export function clampToViewport(input: { x: number; y: number; width: number; height: number; viewportWidth: number; viewportHeight: number; margin?: number }): { x: number; y: number } {
  const margin = input.margin ?? 8
  const maxX = Math.max(margin, input.viewportWidth - input.width - margin)
  const maxY = Math.max(margin, input.viewportHeight - input.height - margin)
  return {
    x: Math.min(Math.max(input.x, margin), maxX),
    y: Math.min(Math.max(input.y, margin), maxY),
  }
}
