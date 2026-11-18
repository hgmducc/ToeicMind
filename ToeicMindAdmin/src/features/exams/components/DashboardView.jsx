import { useEffect, useState } from 'react'
import { getAdminExams } from '../services/examService.js'
import { getAdminDashboard } from '../../admin/services/adminApi.js'
import { ApiNotice } from './ApiNotice.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'

const number = (value) => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)
const percent = (value) => value == null ? '—' : `${number(value)}%`

export function DashboardView({ session, onNavigate }) {
  const [days, setDays] = useState(30)
  const [minAnswers, setMinAnswers] = useState(5)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    let active = true
    async function load() {
      setResult({ loading: true, data: null, error: '' })
      try {
        const [dashboard, recent] = await Promise.all([
          getAdminDashboard(session.accessToken, { days, limit: 5, minAnswers: Math.max(1, Number(minAnswers) || 5) }),
          getAdminExams(session.accessToken, { pageSize: 5 }),
        ])
        const { summary, activity, popularExams: popular, hardestQuestions: hardest } = dashboard
        if (active) setResult({ loading: false, data: { summary, activity, popular, hardest, recent: recent.items }, error: '' })
      } catch (error) {
        if (active) setResult({ loading: false, data: null, error: error.message })
      }
    }
    void load()
    return () => { active = false }
  }, [session.accessToken, days, minAnswers, reload])
  const { data, loading, error } = result
  const s = data?.summary
  const points = data?.activity || []
  const max = Math.max(1, ...points.map((point) => Math.max(point.attempts, point.newUsers)))
  const tiles = [
    ['Người dùng', number(s?.users.total), 'user', `${number(s?.users.newLast7Days)} tài khoản mới trong 7 ngày`],
    ['Kho đề thi', number(s?.exams.exams), 'layers', `${number(s?.exams.sets)} bộ đề · ${number(s?.exams.published)} đã xuất bản`],
    ['Lượt làm bài', number(s?.attempts.total), 'book', `${number(s?.attempts.submitted)} đã nộp · ${number(s?.attempts.inProgress)} đang làm`],
    ['Điểm TOEIC trung bình', number(s?.averageTotalScaled), 'sparkles', `Độ chính xác trung bình ${percent(s?.averageAccuracyPercent)}`],
  ]
  return (
    <div className="dashboard" aria-busy={loading}>
      <div className="dashboard-heading">
        <div><p className="eyebrow">TỔNG QUAN HỆ THỐNG</p><h2>Xin chào, {session.user.username || 'Quản trị viên'}</h2><p className="muted">Theo dõi hoạt động học tập và quản lý nội dung tại một nơi.</p></div>
        <div className="dashboard-toolbar"><button className="btn btn-outline" disabled={loading} onClick={() => setReload((n) => n + 1)}><Icon name="refresh-cw" size={16} />Tải lại</button><button className="btn btn-primary" onClick={() => onNavigate('upload')}><Icon name="arrow-up-right" size={16} />Nhập đề mới</button></div>
      </div>
      {error && <ApiNotice notice={{ kind: 'error', text: error }} />}
      {loading && <p className="dashboard-loading" role="status">Đang tải dữ liệu tổng quan…</p>}
      <div className="dashboard-kpis">{tiles.map(([label, value, icon, note]) => <article className="dashboard-kpi" key={label}><div className="dashboard-kpi-label"><span>{label}</span><Icon name={icon} size={19} /></div><strong className="kpi-value">{value}</strong><p>{note}</p></article>)}</div>
      <div className="dashboard-main-grid">
        <section className="admin-card dashboard-activity">
          <div className="admin-card-header"><div><h3>Hoạt động học tập</h3><p className="muted">Lượt làm bài và người dùng mới theo ngày (UTC)</p></div><label className="dashboard-period"><span className="sr-only">Khoảng thời gian hoạt động</span><select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 ngày qua</option><option value={30}>30 ngày qua</option><option value={90}>90 ngày qua</option></select></label></div>
          <div className="dashboard-activity-totals"><div><strong>{number(data && points.reduce((sum, p) => sum + p.attempts, 0))}</strong><span>Lượt làm trong kỳ</span></div><div><strong>{number(s?.activeLearnersLast7Days)}</strong><span>Học viên hoạt động 7 ngày</span></div></div>
          {points.length ? <><div className="bar-chart" role="img" aria-label={`Hoạt động trong ${points.length} ngày. Đỉnh ${max} lượt.`}>{points.map((point) => <div className="bar-col" key={point.date} title={`${point.date}: ${point.attempts} lượt làm, ${point.newUsers} người dùng mới, ${point.activeLearners} học viên hoạt động`}><i data-series="a" style={{ height: `${point.attempts * 100 / max}%` }} /><i data-series="b" style={{ height: `${point.newUsers * 100 / max}%` }} /></div>)}</div><div className="chart-axis"><span>{points[0].date}</span><span>{points.at(-1).date}</span></div></> : <p className="admin-empty">{loading ? 'Đang tải biểu đồ…' : error ? 'Chưa tải được dữ liệu hoạt động.' : 'Chưa có dữ liệu hoạt động trong kỳ này.'}</p>}
          <p className="chart-legend"><i className="legend-dot" data-series="a" /> Lượt làm bài <i className="legend-dot" data-series="b" /> Người dùng mới</p>
        </section>
        <section className="dashboard-workspace"><p className="eyebrow">CẦN QUAN TÂM</p><h3>Công việc quản trị</h3><button className="dashboard-task" onClick={() => onNavigate('reports')}><span className="dashboard-task-icon"><Icon name="alert-circle" /></span><span><strong>{number(s?.newReports)} báo lỗi mới</strong><small>Kiểm tra phản hồi từ học viên</small></span><Icon name="arrow-right" size={16} /></button><button className="dashboard-task" onClick={() => onNavigate('exams')}><span className="dashboard-task-icon"><Icon name="layers" /></span><span><strong>{number(s?.exams.draft)} đề đang soạn</strong><small>Rà soát nội dung trước khi xuất bản</small></span><Icon name="arrow-right" size={16} /></button><button className="dashboard-task" onClick={() => onNavigate('directions')}><span className="dashboard-task-icon"><Icon name="headphones" /></span><span><strong>Bộ hướng dẫn chung</strong><small>Quản lý văn bản, audio và ảnh Part 1</small></span><Icon name="arrow-right" size={16} /></button></section>
      </div>
      <div className="dashboard-tables">
        <section className="admin-card"><div className="admin-card-header"><h3>Đề thi trong hệ thống</h3><button className="dashboard-text-link" onClick={() => onNavigate('exams')}>Xem tất cả <Icon name="arrow-right" size={14} /></button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đề thi</th><th>Mã đề</th><th>Trạng thái</th></tr></thead><tbody>{data?.recent.map((exam) => <tr key={exam.examId}><td><strong>{exam.title}</strong></td><td>{exam.examCode}</td><td><span className="status-badge" data-status={exam.status}>{exam.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}</span></td></tr>)}{!data?.recent.length && <tr><td colSpan={3}>{loading ? 'Đang tải…' : error ? 'Chưa tải được danh sách đề.' : 'Chưa có đề thi.'}</td></tr>}</tbody></table></div></section>
        <section className="admin-card"><div className="admin-card-header"><h3>Đề được làm nhiều nhất</h3><span className="dashboard-caption">Toàn thời gian</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đề</th><th>Lượt làm</th><th>Đã nộp</th><th>Đúng TB</th><th>Điểm TB</th></tr></thead><tbody>{data?.popular.map((exam) => <tr key={exam.examId ?? exam.examCode}><td><strong>{exam.examCode}</strong><div className="muted">{exam.title}</div></td><td>{number(exam.attempts)}</td><td>{number(exam.submittedAttempts)}</td><td>{percent(exam.averageCorrectPercent)}</td><td>{number(exam.averageTotalScaled)}</td></tr>)}{!data?.popular.length && <tr><td colSpan={5}>{loading ? 'Đang tải…' : error ? 'Chưa tải được thống kê.' : 'Chưa có lượt làm bài.'}</td></tr>}</tbody></table></div></section>
      </div>
      <section className="admin-card"><div className="admin-card-header"><div><h3>Câu hỏi cần theo dõi</h3><p className="muted">Các câu có tỷ lệ trả lời sai cao nhất</p></div><label className="dashboard-threshold">Số lượt trả lời tối thiểu<input type="number" min={1} value={minAnswers} onChange={(e) => setMinAnswers(e.target.value)} /></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Câu hỏi</th><th>Part</th><th>Lượt trả lời</th><th>Trả lời sai</th><th>Tỷ lệ sai</th></tr></thead><tbody>{data?.hardest.map((q) => <tr key={q.questionId}><td>{q.examCode} · Câu {q.questionNo}</td><td>Part {q.partNo}</td><td>{number(q.answers)}</td><td>{number(q.wrongAnswers)}</td><td>{percent(q.wrongPercent)}<div className="progress-bar" data-tone="danger"><i style={{ width: `${q.wrongPercent}%` }} /></div></td></tr>)}{!data?.hardest.length && <tr><td colSpan={5}>{loading ? 'Đang tải…' : error ? 'Chưa tải được thống kê câu hỏi.' : 'Chưa đủ dữ liệu để thống kê.'}</td></tr>}</tbody></table></div></section>
    </div>
  )
}
