// Ngữ cảnh duyệt danh sách bộ clip, lưu theo phiên làm việc để trình luyện chuyển bộ trước/sau đúng theo danh sách người học vừa chọn.
const KEYS = { query: 'toeicmind_fe_dict_query', ids: 'toeicmind_fe_dict_ids', back: 'toeicmind_fe_dict_back', tab: 'toeicmind_fe_dict_tab', pct: 'toeicmind_fe_dict_pct', rate: 'toeicmind_fe_dict_rate', loop: 'toeicmind_fe_dict_loop' }

const store = () => { try { return globalThis.sessionStorage } catch { return null } }
export function readValue(name, fallback = null) {
  try { const raw = store()?.getItem(KEYS[name]); return raw === null || raw === undefined ? fallback : JSON.parse(raw) } catch { return fallback }
}
export function writeValue(name, value) {
  try { store()?.setItem(KEYS[name], JSON.stringify(value)) } catch { /* Storage bị chặn. */ }
}

export const saveListContext = ({ query, back }) => { writeValue('query', query); writeValue('ids', []); writeValue('back', back) }
export const backPath = () => readValue('back', '/listen/dictation')
