import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DesktopOnly } from './components/DesktopOnly.jsx'

const router = createBrowserRouter([{ path: '*', Component: App }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DesktopOnly><RouterProvider router={router} /></DesktopOnly>
  </StrictMode>,
)
