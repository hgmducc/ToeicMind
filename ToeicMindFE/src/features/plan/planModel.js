// Mô hình thuần JS của lộ trình cá nhân (không phụ thuộc React) để kiểm thử: nhãn, đích của gợi ý, kiểm tra form mục tiêu.

export const TARGET_PRESETS = [450, 550, 650, 750, 850]
export const DAILY_PRESETS = [15, 30, 45, 60, 90]

export const SOURCE_LABEL = { PLACEMENT: 'Kiểm tra đầu vào', EXAM: 'Bài thi đủ 100 câu', PRACTICE: 'Ước tính từ luyện tập' }

export const PART_STATUS = {
  UNTESTED: ['Chưa đủ dữ liệu', 'muted'],
  WEAK: ['Cần củng cố', 'danger'],
  FAIR: ['Khá', 'warning'],
  STRONG: ['Vững', 'success'],
}

// Biểu tượng và nhãn ngắn theo loại gợi ý (khớp RecommendationDto.Kind của backend).
export const KIND_META = {
  PLACEMENT: { icon: 'target', label: 'Kiểm tra đầu vào' },
  PROFILE: { icon: 'flag', label: 'Mục tiêu' },
  VOCAB_REVIEW: { icon: 'refresh', label: 'Ôn từ vựng' },
  VOCAB_NEW: { icon: 'text', label: 'Từ mới' },
  WEAK_TOPIC: { icon: 'alert-circle', label: 'Chủ điểm yếu' },
  LEVEL_PRACTICE: { icon: 'layers', label: 'Luyện theo Level' },
  NEW_PART: { icon: 'sparkles', label: 'Part mới' },
  DICTATION: { icon: 'headphones', label: 'Nghe chép' },
  MOCK_TEST: { icon: 'file', label: 'Thi thử' },
}
export const kindMeta = (kind) => KIND_META[kind] || { icon: 'sparkles', label: 'Gợi ý' }

// Đích của một gợi ý: điều hướng (to), bắt đầu lượt ngân hàng (bank) hoặc mở hộp mục tiêu (profile).
export function recommendationTarget(action = {}) {
  switch (action.type) {
    case 'PLACEMENT':
      return { kind: 'link', to: action.attemptId ? `/attempt/${action.attemptId}` : '/placement' }
    case 'PROFILE':
      return { kind: 'profile' }
    case 'BANK':
      return { kind: 'bank', partNo: action.partNo, cardKey: action.cardKey || 'all', pick: action.pick || 'NEW' }
    case 'VOCAB': {
      const query = new URLSearchParams({ src: action.vocabMode === 'NEW' ? 'NEW' : 'REVIEW', n: String(Math.min(30, Math.max(3, action.count || 10))) })
      return { kind: 'link', to: `/vocab/play?${query}` }
    }
    case 'DICTATION': {
      const query = new URLSearchParams()
      if (action.dictationStatus) query.set('status', action.dictationStatus)
      if (action.levelNo) query.set('levelNo', String(action.levelNo))
      if (action.partNo) query.set('partNo', String(action.partNo))
      const text = query.toString()
      return { kind: 'link', to: `/dictation/items${text ? `?${text}` : ''}` }
    }
    case 'EXAM':
      return { kind: 'link', to: '/tests' }
    default:
      return { kind: 'link', to: '/plan' }
  }
}

// Phần trăm tiến tới mục tiêu của một kỹ năng (0–100); null khi thiếu điểm hoặc mục tiêu.
export function skillProgress(skill) {
  if (skill?.estimatedScaled == null || !skill?.targetScaled) return null
  return Math.max(0, Math.min(100, Math.round((skill.estimatedScaled * 100) / skill.targetScaled)))
}

export function daysLabel(days) {
  if (days == null) return ''
  if (days < 0) return 'Ngày thi đã qua'
  if (days === 0) return 'Thi hôm nay'
  return `Còn ${days} ngày`
}

// 'YYYY-MM-DD' của hôm nay theo giờ máy người dùng (giá trị min cho ô chọn ngày).
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Kiểm tra form mục tiêu, trả { errors, body }. Ô trống = không đặt (null). Quy tắc khớp SaveLearnerProfileRequestDto.
// required (thiết lập lần đầu, bắt buộc): phải có điểm mục tiêu và số phút mỗi ngày; ngày thi vẫn không bắt buộc.
export function validateProfile({ targetScore, examDate, dailyMinutes }, today = todayIso(), { required = false } = {}) {
  const errors = {}
  const body = { targetScore: null, examDate: null, dailyMinutes: null }
  const target = String(targetScore ?? '').trim()
  if (required && !target) errors.targetScore = 'Hãy chọn hoặc nhập điểm TOEIC mục tiêu.'
  if (required && !String(dailyMinutes ?? '').trim()) errors.dailyMinutes = 'Hãy chọn số phút học mỗi ngày.'
  if (target) {
    const value = Number(target)
    if (!Number.isInteger(value) || value < 10 || value > 990) errors.targetScore = 'Điểm mục tiêu là số nguyên từ 10 đến 990.'
    else if (value % 5 !== 0) errors.targetScore = 'Điểm TOEIC là bội số của 5.'
    else body.targetScore = value
  }
  const date = String(examDate ?? '').trim()
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) errors.examDate = 'Ngày thi không hợp lệ.'
    else if (date < today) errors.examDate = 'Ngày thi phải từ hôm nay trở đi.'
    else body.examDate = date
  }
  const daily = String(dailyMinutes ?? '').trim()
  if (daily) {
    const value = Number(daily)
    if (!Number.isInteger(value) || value < 5 || value > 600) errors.dailyMinutes = 'Số phút mỗi ngày từ 5 đến 600.'
    else body.dailyMinutes = value
  }
  return { errors, body }
}

// Tài khoản chưa từng lưu mục tiêu (GET /me/profile trả isSet = false) phải qua bước thiết lập ban đầu.
// Lỗi tải hoặc dữ liệu lạ không chặn người học (ví dụ database chưa chạy phần CHG-007).
export const needsOnboarding = (profile) => profile?.isSet === false

// Đang phải thiết lập ban đầu thì mọi trang (trừ /welcome) chuyển về /welcome.
export const ONBOARDING_PATH = '/welcome'
export function onboardingRedirect(status, pathname) {
  return status === 'required' && pathname !== ONBOARDING_PATH ? ONBOARDING_PATH : null
}

export const minutesLabel =(minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}` : `${Math.max(1, minutes || 0)} phút`)
