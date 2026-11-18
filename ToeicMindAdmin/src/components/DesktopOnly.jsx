import { useSyncExternalStore } from 'react'

const desktopQuery = window.matchMedia('(min-width: 1024px)')
let snapshot = { desktop: desktopQuery.matches, enabled: desktopQuery.matches }
const subscribe = (notify) => {
  const update = () => {
    snapshot = { desktop: desktopQuery.matches, enabled: snapshot.enabled || desktopQuery.matches }
    notify()
  }
  desktopQuery.addEventListener('change', update)
  return () => desktopQuery.removeEventListener('change', update)
}

export function DesktopOnly({ children }) {
  const { desktop, enabled } = useSyncExternalStore(subscribe, () => snapshot)
  return (
    <>
    <div className="desktop-app" hidden={!desktop} inert={!desktop}>{enabled && children}</div>
    {!desktop && <main className="desktop-required">
      <div className="desktop-required-card">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="6" y="10" width="52" height="35" rx="5" stroke="currentColor" strokeWidth="3" /><path d="M22 55h20M32 45v10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        <p className="eyebrow">TOEICMIND ADMIN</p>
        <h1>Vui lòng sử dụng máy tính</h1>
        <p>Trang quản trị được thiết kế cho máy tính. Hãy mở bằng trình duyệt trên máy tính với cửa sổ rộng từ 1024px để tiếp tục.</p>
      </div>
    </main>}
    </>
  )
}
