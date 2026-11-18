import { useEffect, useState } from 'react'
import { Pill } from '../../components/ui/Badges.jsx'
import { PageHero } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDateTime, formatMoney } from '../../lib/format.js'
import { useToast } from '../../providers/toastContext.js'
import { createVipOrder, getVipHistory, getVipOrders, getVipPlans, getVipStatus } from './services/vipApi.js'

const ORDER_STATUS = { PENDING: ['Chờ thanh toán', 'warning'], PAID: ['Đã thanh toán', 'success'], FAILED: ['Thất bại / hủy', 'danger'] }

function StatusCard({ me }) {
  if (me.isAdmin) return <section className="card"><h2 className="card-title"><Icon name="star" size={18} /> Quản trị viên</h2><p className="muted">Tài khoản quản trị có toàn quyền, không cần mua VIP.</p></section>
  if (me.isVip) return <section className="card"><h2 className="card-title"><Icon name="star" size={18} /> Bạn đang là VIP</h2><p>Hết hạn {formatDateTime(me.expiresAt)} · còn <b>{me.daysLeft}</b> ngày. Mua thêm gói để gia hạn nối tiếp.</p></section>
  return <section className="card"><h2 className="card-title">Tài khoản miễn phí</h2><p className="muted">Bạn dùng được mọi nội dung miễn phí. Nâng cấp VIP để mở khóa các bộ đề, từ vựng, Nghe và Đọc ở mức VIP.</p></section>
}

function OrderRow({ order, now }) {
  const expired = order.status === 'PENDING' && Date.parse(order.expiresAt) < now
  const [label, tone] = expired ? ['Hết hạn thanh toán', 'muted'] : ORDER_STATUS[order.status] || [order.status, 'muted']
  return (
    <tr>
      <td><code>{order.txnRef}</code></td><td>{order.planName}</td><td>{formatMoney(order.amount)}</td>
      <td><Pill tone={tone}>{label}</Pill></td><td className="muted small">{formatDateTime(order.paidAt || order.createdAt)}</td>
    </tr>
  )
}

// Lịch sử VIP: mua gói, được quản trị viên tặng, bị thu hồi. Không hiện lý do nội bộ hay người thực hiện.
const HISTORY_KIND = {
  PURCHASE: { icon: 'star', tone: 'success', label: 'Mua gói' },
  ADMIN_GRANT: { icon: 'sparkles', tone: 'accent', label: 'Được tặng' },
  ADMIN_REVOKE: { icon: 'alert-circle', tone: 'danger', label: 'Đã kết thúc' },
}

function HistoryItem({ item }) {
  const meta = HISTORY_KIND[item.kind] || { icon: 'clock', tone: 'muted', label: 'Thay đổi' }
  const title = item.kind === 'PURCHASE' ? `Mua ${item.planName || `gói ${item.days} ngày`}`
    : item.kind === 'ADMIN_GRANT' ? `Được quản trị viên tặng ${item.days} ngày VIP`
      : item.kind === 'ADMIN_REVOKE' ? 'VIP đã được quản trị viên kết thúc' : 'Thời hạn VIP thay đổi'
  return (
    <li className="vip-history-item" data-kind={item.kind}>
      <span className="vip-history-icon" aria-hidden="true"><Icon name={meta.icon} size={18} /></span>
      <div className="vip-history-body">
        <div className="vip-history-head"><b>{title}</b><Pill tone={meta.tone}>{meta.label}</Pill></div>
        <p className="muted small">
          {formatDateTime(item.createdAt)}
          {item.kind === 'PURCHASE' && item.amount != null && <> · {formatMoney(item.amount)}</>}
          {item.kind === 'ADMIN_GRANT' && <> · Miễn phí, không phát sinh thanh toán</>}
          {item.days && item.kind === 'PURCHASE' && <> · +{item.days} ngày</>}
          {item.txnRef && <> · Mã đơn <code>{item.txnRef}</code></>}
        </p>
        {(item.newExpiresAt || item.previousExpiresAt) && (
          <p className="small">
            {item.newExpiresAt ? <>Hạn VIP mới: <b>{formatDateTime(item.newExpiresAt)}</b></> : <>Hạn trước đó: {formatDateTime(item.previousExpiresAt)}</>}
            {item.newExpiresAt && item.previousExpiresAt && <span className="muted"> (nối tiếp từ {formatDateTime(item.previousExpiresAt)})</span>}
          </p>
        )}
      </div>
    </li>
  )
}

