import { useEffect, useRef, useState } from 'react'
import { usePagedList } from '../../exams/hooks/usePagedList.js'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import {
  changeAdminUserRole,
  createAdminUser,
  getAdminUserAttempts,
  getAdminUsers,
  getAdminUsersSummary,
  getAdminUserStats,
  lockAdminUser,
  revokeAdminUserSessions,
  unlockAdminUser,
} from '../services/adminApi.js'
import { FormDialog } from './FormDialog.jsx'
import { VipGrantDialog } from './VipGrantDialog.jsx'
import { Pagination } from './Pagination.jsx'

const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { hour12: false }) : '—')
const ROLE = { ADMIN: 'Quản trị', LEARNER: 'Học viên' }
const STATUS = { ACTIVE: 'Hoạt động', LOCKED: 'Bị khóa' }
const PAGE_SIZE = 10
const identity = [
  { key: 'username', label: 'Họ tên / tên hiển thị *', required: true, maxLength: 100 },
  { key: 'email', label: 'Email *', type: 'email', required: true, maxLength: 255 },
]

function UserStatsDialog({ token, user, onClose }) {
  const [data, setData] = useState(null),
    [error, setError] = useState('')
  useEffect(() => {
    Promise.all([getAdminUserStats(token, user.userId), getAdminUserAttempts(token, user.userId)])
      .then(([stats, attempts]) => setData({ stats, attempts: attempts.items }))
      .catch((e) => setError(e.message))
  }, [token, user.userId])
  const s = data?.stats
  const tiles = s && [
    [s.totalAttempts, 'Lượt làm'],
    [s.submittedAttempts, 'Đã nộp'],
    [s.answeredQuestions, 'Câu đã trả lời'],
    [s.accuracyPercent == null ? '—' : `${s.accuracyPercent}%`, 'Chính xác'],
    [s.bestTotalScaled ?? '—', 'Điểm tốt nhất'],
    [s.currentStreak, 'Chuỗi ngày'],
    [s.savedWordCount, 'Từ đã lưu'],
    [s.reportCount, 'Báo lỗi'],
  ]
  return (
    <FormDialog title={`Học tập của ${user.username}`} onClose={onClose} wide>
      <p className="muted">{user.email}</p>
      {error && <ApiNotice notice={{ kind: 'error', text: error }} />}
      {!data && !error && <p role="status">Đang tải thống kê…</p>}
      {s && (
        <>
          <div className="mini-kpi-grid">
            {tiles.map(([v, l]) => (
              <div className="mini-kpi" key={l}>
                <strong>{v}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <p className="muted">Học gần nhất: {s.lastStudyDate || 'chưa học'}</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Đã luyện</th>
                  <th>Đúng</th>
                  <th>Sai</th>
                  <th>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {s.parts.map((p) => (
                  <tr key={p.partNo}>
                    <td>
                      {p.partNo} · {p.partName}
                    </td>
                    <td>
                      {p.practicedCount}/{p.totalQuestions}
                    </td>
                    <td>{p.correctCount}</td>
                    <td>{p.wrongCount}</td>
                    <td>
                      <div className="progress-bar" role="img" aria-label={`${p.practicedCount} trên ${p.totalQuestions} câu`}>
                        <i style={{ width: `${p.totalQuestions ? Math.round((p.practicedCount * 100) / p.totalQuestions) : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="dialog-subtitle">Lượt làm gần đây</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đề</th>
                  <th>Chế độ</th>
                  <th>Trạng thái</th>
                  <th>Đúng</th>
                  <th>Điểm</th>
                  <th>Bắt đầu</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.length ? (
                  data.attempts.map((a) => (
                    <tr key={a.attemptId}>
                      <td>{a.examTitle || '(ngân hàng câu hỏi)'}</td>
                      <td>
                        {a.mode} · {a.scope}
                      </td>
                      <td>{a.status}</td>
                      <td>
                        {a.correctCount ?? '—'}/{a.totalQuestions}
                      </td>
                      <td>{a.totalScaled ?? '—'}</td>
                      <td>{fmt(a.startedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Chưa có lượt làm.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </FormDialog>
  )
}

export function UsersView({ session }) {
  const token = session.accessToken,
    me = session.user,
    lock = useRef(false)
  const [query, setQuery] = useState({ search: '', role: '', status: '', page: 1, pageSize: PAGE_SIZE })
  const [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null),
    [dialog, setDialog] = useState(null),
    [dialogError, setDialogError] = useState(''),
    [summary, setSummary] = useState(null)
  const users = usePagedList(getAdminUsers, token, query, reload)
  useEffect(() => {
    let active = true
    getAdminUsersSummary(token)
      .then((s) => active && setSummary(s))
      .catch(() => active && setSummary(null))
    return () => {
      active = false
    }
  }, [token, reload])
  const filter = (patch) => setQuery((q) => ({ ...q, ...patch, page: 1 }))

  async function run(action, success, { keepDialog = false } = {}) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setNotice(null)
    setDialogError('')
    try {
      await action()
      if (!keepDialog) setDialog(null)
      if (success) setNotice({ kind: 'success', text: success })
      setReload((n) => n + 1)
      return true
    } catch (error) {
      if (dialog) setDialogError(error.message)
      else setNotice(errorNotice(error))
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const open = (next) => {
    setDialogError('')
    setDialog(next)
  }
  const tiles = [
    ['Tổng', summary?.total],
    ['Học viên', summary?.learners],
    ['Quản trị', summary?.admins],
    ['Bị khóa', summary?.locked],
  ]
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">NGƯỜI DÙNG</p>
          <h2>Quản lý tài khoản</h2>
          <p className="muted">Khóa tài khoản để giữ lịch sử học tập. Không có xóa cứng.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => open({ type: 'create' })}>
          Tạo người dùng
        </button>
      </div>
      <ApiNotice notice={notice || (users.error && errorNotice(users.error))} />
      <div className="kpi-grid">
        {tiles.map(([label, value]) => (
          <div className="kpi-card" key={label}>
            <div>
              <div className="kpi-value">{value ?? '—'}</div>
              <div className="kpi-label">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <section className="admin-card">
        <div className="admin-actions">
          <label className="search-field">
            Tìm theo tên hoặc email
            <input type="search" maxLength={100} value={query.search} onChange={(e) => filter({ search: e.target.value })} />
          </label>
          <label>
            Vai trò
            <select value={query.role} onChange={(e) => filter({ role: e.target.value })}>
              <option value="">Tất cả</option>
              <option value="LEARNER">Học viên</option>
              <option value="ADMIN">Quản trị</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select value={query.status} onChange={(e) => filter({ status: e.target.value })}>
              <option value="">Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
          </label>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>VIP</th>
                <th>Đăng nhập bằng</th>
                <th>Phiên</th>
                <th>Tạo lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.loading ? (
                <tr>
                  <td colSpan={8}>Đang tải người dùng…</td>
                </tr>
              ) : !users.items.length ? (
                <tr>
                  <td colSpan={8}>{users.error ? 'Chưa tải được dữ liệu.' : 'Không có người dùng phù hợp.'}</td>
                </tr>
              ) : (
                users.items.map((u) => {
                  const self = me?.userId === u.userId
                  return (
                    <tr key={u.userId}>
                      <td>
                        <strong>{u.username}</strong>
                        {self && <span className="status-badge" data-status="SELF"> Bạn</span>}
                        <div className="muted">{u.email}</div>
                      </td>
                      <td>
                        <span className="status-badge" data-status={u.role}>
                          {ROLE[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" data-status={u.status}>
                          {STATUS[u.status] || u.status}
                        </span>
                      </td>
                      <td>
                        {u.role === 'ADMIN' ? (
                          <span className="muted">Toàn quyền</span>
                        ) : u.isVip ? (
                          <>
                            <span className="status-badge" data-status="VIP">VIP</span>
                            <div className="muted">đến {fmt(u.vipExpiresAt)}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{[u.hasPassword && 'Mật khẩu', u.hasGoogle && 'Google'].filter(Boolean).join(' + ') || '—'}</td>
                      <td>{u.activeSessionCount}</td>
                      <td>{fmt(u.createdAt)}</td>
                      <td>
                        <div className="admin-actions">
                          <button type="button" className="btn btn-sm btn-outline" disabled={busy || self} onClick={() => open({ type: 'role', user: u })}>
                            Đổi vai trò
                          </button>
                          {u.status === 'LOCKED' ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busy}
                              onClick={() => run(() => unlockAdminUser(token, u.userId), 'Đã mở khóa tài khoản.')}
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button type="button" className="btn btn-sm btn-danger" disabled={busy || self} onClick={() => open({ type: 'lock', user: u })}>
                              Khóa
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={busy || !u.activeSessionCount}
                            onClick={() => open({ type: 'kick', user: u })}
                          >
                            Đăng xuất thiết bị
                          </button>
                          {u.role !== 'ADMIN' && (
                            <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => open({ type: 'vip', user: u })}>
                              Cấp VIP
                            </button>
                          )}
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => open({ type: 'stats', user: u })}>
                            Thống kê học
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={query.page}
          total={users.totalCount}
          pageSize={PAGE_SIZE}
          loading={users.loading}
          onChange={(page) => setQuery((q) => ({ ...q, page }))}
        />
      </section>

      {dialog?.type === 'create' && (
        <FormDialog
          title="Tạo người dùng"
          submitLabel="Tạo tài khoản"
          busy={busy}
          error={dialogError}
          initial={{ role: 'LEARNER' }}
          fields={[
            ...identity,
            { key: 'password', label: 'Mật khẩu * (6–72 ký tự)', type: 'password', required: true, maxLength: 72 },
            {
              key: 'role',
              label: 'Vai trò',
              type: 'select',
              options: [
                ['LEARNER', 'Học viên'],
                ['ADMIN', 'Quản trị'],
              ],
            },
          ]}
          onClose={() => setDialog(null)}
          onSubmit={(v) => run(() => createAdminUser(token, { ...v, username: v.username.trim(), email: v.email.trim() }), 'Đã tạo người dùng.', { keepDialog: false })}
        />
      )}
      {['role', 'lock', 'kick'].includes(dialog?.type) &&
        (() => {
          const u = dialog.user,
            to = u.role === 'ADMIN' ? 'LEARNER' : 'ADMIN'
          const cfg = {
            role: [
              'Đổi vai trò',
              `Đổi ${u.email} từ ${ROLE[u.role]} sang ${ROLE[to]}? Người này sẽ bị đăng xuất khỏi mọi thiết bị.`,
              () => changeAdminUserRole(token, u.userId, to),
              'Đã đổi vai trò.',
            ],
            lock: [
              'Khóa tài khoản',
              `Khóa ${u.email}? Người này bị đăng xuất ngay và không thể đăng nhập cho đến khi được mở khóa.`,
              () => lockAdminUser(token, u.userId),
              'Đã khóa tài khoản.',
            ],
            kick: [
              'Đăng xuất thiết bị',
              `Đăng xuất ${u.email} khỏi mọi thiết bị?`,
              () => revokeAdminUserSessions(token, u.userId),
              'Đã thu hồi mọi phiên đăng nhập.',
            ],
          }[dialog.type]
          return (
            <FormDialog
              title={cfg[0]}
              submitLabel="Xác nhận"
              busy={busy}
              error={dialogError}
              onClose={() => setDialog(null)}
              onSubmit={() => run(cfg[2], cfg[3])}
            >
              <p>{cfg[1]}</p>
            </FormDialog>
          )
        })()}
      {dialog?.type === 'vip' && (
        <VipGrantDialog
          token={token}
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={(text) => { setDialog(null); setNotice({ kind: 'success', text }); setReload((n) => n + 1) }}
        />
      )}
      {dialog?.type === 'stats' && <UserStatsDialog token={token} user={dialog.user} onClose={() => setDialog(null)} />}
    </div>
  )
}
