import { useState } from 'react'
import { Brand } from '../../../components/ui/Brand.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'

const navItems = [
  ['dashboard', 'Tổng quan', 'sparkles'], ['exams', 'Bộ đề & Đề thi', 'layers'],
  ['upload', 'Tải lên & Biên soạn', 'book'], ['directions', 'Hướng dẫn', 'headphones'],
  ['media', 'Media', 'copy'], ['catalog', 'Danh mục', 'shield'], ['grammar', 'Bài ngữ pháp', 'text'],
  ['listening', 'Clip nghe sưu tầm', 'volume'], ['placement', 'Kiểm tra đầu vào', 'target'],
  ['users', 'Người dùng', 'user'], ['vip', 'VIP & Thanh toán', 'sparkles'], ['reports', 'Báo lỗi', 'alert-circle'],
  ['user_info', 'Tài khoản Admin', 'user'],
]

export function AdminLayout({ session, activeView, onNavigate, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const user = session.user
  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <aside id="admin-sidebar" className="admin-sidebar">
        <div className="admin-sidebar-header">
          <button type="button" className="admin-brand-button" aria-label="ToeicMind Admin — Tổng quan" title="ToeicMind Admin" onClick={() => onNavigate('dashboard')}><Brand admin /></button>
          <button type="button" className="sidebar-collapse" aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} aria-expanded={!collapsed} aria-controls="admin-sidebar" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}><Icon name={collapsed ? 'arrow-right' : 'arrow-left'} size={16} /></button>
        </div>
        <nav className="admin-nav" aria-label="Menu quản trị">
          {navItems.map(([id, label, icon]) => <button key={id} type="button" className="admin-nav-item" data-active={activeView === id} aria-current={activeView === id ? 'page' : undefined} aria-label={label} title={collapsed ? label : undefined} onClick={() => onNavigate(id)}><Icon name={icon} size={19} /><span className="admin-nav-label">{label}</span></button>)}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" className="admin-user-pill" title={user.username || 'Tài khoản Admin'} aria-label="Thông tin tài khoản Admin" onClick={() => onNavigate('user_info')}>
            <div className="admin-avatar">{(user.username || 'A').charAt(0).toUpperCase()}</div>
            <div className="admin-user-meta"><div className="admin-user-name">{user.username || 'Admin'}</div><div className="admin-user-role">Quản trị viên</div></div>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left"><span className="topbar-workspace">Không gian quản trị</span><span className="topbar-divider">/</span><h1 className="admin-page-title">{navItems.find(([id]) => id === activeView)?.[1] || 'Tổng quan'}</h1></div>
          <div className="admin-topbar-right">
            <button type="button" className="btn btn-sm btn-outline topbar-icon" onClick={() => onNavigate('user_info')} title="Xem thông tin tài khoản" aria-label="Xem thông tin tài khoản"><Icon name="user" size={18} /></button>
            <button type="button" className="btn btn-sm btn-outline topbar-icon" onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="log-out" size={18} /></button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
