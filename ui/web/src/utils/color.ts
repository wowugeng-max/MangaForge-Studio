export function hexToRgba(hex: string, alpha: number): string {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    let h = hex.substring(1)
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('')
    const num = parseInt(h, 16)
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`
  }
  return `rgba(255, 255, 255, ${alpha})`
}
