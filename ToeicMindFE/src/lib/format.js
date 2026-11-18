// Định dạng hiển thị dùng chung cho khu vực người học. Múi giờ cố định theo người dùng Việt Nam.
const TIME_ZONE = 'Asia/Ho_Chi_Minh'

export const PART_NAMES = {
  1: 'Mô tả tranh', 2: 'Hỏi – đáp', 3: 'Hội thoại', 4: 'Bài nói ngắn', 5: 'Điền câu', 6: 'Điền đoạn văn', 7: 'Đọc hiểu',
}
export const ATTEMPT_MODE = { EXAM: 'Luyện thi', PRACTICE: 'Luyện tập' }
export const ATTEMPT_SCOPE = { FULL: 'Full đề', LISTENING: 'Listening', READING: 'Reading', PART: 'Theo Part', BANK: 'Ngân hàng câu hỏi', PLACEMENT: 'Kiểm tra đầu vào' }

export const percent = (part, total) => (total ? Math.round((part * 100) / total) : 0)

export function formatClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDateTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return ''
  return new Date(value).toLocaleString('vi-VN', {
    hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE,
  })
}

export function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return ''
  return new Date(value).toLocaleDateString('vi-VN', { timeZone: TIME_ZONE })
}

export const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`

// 'YYYY-MM-DD' theo giờ máy người dùng (dùng cho lịch học).
export function isoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Khoảng thời gian tính từ số phút: "10 phút", "2 giờ", "3 ngày".
export function formatSpan(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  if (m < 60) return `${Math.max(1, m)} phút`
  if (m < 1440) return `${Math.round(m / 60)} giờ`
  return `${Math.round(m / 1440)} ngày`
}

// Thời điểm ôn kế tiếp so với bây giờ: "Đến hạn" hoặc "Sau 3 ngày".
export function formatDue(value, now = Date.now()) {
  const at = Date.parse(value)
  if (!Number.isFinite(at)) return ''
  const diff = at - now
  return diff <= 0 ? 'Đến hạn' : `Sau ${formatSpan(diff / 60000)}`
}

export const formatSeconds = (ms) => (Math.max(0, ms) / 1000).toFixed(1)
