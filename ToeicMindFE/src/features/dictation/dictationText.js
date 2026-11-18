// So khớp văn bản cho Nghe chép. Thuần JS để kiểm thử được.
export const normWord = (word) => String(word).toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, '')
export const wordsOf = (text) => String(text || '').split(/\s+/).filter(Boolean)

// Dãy con chung dài nhất giữa câu chuẩn và câu người học gõ; trả về cờ khớp cho từng từ của câu chuẩn.
export function alignWords(reference, typed) {
  const n = reference.length
  const m = typed.length
  const table = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = reference[i] === typed[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const hit = new Array(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (reference[i] === typed[j]) { hit[i] = true; i++; j++ } else if (table[i + 1][j] >= table[i][j + 1]) i++
    else j++
  }
  return hit
}

// Độ chính xác (0–100) khi gõ lại cả câu.
export function sentenceAccuracy(referenceWords, typedWords) {
  const reference = referenceWords.map(normWord)
  const typed = typedWords.map(normWord).filter(Boolean)
  const hit = alignWords(reference, typed)
  const accuracy = typed.length ? (hit.filter(Boolean).length * 100) / reference.length : 0
  return { hit, accuracy }
}

export function seededRandom(seed) {
  let state = (seed * 2654435761) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

// Chọn ổn định (theo id clip) các từ bị ẩn theo phần trăm; ưu tiên từ từ 3 chữ trở lên.
export function pickHidden(words, seed, percentHidden) {
  if (percentHidden >= 100) return new Set(words.map((_, i) => i))
  const random = seededRandom(seed)
  const long = words.map((word, i) => [i, normWord(word).length]).filter((entry) => entry[1] >= 3).map((entry) => entry[0])
  const pool = (long.length ? long : words.map((_, i) => i)).slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return new Set(pool.slice(0, Math.max(1, Math.round((pool.length * percentHidden) / 100))))
}

// Chế độ ghi lên máy chủ theo tab và tỉ lệ ẩn.
export const MODE_OF = { DICT: (percentHidden) => (percentHidden >= 100 ? 'HIDE_ALL' : 'HIDE_SOME'), CHECK: () => 'FLIP', FULL: () => 'SHADOW' }

// Nghe check: (số từ ẩn − số từ đã lật) / số từ ẩn.
export const flipAccuracy = (hiddenCount, flipped) => (hiddenCount ? (Math.max(0, hiddenCount - flipped) * 100) / hiddenCount : 0)

// Tên một bộ clip: bộ cắt từ đề theo số câu/nhóm; bộ sưu tầm (UC-28 TH2) theo ghi chú nguồn.
export function itemTitle(item) {
  if (item.sourceKind === 'STANDALONE') return item.sourceNote || `Clip sưu tầm #${item.itemId}`
  return item.firstQuestionNo ? `${item.partNo <= 2 ? 'Câu' : 'Từ câu'} ${item.firstQuestionNo}` : `Bộ clip ${item.groupOrder ?? item.itemId}`
}
