import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useStoredState } from '../../../hooks/useStoredState.js'
import { sanitizeHtml } from '../../../lib/sanitize.js'
import { containsHighlight, getPassageSelection, passageVersion, renderHighlights, toggleHighlight } from './passageHighlights.js'

const EMPTY = []

export function HighlightablePassage({ html, storageKey }) {
  const passage = useRef(null)
  const action = useRef(null)
  const hintId = useId()
  const [saved, setSaved] = useStoredState(storageKey, null)
  const [target, setTarget] = useState(null)
  const [message, setMessage] = useState('')
  const source = useMemo(() => sanitizeHtml(html), [html])
  const version = useMemo(() => passageVersion(source), [source])
  const ranges = saved?.version === version && Array.isArray(saved.ranges) ? saved.ranges : EMPTY
  const content = useMemo(() => ({ __html: renderHighlights(source, ranges) }), [source, ranges])
  const remove = target && containsHighlight(ranges, target)

  useEffect(() => {
    const root = passage.current
    const frame = root.parentElement
    const study = root.closest('.study')
    const pane = root.closest('.study-pane')
    const header = study?.querySelector('.study-top')
    const footer = study?.querySelector('.study-bottom')
    let pending = 0

    function update() {
      pending = 0
      const selection = getPassageSelection(root, window.getSelection())
      if (!selection) {
        if (document.activeElement !== action.current) setTarget(null)
        return
      }

      const top = Math.max(0, pane?.getBoundingClientRect().top ?? 0, header?.getBoundingClientRect().bottom ?? 0)
      const bottom = Math.min(window.innerHeight, pane?.getBoundingClientRect().bottom ?? window.innerHeight, footer?.getBoundingClientRect().top ?? window.innerHeight)
      const line = Array.from(selection.range.getClientRects()).filter((rect) => rect.width && rect.bottom > top && rect.top < bottom).at(-1)
      if (!line) { setTarget(null); return }

      const buttonRoom = (action.current?.offsetHeight || 44) + 8
      const above = line.bottom + buttonRoom > bottom && line.top - buttonRoom >= top
      const y = (above ? line.top : line.bottom) - frame.getBoundingClientRect().top
      setTarget({ start: selection.start, end: selection.end, y, above })
    }

    function schedule() {
      if (!pending) pending = window.requestAnimationFrame(update)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    document.addEventListener('selectionchange', schedule)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      window.cancelAnimationFrame(pending)
      observer.disconnect()
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  function applyHighlight() {
    if (!target) return
    const next = toggleHighlight(ranges, target)
    setSaved(next.length ? { version, ranges: next } : null)
    setMessage(remove ? 'Đã bỏ tô sáng phần đã chọn.' : 'Đã tô sáng phần đã chọn.')
    window.getSelection()?.removeAllRanges()
    setTarget(null)
    if (document.activeElement === action.current) passage.current.focus({ preventScroll: true })
  }

  function onKeyDown(event) {
    if (event.shiftKey && event.key.startsWith('Arrow')) event.stopPropagation()
    if (event.key === 'Enter' && event.target === action.current) event.stopPropagation()
    if (event.key !== 'Escape' || !target) return
    event.preventDefault()
    event.stopPropagation()
    window.getSelection()?.removeAllRanges()
    setTarget(null)
    if (document.activeElement === action.current) passage.current.focus({ preventScroll: true })
  }

  return (
    <div className="study-passage-highlight" onKeyDown={onKeyDown}>
      <p id={hintId} className="study-passage-highlight-hint muted small">Bôi chọn chữ để tô sáng hoặc bỏ tô.</p>
      <div ref={passage} className="passage study-passage" lang="en" tabIndex={0} aria-describedby={hintId}
        dangerouslySetInnerHTML={content} />
      {target && (
        <button ref={action} type="button" className="btn btn-primary study-passage-highlight-action" data-above={target.above}
          style={{ top: target.y }} onPointerDown={(event) => event.preventDefault()} onClick={applyHighlight}>
          {remove ? 'Bỏ tô sáng' : 'Tô sáng'}
        </button>
      )}
      <span className="sr-only" role="status">{message}</span>
    </div>
  )
}
