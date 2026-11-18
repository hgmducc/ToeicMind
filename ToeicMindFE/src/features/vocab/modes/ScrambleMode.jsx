import { useState } from 'react'
import { useHotkeys } from '../../../hooks/useHotkeys.js'
import { lettersOf, maskWord, shuffle } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

// Mức 1: cho sẵn chữ đầu · 2: xếp đủ · 3: thêm 2 chữ thừa · 4: thêm 3 chữ thừa và ẩn nghĩa.
function buildBoard(lemma, level) {
  const word = lemma.toLowerCase()
  const slots = word.split('').map((ch) => ({ ch, fixed: !/[a-z]/.test(ch), value: null, tile: -1 }))
  if (level === 0 && lettersOf(word).length >= 4) slots.find((slot) => !slot.fixed).fixed = true
  const needed = slots.filter((slot) => !slot.fixed).map((slot) => slot.ch)
  const extra = level >= 2 ? (level === 2 ? 2 : 3) : 0
  const spare = shuffle('abcdefghijklmnopqrstuvwxyz'.split('').filter((ch) => !needed.includes(ch))).slice(0, extra)
  let tiles = [...needed, ...spare].map((ch) => ({ ch, used: false }))
  for (let attempt = 0; attempt < 6; attempt++) {
    tiles = shuffle(tiles)
    if (extra || tiles.map((t) => t.ch).join('') !== needed.join('')) break
  }
  return { slots, tiles }
}

// Các thao tác thuần trên bàn chữ: trả về bàn mới, không sửa bàn cũ.
const isOpen = (slot) => !slot.fixed && slot.value === null
const isComplete = (board) => !board.slots.some(isOpen)
const isCorrect = (board) => board.slots.every((slot) => slot.fixed || slot.value === slot.ch)

function withTilesInUse(slots, tiles) {
  const inUse = new Set(slots.filter((slot) => slot.tile >= 0).map((slot) => slot.tile))
  return tiles.map((tile, i) => ({ ...tile, used: inUse.has(i) }))
}

function placeTile(board, tileIndex) {
  const slotIndex = board.slots.findIndex(isOpen)
  if (slotIndex < 0 || board.tiles[tileIndex].used) return board
  const slots = board.slots.map((slot, i) => (i === slotIndex ? { ...slot, value: board.tiles[tileIndex].ch, tile: tileIndex } : slot))
  return { slots, tiles: withTilesInUse(slots, board.tiles) }
}

function removeLast(board) {
  let last = -1
  board.slots.forEach((slot, i) => { if (!slot.fixed && slot.value !== null) last = i })
  if (last < 0) return board
  const slots = board.slots.map((slot, i) => (i === last ? { ...slot, value: null, tile: -1 } : slot))
  return { slots, tiles: withTilesInUse(slots, board.tiles) }
}

// Gợi ý: xóa từ ô sai đầu tiên trở đi rồi đặt đúng chữ cho ô đó.
function revealNext(board) {
  const target = board.slots.findIndex((slot) => !slot.fixed && slot.value !== slot.ch)
  if (target < 0) return board
  const cleared = board.slots.map((slot, i) => (i >= target && !slot.fixed ? { ...slot, value: null, tile: -1 } : slot))
  const tiles = withTilesInUse(cleared, board.tiles)
  const tileIndex = tiles.findIndex((tile) => !tile.used && tile.ch === cleared[target].ch)
  if (tileIndex < 0) return { slots: cleared, tiles }
  return placeTile({ slots: cleared, tiles }, tileIndex)
}

export default function ScrambleMode({ item, level, onAnswer }) {
  const word = item.word
  const [board, setBoard] = useState(() => buildBoard(word.lemma, level))
  const [locked, setLocked] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [showMeaning, setShowMeaning] = useState(level < 3)
  const elapsed = useElapsed()
  const { slots, tiles } = board

  function apply(next, usedHint) {
    setBoard(next)
    if (!isComplete(next)) return
    setLocked(true)
    const ok = isCorrect(next)
    onAnswer({ ok, ms: elapsed(), hint: usedHint, note: ok ? null : <>Đáp án: <b>{word.lemma}</b></> })
  }

  const place = (tileIndex) => { if (!locked) apply(placeTile(board, tileIndex), hinted) }
  const undo = () => { if (!locked) setBoard(removeLast(board)) }
  function hint() {
    if (locked) return
    setHinted(true)
    if (!showMeaning) { setShowMeaning(true); return }
    apply(revealNext(board), true)
  }

  useHotkeys((event) => {
    if (locked) return
    if (event.key === 'Backspace') { event.preventDefault(); undo(); return }
    if (/^[a-z]$/i.test(event.key)) {
      const index = tiles.findIndex((tile) => !tile.used && tile.ch === event.key.toLowerCase())
      if (index >= 0) place(index)
    }
  })

  const definition = word.definitionEn ? ` · ${maskWord(word.definitionEn, word.lemma)}` : ''
  return (
    <>
      <div className="vq-prompt">
        <p className="vq-sub">Xếp thành từ tiếng Anh</p>
        {showMeaning ? (
          <>
            <p className="vq-big vq-big--sm">{word.meaningVi}</p>
            <p className="muted small">{word.posCode}{definition}</p>
          </>
        ) : (
          <>
            <p className="muted">{word.posCode} · {lettersOf(word.lemma).length} chữ cái{definition}</p>
            <p className="muted small">Nghe phát âm hoặc bấm “Gợi ý” để xem nghĩa tiếng Việt.</p>
          </>
        )}
        <SpeakButton text={word.lemma} />
      </div>
      <div className="vq-slots" data-result={locked ? (isCorrect(board) ? 'correct' : 'wrong') : undefined} aria-label="Các ô chữ">
        {slots.map((slot, i) => <span key={i} className="vq-slot" data-fixed={slot.fixed || undefined} data-filled={slot.value ? 'true' : undefined}>{slot.fixed ? slot.ch : slot.value || ''}</span>)}
      </div>
      <div className="vq-tiles">
        {tiles.map((tile, i) => <button key={i} type="button" className="vq-tile" disabled={tile.used || locked} onClick={() => place(i)}>{tile.ch}</button>)}
      </div>
      <div className="vq-row">
        <button type="button" className="btn btn-outline btn-sm" onClick={undo} disabled={locked}>Xóa chữ cuối</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={hint} disabled={locked}>Gợi ý</button>
      </div>
    </>
  )
}
