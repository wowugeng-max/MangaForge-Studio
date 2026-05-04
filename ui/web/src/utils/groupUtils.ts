import type { Node } from 'reactflow'

const PADDING = 40
const HEADER_HEIGHT = 50

export function computeBoundingBox(selectedNodes: Node[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  selectedNodes.forEach(node => {
    const w = (node.style?.width as number) || node.width || 360
    const h = (node.style?.height as number) || node.height || 380
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + w)
    maxY = Math.max(maxY, node.position.y + h)
  })

  return {
    x: minX - PADDING,
    y: minY - PADDING - HEADER_HEIGHT,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2 + HEADER_HEIGHT,
  }
}

export function toRelativePosition(
  nodePos: { x: number; y: number },
  groupPos: { x: number; y: number },
) {
  return { x: nodePos.x - groupPos.x, y: nodePos.y - groupPos.y }
}

export function toAbsolutePosition(
  nodePos: { x: number; y: number },
  groupPos: { x: number; y: number },
) {
  return { x: nodePos.x + groupPos.x, y: nodePos.y + groupPos.y }
}
