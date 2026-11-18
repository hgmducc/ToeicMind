// Chấm từng câu và đánh giá độ quen thuộc của một từ từ 2–3 câu hỏi khác dạng.
export const MAX_LEVEL = 3

// Thời gian "chậm" (ms) theo dạng bài; cộng thêm theo số chữ cái với dạng gõ/xếp chữ và nhân theo độ khó.
export const SLOW_BASE_MS = { quiz: 7000, match: 7000, scramble: 12000, tf: 5000, fill: 12000, flash: 6000, missing: 11000 }
export const PER_CHAR_MS = { scramble: 600, missing: 500, fill: 400 }

export function slowLimit(mode, level, lemma) {
  const letters = String(lemma || '').replace(/[^a-z]/gi, '').length
  return ((SLOW_BASE_MS[mode] || 8000) + (PER_CHAR_MS[mode] || 0) * letters) * (1 + 0.2 * (level || 0))
}

// ok=false → wrong. Đúng nhưng quá giờ hoặc dùng gợi ý → slow; dưới nửa thời gian cho phép → fast; còn lại good.
// `cls` có sẵn (thẻ tự chấm, ghép cặp) được giữ nguyên.
export function classify({ ok, ms, hint, cls, mode, level, lemma }) {
  if (cls) return cls
  if (!ok) return 'wrong'
  const limit = slowLimit(mode, level, lemma)
  if (hint || ms > limit) return 'slow'
  return ms < limit * 0.5 ? 'fast' : 'good'
}

export const CLS_POINTS = { wrong: 0, slow: 1, good: 2, fast: 3 }
export const CLS_LABEL = { wrong: 'Sai', slow: 'Đúng, chậm', good: 'Đúng', fast: 'Đúng, nhanh' }

// Bốn mức quen thuộc khớp bốn mức đánh giá 0–3 của lịch ôn SM-2 ở máy chủ.
export const FAMILIARITY = [
  { grade: 0, key: 'unfamiliar', label: 'Chưa quen', tone: 'danger' },
  { grade: 1, key: 'beginner', label: 'Mới quen', tone: 'warning' },
  { grade: 2, key: 'familiar', label: 'Quen', tone: 'default' },
  { grade: 3, key: 'strong', label: 'Rất quen', tone: 'success' },
]

// results: [{ cls }] của một từ trong phiên. Quy tắc:
//  - sai hết → Chưa quen (0); sai một phần → Mới quen (1);
//  - đúng hết: trung bình điểm (chậm 1, đúng 2, nhanh 3) ≥ 2,5 → Rất quen (3); ≥ 1,75 → Quen (2); còn lại Mới quen (1).
export function evaluateWord(results) {
  const total = results.length
  if (!total) return null
  const wrong = results.filter((r) => r.cls === 'wrong').length
  const correct = total - wrong
  const average = results.reduce((sum, r) => sum + CLS_POINTS[r.cls], 0) / total
  let grade
  if (correct === 0) grade = 0
  else if (wrong > 0) grade = 1
  else grade = average >= 2.5 ? 3 : average >= 1.75 ? 2 : 1
  return { ...FAMILIARITY[grade], correct, total, average }
}

// Độ khó khởi điểm (0..3) của một từ theo tiến độ SM-2 đã lưu ở máy chủ.
export function levelFromProgress(word) {
  if (!word || word.status === 'NEW') return 0
  let level = 0
  if (word.status === 'MASTERED') level = 3
  else if (word.repetitions >= 3 || word.intervalDays >= 7) level = 2
  else if (word.repetitions >= 2 || word.intervalDays >= 3) level = 1
  if (word.lapses >= 2) level -= 1
  return Math.max(0, Math.min(MAX_LEVEL, level))
}

// Trong cùng một từ: đúng nhanh thì câu sau khó hơn, sai thì dễ hơn để vẫn đo được phần từ nhớ được.
export function adaptLevel(base, results) {
  const fast = results.filter((r) => r.cls === 'fast').length
  const wrong = results.filter((r) => r.cls === 'wrong').length
  return Math.max(0, Math.min(MAX_LEVEL, base + fast - wrong))
}

// Nhãn quen thuộc suy ra từ tiến độ đã lưu (danh sách từ), không cần dữ liệu phiên.
export function familiarityOfProgress(word) {
  if (!word || word.status === 'NEW') return { key: 'untouched', label: 'Chưa học', tone: 'muted' }
  if (word.status === 'MASTERED') return FAMILIARITY[3]
  if (!word.repetitions) return FAMILIARITY[0]
  return word.intervalDays < 3 ? FAMILIARITY[1] : FAMILIARITY[2]
}

export function accuracyOf(results) {
  const answered = results.length
  return answered ? Math.round((results.filter((r) => r.cls !== 'wrong').length * 100) / answered) : 0
}
