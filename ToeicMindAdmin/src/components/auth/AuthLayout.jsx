import { Brand } from '../ui/Brand.jsx'
import { Icon } from '../ui/Icon.jsx'
import { AuthArtwork } from './AuthArtwork.jsx'
const currentYear = new Date().getFullYear()

export function AuthLayout({ variant = 'learner', children }) {
  const admin = variant === 'admin'
  return (
    <div className={`auth-shell ${admin ? 'auth-shell-admin' : 'auth-shell-learner'}`}>
      <a className="skip-link" href="#auth-content">Đi đến biểu mẫu</a>
      <aside className="story-panel" aria-label="Giới thiệu ToeicMind">
        <Brand admin={admin} />
        <div className="story-content">
          <div className="story-eyebrow"><span />{admin ? 'ĐỒNG HÀNH CÙNG NGƯỜI HỌC' : 'HỌC MỖI NGÀY. TIẾN XA HƠN.'}</div>
          <h2 className="story-title">{admin ? <>Nền tảng vững vàng.<br /><span>Hành trình rộng mở.</span></> : <>Một hành trình nhỏ.<br /><span>Một tương lai lớn.</span></>}</h2>
          <p className="story-description">{admin ? 'Chăm chút từng nội dung, kiến tạo trải nghiệm học tập tốt hơn cùng ToeicMind.' : 'Nuôi dưỡng thói quen học tiếng Anh, tự tin chinh phục mục tiêu TOEIC của bạn.'}</p>
          <AuthArtwork admin={admin} />
        </div>
        <div className="story-footer"><span className="story-footer-icon"><Icon name={admin ? 'shield' : 'book'} size={18} /></span><span>{admin ? 'Tận tâm với nội dung. Đồng hành cùng tiến bộ.' : 'Từ những điều nhỏ, tạo nên thay đổi lớn.'}</span><span className="story-footer-line" /></div>
      </aside>
      <div className="auth-main">
        <header className="auth-topbar"><div className="mobile-brand"><Brand admin={admin} /></div><span className="portal-label"><span />{admin ? 'CỔNG QUẢN TRỊ' : 'KHÔNG GIAN HỌC TẬP'}</span><span className="language-label">Tiếng Việt <span>VN</span></span></header>
        <main className="auth-content" id="auth-content" tabIndex={-1}><div className="auth-form-container">{children}</div></main>
        <footer className="auth-footer"><span>© {currentYear} ToeicMind</span><span>Made for your next chapter<span className="footer-flower">✳</span></span></footer>
      </div>
    </div>
  )
}
