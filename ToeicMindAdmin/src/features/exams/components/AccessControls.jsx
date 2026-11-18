// Quyền truy cập nội dung: Miễn phí (mọi tài khoản đã đăng nhập) hoặc VIP (trả phí). Dùng chung cho bộ đề, đề và trang nhập đề.
export const ACCESS_LABEL = { FREE: 'Miễn phí', VIP: 'VIP' }

// Quyền theo từng tính năng của một bộ đề (tách riêng để ví dụ bộ đề VIP nhưng từ vựng miễn phí).
export const SET_ACCESS_FIELDS = [
  ['examAccess', 'Làm đề thi'],
  ['vocabAccess', 'Từ vựng'],
  ['listeningAccess', 'Nghe (Nghe chép, Part 1–4)'],
  ['readingAccess', 'Đọc (Part 5–7, Ngữ pháp)'],
]

export const DEFAULT_SET_ACCESS = Object.freeze({
  examAccess: 'FREE',
  vocabAccess: 'FREE',
  listeningAccess: 'FREE',
  readingAccess: 'FREE',
})

export const pickSetAccess = (set) =>
  Object.fromEntries(SET_ACCESS_FIELDS.map(([key]) => [key, set?.[key] || 'FREE']))

export function AccessBadge({ value }) {
  const v = value === 'VIP' ? 'VIP' : 'FREE'
  return (
    <span className="status-badge" data-status={v}>
      {ACCESS_LABEL[v]}
    </span>
  )
}

// Bốn ô chọn quyền của bộ đề.
export function SetAccessFields({ value, onChange }) {
  return SET_ACCESS_FIELDS.map(([key, label]) => (
    <label key={key}>
      {label}
      <select value={value?.[key] || 'FREE'} onChange={(e) => onChange({ ...value, [key]: e.target.value })}>
        <option value="FREE">Miễn phí</option>
        <option value="VIP">VIP (trả phí)</option>
      </select>
    </label>
  ))
}

// Tóm tắt quyền của bộ đề trong bảng.
export function SetAccessBadges({ set }) {
  return (
    <div className="access-badges">
      {SET_ACCESS_FIELDS.map(([key, label]) => (
        <div key={key}>
          <small className="muted">{label.split(' (')[0]}: </small>
          <AccessBadge value={set[key]} />
        </div>
      ))}
    </div>
  )
}