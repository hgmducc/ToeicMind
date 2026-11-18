import { Link, useSearchParams } from 'react-router-dom'
import { Loading } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDateTime } from '../../lib/format.js'
import { getVipStatus } from './services/vipApi.js'

const VIEW = {
  PAID: ['Thanh toán thành công', 'Tài khoản của bạn đã được nâng cấp VIP. Chúc bạn học tốt!', 'ok-text'],
  FAILED: ['Thanh toán chưa hoàn tất', 'Giao dịch bị hủy hoặc không thành công. Bạn chưa bị trừ tiền cho đơn này; có thể thử lại.', 'bad-text'],
  PENDING: ['Đang chờ xác nhận', 'Giao dịch chưa được xác nhận. Vui lòng kiểm tra lại lịch sử thanh toán sau ít phút.', ''],
  NOT_FOUND: ['Không tìm thấy đơn', 'Không tìm thấy đơn thanh toán tương ứng.', 'bad-text'],
  INVALID: ['Dữ liệu không hợp lệ', 'Không xác thực được phản hồi từ cổng thanh toán. Nếu bạn đã bị trừ tiền, hãy liên hệ quản trị viên kèm mã đơn.', 'bad-text'],
}

// Backend chuyển hướng về đây sau khi VNPay đưa trình duyệt về (?status=PAID|FAILED|INVALID|NOT_FOUND&txnRef=...).
export default function VipResultPage() {
  useDocumentTitle('Kết quả thanh toán')
  const [params] = useSearchParams()
  const status = params.get('status') || 'INVALID'
  const [title, text, tone] = VIEW[status] || ['Dữ liệu không hợp lệ', 'Không xác định được kết quả thanh toán.', 'bad-text']
  const { data: me, loading } = useAsync(async () => (status === 'PAID' ? getVipStatus().catch(() => null) : null), [status])
  if (loading) return <Loading />
  return (
    <section className="card state-box">
      <h1 className={`state-title ${tone}`}>{title}</h1>
      <p>{text}</p>
      {params.get('txnRef') && <p className="muted small">Mã đơn: <code>{params.get('txnRef')}</code></p>}
      {me?.isVip && <p>VIP đến <b>{formatDateTime(me.expiresAt)}</b> (còn {me.daysLeft} ngày).</p>}
      <div className="state-actions"><Link className="btn btn-primary" to="/tests">Làm đề thi</Link><Link className="btn btn-outline" to="/vip">Về trang VIP</Link></div>
    </section>
  )
}
