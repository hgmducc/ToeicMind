// Nhớ lượt ngân hàng vừa học để trang kết quả có nút "Học tiếp mục này".
const KEY = 'toeicmind_fe_last_bank'

export function saveLastBank(body, storage = globalThis.sessionStorage) {
  try { storage.setItem(KEY, JSON.stringify(body)) } catch { /* Storage bị chặn. */ }
}

export function readLastBank(storage = globalThis.sessionStorage) {
  try { return JSON.parse(storage.getItem(KEY) || 'null') } catch { return null }
}