function VipHistory({ history }) {
  if (history === null) return <p className="muted">Chưa tải được lịch sử VIP. Hãy thử tải lại trang sau.</p>
  if (!history.length) return <p className="muted">Chưa có thay đổi VIP nào.</p>
  return <ol className="vip-history">{history.map((item) => <HistoryItem key={item.historyId} item={item} />)}</ol>
}

export default function VipPage() {
  useDocumentTitle('Nâng cấp VIP')
  const toast = useToast()
  const [buying, setBuying] = useState('')
  const [now] = useState(() => Date.now())
  const { data, error, loading, reload } = useAsync(async () => {
    // Lịch sử VIP tải riêng: backend chưa có (cũ hoặc chưa chạy phần F) thì vẫn hiện trang mua gói.
    const [plans, me, orders, history] = await Promise.all([getVipPlans(), getVipStatus(), getVipOrders(), getVipHistory().catch(() => null)])
    return { plans, me, orders, history }
  }, [])
  // Bấm Back từ cổng thanh toán có thể khôi phục trang từ bộ nhớ đệm (bfcache) với nút còn ở trạng thái "đang chuyển": đặt lại và tải mới.
  useEffect(() => {
    const restore = (event) => { if (event.persisted) { setBuying(''); reload() } }
    window.addEventListener('pageshow', restore)
    return () => window.removeEventListener('pageshow', restore)
  }, [reload])

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const { plans, me, orders, history } = data

  async function buy(plan) {
    setBuying(plan.code)
    try {
      const order = await createVipOrder(plan.code)
      window.location.assign(order.paymentUrl)           // chuyển sang cổng thanh toán VNPay
    } catch (failure) { setBuying(''); toast(failure.message, 'error', 5000) }
  }

  return (
    <div className="stack">
      <PageHero icon="star" eyebrow="VIP" title={<>Nâng cấp <em>VIP</em></>}>
        Thanh toán an toàn qua <b>VNPay</b> (thẻ ATM nội địa, QR, thẻ quốc tế). VIP được cộng ngay sau khi thanh toán thành công.
      </PageHero>
      <StatusCard me={me} />
      <h2 className="section-title" style={{ marginTop: 0 }}>Chọn gói</h2>
      {plans.length ? (
        <div className="exam-grid">
          {plans.map((plan) => (
            <article key={plan.code} className="exam-card">
              <h3>{plan.name}</h3>
              <p className="plan-price">{formatMoney(plan.priceVnd)}</p>
              <p className="muted small">{plan.durationDays} ngày · {formatMoney(Math.round((plan.priceVnd / plan.durationDays) * 30))}/tháng</p>
              {plan.description && <p className="small">{plan.description}</p>}
              <div className="exam-card-actions">
                <button type="button" className="btn btn-primary btn-sm" disabled={me.isAdmin || !!buying} onClick={() => buy(plan)}><Icon name="star" size={14} />{buying === plan.code ? 'Đang chuyển…' : `${me.isVip ? 'Gia hạn' : 'Mua'} gói này`}</button>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="card"><EmptyState>Hiện chưa có gói VIP nào đang bán.</EmptyState></div>}
      {!me.isAdmin && <><h2 className="section-title">Lịch sử VIP</h2><VipHistory history={history} /></>}
      <h2 className="section-title">Lịch sử thanh toán</h2>
      <p className="muted small">Chỉ gồm giao dịch qua VNPay. VIP do quản trị viên tặng không phải thanh toán nên chỉ có trong Lịch sử VIP.</p>
      {orders.items.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
            <tbody>{orders.items.map((order) => <OrderRow key={order.txnRef} order={order} now={now} />)}</tbody>
          </table>
        </div>
      ) : <p className="muted">Chưa có đơn thanh toán nào.</p>}
    </div>
  )
}
