// Tuyến đường và điều hướng của khu vực người học. Giữ thuần JS để kiểm thử được.
export const LANDING_PATH = '/'

export const NAV_ITEMS = Object.freeze([
  { id: 'home', label: 'Trang chủ', icon: 'home', path: '/' },
  { id: 'plan', label: 'Lộ trình', icon: 'target', path: '/plan' },
  { id: 'listen', label: 'Nghe', icon: 'headphones', path: '/listen/dictation' },
  { id: 'read', label: 'Đọc', icon: 'book', path: '/read/grammar' },
  { id: 'tests', label: 'Đề thi', icon: 'file', path: '/tests' },
  { id: 'vocab', label: 'Từ vựng', icon: 'text', path: '/vocab' },
  { id: 'vip', label: 'VIP', icon: 'star', path: '/vip' },
  { id: 'history', label: 'Lịch sử', icon: 'list', path: '/history' },
])

const NAV_RULES = [
  [/^\/(plan|placement)(\/|$)/, 'plan'],
  [/^\/(listen|dictation)(\/|$)/, 'listen'],
  [/^\/read(\/|$)/, 'read'],
  [/^\/(tests|attempt)(\/|$)/, 'tests'],
  [/^\/vocab(\/|$)/, 'vocab'],
  [/^\/vip(\/|$)/, 'vip'],
  [/^\/(history|result|review)(\/|$)/, 'history'],
]

// Mục điều hướng cần sáng cho một đường dẫn (trang con thuộc mục cha của nó).
export function navKeyForPath(pathname) {
  if (pathname === '/') return 'home'
  return NAV_RULES.find(([pattern]) => pattern.test(pathname))?.[1] ?? null
}

// Đường dẫn nội bộ an toàn để quay lại sau khi đăng nhập (chặn //host, URL tuyệt đối và vòng lặp về /login).
export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return LANDING_PATH
  if (/^\/(login|forgot-password|registered)(\/|\?|$)/.test(value)) return LANDING_PATH
  return value
}

// Liên kết kiểu LEARNER cũ (http://host/#/vip/result?status=PAID) → đường dẫn của ứng dụng hiện tại (/vip/result?status=PAID).
// Chỉ áp dụng khi đang ở gốc "/" và hash là đường dẫn nội bộ an toàn.
export function legacyHashToPath(hash, pathname = '/') {
  if (pathname !== '/' || typeof hash !== 'string' || !hash.startsWith('#/')) return null
  const target = hash.slice(1)
  return target !== '/' && safeReturnPath(target) === target ? target : null
}

export const paths = Object.freeze({
  attempt: (id) => `/attempt/${id}`,
  result: (id) => `/result/${id}`,
  review: (id) => `/review/${id}`,
  dictationItem: (id) => `/dictation/item/${id}`,
  vocabLearn: (query = '') => `/vocab/learn${query ? `?${query}` : ''}`,
  vocabPlay: (query = '') => `/vocab/play${query ? `?${query}` : ''}`,
})

// Trang người học chạy toàn màn hình (không hiện thanh điều hướng): lúc làm bài, xem đáp án chi tiết và thiết lập mục tiêu ban đầu.
export const FOCUS_ROUTES = Object.freeze([/^\/attempt\/\d+$/, /^\/review\/\d+$/, /^\/welcome$/])

export const isFocusRoute = (pathname) => FOCUS_ROUTES.some((pattern) => pattern.test(pathname))
