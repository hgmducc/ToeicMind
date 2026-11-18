import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { legacyHashToPath } from './routes/learnerRoutes.js'
import { ConfirmProvider } from './providers/ConfirmProvider.jsx'
import { ToastProvider } from './providers/ToastProvider.jsx'

// Liên kết hash của giao diện HTML cũ (ví dụ trang kết quả VNPay cấu hình #/vip/result) vẫn mở đúng trang.
const legacy = legacyHashToPath(window.location.hash, window.location.pathname)
if (legacy) window.history.replaceState(null, '', legacy)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
