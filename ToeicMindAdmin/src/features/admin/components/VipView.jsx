import { useCallback, useEffect, useRef, useState } from 'react'
import { usePagedList } from '../../exams/hooks/usePagedList.js'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import { createVipPlan, getVipOrders, getVipPlans, updateVipPlan } from '../services/adminApi.js'
import { FormDialog } from './FormDialog.jsx'
import { Pagination } from './Pagination.jsx'

const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { hour12: false }) : '—')
const money = (v) => `${new Intl.NumberFormat('vi-VN').format(v)} ₫`
const ORDER_STATUS = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thất bại / hủy' }
const BADGE = { PENDING: 'NEW', PAID: 'ACTIVE', FAILED: 'LOCKED' }
const PAGE_SIZE = 10

const planFields = [
  { key: 'code', label: 'Mã gói * (chữ, số, _ hoặc -)', required: true, maxLength: 30 },
  { key: 'name', label: 'Tên gói *', required: true, maxLength: 100 },
  { key: 'description', label: 'Mô tả', type: 'textarea', maxLength: 500 },
  { key: 'durationDays', label: 'Thời hạn (ngày) *', type: 'number', required: true, min: 1, max: 3660 },
  { key: 'priceVnd', label: 'Giá (VND, tối thiểu 5.000) *', type: 'number', required: true, min: 5000, max: 100000000 },
  { key: 'sortOrder', label: 'Thứ tự hiển thị', type: 'number', min: 0, max: 1000 },
  {
    key: 'isActive',
    label: 'Trạng thái bán',
    type: 'select',
    options: [
      ['true', 'Đang bán'],
      ['false', 'Tạm tắt'],
    ],
  },
]

// Quản trị VIP: gói bán và đơn thanh toán VNPay. Quyền Miễn phí/VIP của từng bộ đề đặt ở "Bộ đề & Đề thi".
export function VipView({ session }) {
  const token = session.accessToken,
    lock = useRef(false)
  const [plans, setPlans] = useState({ loading: true, items: [], error: null })
  const [query, setQuery] = useState({ status: '', page: 1, pageSize: PAGE_SIZE })
  const [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null),
    [dialog, setDialog] = useState(null),
    [dialogError, setDialogError] = useState('')
  const orders = usePagedList(getVipOrders, token, query, reload)

  const loadPlans = useCallback(async () => {
    try {
      setPlans({ loading: false, items: await getVipPlans(token), error: null })
    } catch (error) {
      setPlans({ loading: false, items: [], error })
    }
  }, [token])
  useEffect(() => {
    void loadPlans()
  }, [loadPlans, reload])

  async function save(values) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setDialogError('')
    const body = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || null,
      durationDays: Number(values.durationDays),
      priceVnd: Number(values.priceVnd),
      sortOrder: Number(values.sortOrder) || 0,
      isActive: values.isActive === 'true',
    }
    try {
      if (dialog.plan) await updateVipPlan(token, dialog.plan.planId, body)
      else await createVipPlan(token, body)
      setDialog(null)
      setNotice({ kind: 'success', text: 'Đã lưu gói VIP.' })
      setReload((n) => n + 1)
    } catch (error) {
      setDialogError(error.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const plan = dialog?.plan
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">VIP</p>
          <h2>VIP &amp; Thanh toán</h2>
          <p className="muted">
            Quản lý gói bán và đơn VNPay. Đặt quyền Miễn phí/VIP cho từng bộ đề (đề thi, từ vựng, Nghe, Đọc) ở mục “Bộ đề &amp; Đề thi”; cấp VIP thủ công ở mục “Người dùng”.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setReload((n) => n + 1)}>
          Tải lại
        </button>
      </div>
      <ApiNotice notice={notice || (plans.error && errorNotice(plans.error)) || (orders.error && errorNotice(orders.error))} />

      <section className="admin-card">
        <div className="admin-card-header">
          <h3>Gói VIP</h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDialogError('')
              setDialog({ plan: null })
            }}
          >
            Thêm gói
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gói</th>
                <th>Thời hạn</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {plans.loading ? (
                <tr>
                  <td colSpan={5}>Đang tải gói VIP…</td>
                </tr>
              ) : !plans.items.length ? (
                <tr>
                  <td colSpan={5}>Chưa có gói VIP. Bấm “Thêm gói” để tạo.</td>
                </tr>
              ) : (
                plans.items.map((p) => (
                  <tr key={p.planId}>
                    <td>
                      <strong>{p.name}</strong> <code>{p.code}</code>
                      {p.description && <div className="muted">{p.description}</div>}
                    </td>
                    <td>{p.durationDays} ngày</td>
                    <td>{money(p.priceVnd)}</td>
                    <td>
                      <span className="status-badge" data-status={p.isActive ? 'ACTIVE' : 'LOCKED'}>
                        {p.isActive ? 'Đang bán' : 'Tạm tắt'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setDialogError('')
                          setDialog({ plan: p })
                        }}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h3>Đơn thanh toán</h3>
        </div>
        <div className="admin-actions">
          <label>
            Trạng thái
            <select value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))}>
              <option value="">Tất cả</option>
              {Object.entries(ORDER_STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã đơn (VNPay)</th>
                <th>Người mua</th>
                <th>Gói</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngân hàng / Mã GD</th>
                <th>Tạo lúc</th>
                <th>Thanh toán lúc</th>
              </tr>
            </thead>
            <tbody>
              {orders.loading ? (
                <tr>
                  <td colSpan={8}>Đang tải đơn…</td>
                </tr>
              ) : !orders.items.length ? (
                <tr>
                  <td colSpan={8}>{orders.error ? 'Chưa tải được dữ liệu.' : 'Chưa có đơn thanh toán.'}</td>
                </tr>
              ) : (
                orders.items.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <code>{o.txnRef}</code>
                    </td>
                    <td>{o.userEmail || `#${o.userId}`}</td>
                    <td>{o.planName}</td>
                    <td>{money(o.amount)}</td>
                    <td>
                      <span className="status-badge" data-status={BADGE[o.status]}>
                        {ORDER_STATUS[o.status] || o.status}
                      </span>
                    </td>
                    <td>{[o.bankCode, o.transactionNo].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{fmt(o.createdAt)}</td>
                    <td>{fmt(o.paidAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={query.page}
          total={orders.totalCount}
          pageSize={PAGE_SIZE}
          loading={orders.loading}
          onChange={(page) => setQuery((q) => ({ ...q, page }))}
        />
      </section>

      {dialog && (
        <FormDialog
          title={plan ? `Sửa gói ${plan.name}` : 'Thêm gói VIP'}
          busy={busy}
          error={dialogError}
          initial={
            plan
              ? { ...plan, description: plan.description || '', isActive: String(plan.isActive) }
              : { durationDays: '30', priceVnd: '99000', sortOrder: '0', isActive: 'true' }
          }
          fields={planFields}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      )}
    </div>
  )
}
