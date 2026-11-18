// Tùy chọn khi Luyện thi (lưu trên máy): tự phát âm thanh hướng dẫn, tự chuyển câu khi hết audio. Mặc định bật cả hai.
const KEY = 'toeicmind_fe_exam_options'
const DEFAULTS = Object.freeze({ autoDirections: true, autoNext: true })

export function readExamOptions(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(KEY) || '{}') || {}
    return { autoDirections: saved.autoDirections ?? DEFAULTS.autoDirections, autoNext: saved.autoNext ?? DEFAULTS.autoNext }
  } catch { return { ...DEFAULTS } }
}

export function writeExamOptions(options, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify({ autoDirections: !!options.autoDirections, autoNext: !!options.autoNext })) } catch { /* Storage bị chặn. */ }
}

// Tùy chọn khi Luyện tập (lưu trên máy): instantAnswer = hiện đáp án + giải thích ngay sau khi chọn (mặc định bật).
// Tắt: chỉ lưu lựa chọn (đổi được), xem đáp án từng câu bằng nút "Xem đáp án" hoặc xem tất cả sau khi kết thúc.
const PRACTICE_KEY = 'toeicmind_fe_practice_options'

export function readPracticeOptions(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(PRACTICE_KEY) || '{}') || {}
    return { instantAnswer: saved.instantAnswer ?? true }
  } catch { return { instantAnswer: true } }
}

export function writePracticeOptions(options, storage = globalThis.localStorage) {
  try { storage.setItem(PRACTICE_KEY, JSON.stringify({ instantAnswer: !!options.instantAnswer })) } catch { /* Storage bị chặn. */ }
}

// Vị trí đang làm của một lượt thi để vào lại đúng nhóm câu sau khi tải lại trang.
export const positionKey = (attemptId) => `toeicmind_fe_exam_pos_${attemptId}`

export function readPosition(attemptId, storage = globalThis.localStorage) {
  try { const value = Number(storage.getItem(positionKey(attemptId))); return Number.isInteger(value) && value > 0 ? value : 0 } catch { return 0 }
}
export function writePosition(attemptId, value, storage = globalThis.localStorage) {
  try { if (value === null) storage.removeItem(positionKey(attemptId)); else storage.setItem(positionKey(attemptId), String(value)) } catch { /* Bỏ qua. */ }
}
