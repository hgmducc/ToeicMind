// Tiện ích văn bản cho câu hỏi từ vựng. Thuần JS, nhận rng để kiểm thử tất định được.
export const idOf = (word) => word.vocabId ?? word.id ?? `x:${String(word.lemma || '').toLowerCase()}`

export function shuffle(list, rng = Math.random) {
  const result = list.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export const norm = (text) => String(text || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, '')
export const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const lettersOf = (text) => String(text || '').replace(/[^a-z]/gi, '')
export const pronunciationOf = (word) => (word.ipaUs ? ` · /${word.ipaUs}/` : '')

// Che từ cần hỏi (kể cả dạng chia như "reviewed") trong một đoạn văn.
export const maskWord = (text, lemma) => String(text || '').replace(new RegExp(`\\b${escapeRegExp(lemma)}[a-z]*`, 'ig'), '____')

export function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const table = Array.from({ length: m + 1 }, (_, i) => [i])
  for (let j = 1; j <= n; j++) table[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return table[m][n]
}

// Hai từ có chữ viết gần giống nhau (dùng làm đáp án gây nhiễu ở mức khó).
export function similarSpelling(a, b) {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  return (x[0] === y[0] && Math.abs(x.length - y.length) <= 2) || levenshtein(x, y) <= 3
}

// Từ gây nhiễu theo trường `key` (lemma, meaningVi, definitionEn); mức càng cao càng giống từ thật.
export function pickDistractors(env, item, key, count, level, rng = Math.random) {
  const word = item.word
  const id = idOf(word)
  const seen = new Set([norm(word[key])])
  const candidates = []
  for (const other of env.words) {
    if (idOf(other) === id) continue
    const value = norm(other[key])
    if (!value || seen.has(value)) continue
    seen.add(value)
    let score = rng()
    if (level >= 1 && other.posCode === word.posCode) score += 2
    if (level >= 3 && key === 'lemma' && similarSpelling(other.lemma, word.lemma)) score += 3
    candidates.push({ other, score })
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, count).map((entry) => entry.other)
}

// Câu ví dụ có chứa từ: trả về phần trước/sau chỗ trống và dạng xuất hiện thật của từ.
export function clozeOf(item) {
  const word = item.word
  const lemma = word.lemma.toLowerCase()
  for (const context of item.contexts || []) {
    if (!context.exampleEn) continue
    for (const form of [context.surfaceForm, word.lemma].filter(Boolean)) {
      const match = new RegExp(`\\b${escapeRegExp(form.trim())}\\b`, 'i').exec(context.exampleEn)
      if (match) return sentenceParts(context, match)
    }
    const stem = lemma.length > 5 ? lemma.slice(0, -2) : lemma
    const loose = new RegExp(`\\b${escapeRegExp(stem)}[a-z]*`, 'i').exec(context.exampleEn)
    if (loose) return sentenceParts(context, loose)
  }
  return null
}

function sentenceParts(context, match) {
  return {
    kind: 'sent',
    before: context.exampleEn.slice(0, match.index),
    form: match[0],
    after: context.exampleEn.slice(match.index + match[0].length),
    vi: context.exampleVi,
  }
}

// Điền chỗ trống: ưu tiên câu ví dụ; không có thì dùng định nghĩa tiếng Anh đã che từ.
export function blankOf(item) {
  const cloze = clozeOf(item)
  if (cloze) return cloze
  const word = item.word
  return word.definitionEn
    ? { kind: 'def', before: '', after: '', defText: maskWord(word.definitionEn, word.lemma), form: word.lemma, vi: '' }
    : null
}
