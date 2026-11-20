// Vị trí tô sáng tính theo các nút chữ của đoạn văn đã lọc HTML.
export function passageVersion(html) {
  let hash = 2166136261
  for (let i = 0; i < html.length; i += 1) hash = Math.imul(hash ^ html.charCodeAt(i), 16777619)
  return hash >>> 0
}

export function getPassageSelection(root, selection) {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
  const text = range.toString()
  if (!text.trim()) return null

  const prefix = root.ownerDocument.createRange()
  prefix.selectNodeContents(root)
  prefix.setEnd(range.startContainer, range.startOffset)
  const start = prefix.toString().length
  return { start, end: start + text.length, range }
}

export function containsHighlight(ranges, { start, end }) {
  return ranges.some(([from, to]) => from <= start && end <= to)
}

export function toggleHighlight(ranges, selection) {
  const { start, end } = selection
  if (containsHighlight(ranges, selection)) {
    return ranges.flatMap(([from, to]) => from <= start && end <= to
      ? [[from, start], [end, to]].filter(([left, right]) => left < right)
      : [[from, to]])
  }

  const merged = []
  for (const [from, to] of [...ranges, [start, end]].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1)
    if (last && from <= last[1]) last[1] = Math.max(last[1], to)
    else merged.push([from, to])
  }
  return merged
}

export function renderHighlights(html, ranges) {
  if (!ranges.length) return html
  const template = document.createElement('template')
  template.innerHTML = html
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  let offset = 0
  for (const node of textNodes) {
    const start = offset
    offset += node.length
    const parts = ranges.filter(([from, to]) => from < offset && to > start)
    if (!parts.length) continue

    const replacement = document.createDocumentFragment()
    let cursor = 0
    for (const [from, to] of parts) {
      const left = Math.max(0, from - start)
      const right = Math.min(node.length, to - start)
      if (left > cursor) replacement.append(node.data.slice(cursor, left))
      const mark = document.createElement('mark')
      mark.dataset.passageHighlight = ''
      mark.textContent = node.data.slice(left, right)
      replacement.append(mark)
      cursor = right
    }
    if (cursor < node.length) replacement.append(node.data.slice(cursor))
    node.replaceWith(replacement)
  }
  return template.innerHTML
}
