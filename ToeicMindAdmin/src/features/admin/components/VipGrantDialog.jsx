import { useEffect, useRef, useState } from 'react'
import { adjustUserVip, getUserVipHistory } from '../services/adminApi.js'

// Cấp/thu hồi VIP cho một người dùng, bắt buộc có lý do, kèm lịch sử VIP của người đó.
// Cộng thêm ngày nối tiếp hạn hiện tại (không làm mất ngày người dùng đã mua). Không tạo đơn thanh toán.

const DAY = 86400000
// Ngày trước, giờ sau: 31/01/2099 07:00 (giờ máy quản trị viên).
const pad = (n) => String(n).padStart(2, '0')
const fmt = (d) => {
  if (!d) return '—'
  const x = new Date(d)
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`
}
const KIND = { PURCHASE: 'Mua gói', ADMIN_GRANT: 'Quản trị viên tặng', ADMIN_REVOKE: 'Quản trị viên thu hồi' }
const QUICK_DAYS = [7, 30, 90, 365]
const QUICK_REASONS = ['Bù lỗi thanh toán', 'Tặng chương trình khuyến mãi', 'Hỗ trợ khiếu nại', 'Tài khoản kiểm thử nội bộ']

function History({ token, userId, version }) {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  useEffect(() => {
    let alive = true
    getUserVipHistory(token, userId)
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch((error) => alive && setState({ loading: false, items: [], error: error.message }))
    return () => { alive = false }
  }, [token, userId, version])
  if (state.loading) return <p className="muted" role="status">Đang tải lịch sử VIP…</p>
  if (state.error) return <p className="admin-notice" data-kind="error" role="alert">{state.error}</p>
  if (!state.items.length) return <p className="muted">Chưa có thay đổi VIP nào.</p>
  return (
    <div className="table-wrap vip-history-table">
      <table>
        <thead><tr><th>Thời gian</th><th>Loại</th><th>Thay đổi</th><th>Hạn mới</th><th>Lý do / đơn</th><th>Người thực hiện</th></tr></thead>
        <tbody>
          {state.items.map((h) => (
            <tr key={h.historyId} data-kind={h.kind}>
              <td>{fmt(h.createdAt)}</td>
              <td>{KIND[h.kind] || h.kind}</td>
              <td>{h.days ? `+${h.days} ngày` : h.kind === 'ADMIN_REVOKE' ? 'Kết thúc VIP' : '—'}</td>
              <td>{fmt(h.newExpiresAt)}</td>
              <td>{h.kind === 'PURCHASE' ? <>{h.planName || '—'}{h.txnRef && <div className="muted"><code>{h.txnRef}</code></div>}</> : h.reason || '—'}</td>
              <td>{h.kind === 'PURCHASE' ? 'Người dùng (VNPay)' : h.actorName || `#${h.actorUserId}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VipGrantDialog({ token, user, onClose, onDone }) {
  const ref = useRef(null)
  const lock = useRef(false)
  const [action, setAction] = useState('GRANT')
  const [days, setDays] = useState('30')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    return () => d.open && d.close()
  }, [])

  const active = user.isVip && user.vipExpiresAt && Date.parse(user.vipExpiresAt) > now
  const n = Number(days)
  const validDays = Number.isInteger(n) && n >= 1 && n <= 3660
  const preview = action === 'GRANT' && validDays ? new Date((active ? Date.parse(user.vipExpiresAt) : now) + n * DAY) : null

  async function submit(event) {
    event.preventDefault()
    const invalid = {}
    if (action === 'GRANT' && !validDays) invalid.days = 'Số ngày phải là số nguyên từ 1 đến 3660.'
    if (!reason.trim()) invalid.reason = 'Vui lòng nhập lý do.'
    else if (reason.trim().length > 300) invalid.reason = 'Lý do tối đa 300 ký tự.'
    if (action === 'REVOKE' && !active) invalid.action = 'Tài khoản đang không có VIP nên không có gì để thu hồi.'
    setErrors(invalid)
    setError('')
    if (Object.keys(invalid).length) { ref.current?.querySelector(`[name="${Object.keys(invalid)[0]}"]`)?.focus(); return }
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const entry = await adjustUserVip(token, user.userId, { action, days: n, reason: reason.trim() })
      setVersion((v) => v + 1)
      onDone(action === 'GRANT' ? `Đã cộng ${n} ngày VIP cho ${user.username}. Hạn mới: ${fmt(entry?.newExpiresAt)}.` : `Đã thu hồi VIP của ${user.username}.`)
    } catch (failure) {
      setError(failure.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="publish-dialog vip-grant-dialog" style={{ maxWidth: 'min(860px, 94vw)' }} aria-labelledby="vip-grant-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onClose() }} onClick={(e) => e.target === ref.current && !busy && onClose()}>
      <div className="modal-header">
        <h2 id="vip-grant-title">VIP của {user.username}</h2>
        <button type="button" className="modal-close-btn" disabled={busy} onClick={onClose} aria-label="Đóng">×</button>
      </div>
      <p className="muted">{active ? `Đang có VIP đến ${fmt(user.vipExpiresAt)}.` : 'Tài khoản chưa có VIP.'} Mọi thay đổi được ghi vào lịch sử VIP kèm lý do; không tạo đơn thanh toán.</p>
      <form onSubmit={submit} noValidate>
        {error && <div className="admin-notice" data-kind="error" role="alert">{error}</div>}
        <fieldset className="vip-grant-actions">
          <legend>Thao tác</legend>
          <label><input type="radio" name="action" value="GRANT" checked={action === 'GRANT'} onChange={() => { setAction('GRANT'); setErrors({}) }} /> Cộng thêm ngày VIP</label>
          <label><input type="radio" name="action" value="REVOKE" checked={action === 'REVOKE'} disabled={!active} onChange={() => { setAction('REVOKE'); setErrors({}) }} /> Thu hồi VIP ngay</label>
          {errors.action && <p className="account-error">{errors.action}</p>}
        </fieldset>
        {action === 'GRANT' && (
          <div className="account-field">
            <label htmlFor="vip-days">Số ngày cộng thêm (1–3660)</label>
            <input id="vip-days" name="days" type="number" min={1} max={3660} inputMode="numeric" value={days} aria-invalid={errors.days ? 'true' : undefined}
              aria-describedby="vip-days-hint" onChange={(e) => { setDays(e.target.value); setErrors((x) => ({ ...x, days: undefined })) }} />
            <div className="vip-quick" aria-label="Chọn nhanh số ngày">
              {QUICK_DAYS.map((d) => <button key={d} type="button" className="btn btn-sm btn-outline" aria-pressed={String(d) === days} onClick={() => setDays(String(d))}>{d} ngày</button>)}
            </div>
            <p className="account-hint muted" id="vip-days-hint">
              {preview ? <>Hạn mới dự kiến: <b>{fmt(preview)}</b>{active ? ' (cộng nối tiếp hạn hiện tại)' : ' (tính từ bây giờ)'}.</> : 'Nhập số ngày để xem hạn mới.'}
            </p>
            {errors.days && <p className="account-error">{errors.days}</p>}
          </div>
        )}
        <div className="account-field">
          <label htmlFor="vip-reason">Lý do (bắt buộc, chỉ quản trị viên xem được)</label>
          <textarea id="vip-reason" name="reason" rows={3} maxLength={300} value={reason} aria-invalid={errors.reason ? 'true' : undefined}
            onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: undefined })) }} />
          <div className="vip-quick" aria-label="Chọn nhanh lý do">
            {QUICK_REASONS.map((r) => <button key={r} type="button" className="btn btn-sm btn-outline" onClick={() => setReason(r)}>{r}</button>)}
          </div>
          {errors.reason && <p className="account-error">{errors.reason}</p>}
        </div>
        <div className="admin-actions modal-actions">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Đóng</button>
          <button type="submit" className={`btn ${action === 'REVOKE' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>
            {busy ? 'Đang lưu…' : action === 'REVOKE' ? 'Thu hồi VIP' : 'Cộng thêm ngày VIP'}
          </button>
        </div>
      </form>
      <h3 className="vip-history-title">Lịch sử VIP</h3>
      <History token={token} userId={user.userId} version={version} />
    </dialog>
  )
}
