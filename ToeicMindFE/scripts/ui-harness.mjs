// Hạ tầng chung cho các kịch bản kiểm thử giao diện: backend giả + Vite dev server + Chromium (Playwright).
// Cần Playwright: đặt PLAYWRIGHT_MODULE (đường dẫn package) hoặc cài sẵn; PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH nếu cần chọn Chromium.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { start as startMock } from './mock-learner-api.mjs'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Cổng đổi được khi 5078/5173 đang bận (ví dụ backend/Vite thật đang chạy): UI_API_PORT, UI_WEB_PORT.
export const API_PORT = Number(process.env.UI_API_PORT) || 5078
export const WEB_PORT = Number(process.env.UI_WEB_PORT) || 5173
export const WEB = `http://localhost:${WEB_PORT}`
export const API = `http://localhost:${API_PORT}`

async function waitFor(url, ms = 30000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const res = await fetch(url); if (res.ok) return } catch { /* chưa sẵn sàng */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Không khởi động được ${url}`)
}

export async function launch({ extraHandlers = [], viewport = { width: 1280, height: 900 } } = {}) {
  const mock = await startMock(API_PORT, extraHandlers)
  const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', String(WEB_PORT), '--strictPort'], { cwd: root, stdio: 'ignore', env: { ...process.env, VITE_API_PROXY_TARGET: API } })
  await waitFor(WEB)
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const problems = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.startsWith('Failed to load resource') || text.includes('accounts.google.com')) return
    problems.push(`console: ${text}`)
  })
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){}}}}' }))
  const close = async () => { await browser.close(); vite.kill(); mock.server.close() }
  return { page, context, browser, mock, problems, close, state: mock.state }
}

export async function login(page) {
  await page.goto(`${WEB}/`)
  await page.locator('input[name=email]').fill('learner@example.com')
  await page.locator('input[name=password]').fill('secret123')
  await page.locator('form.auth-form .submit-button').click()
  await page.getByRole('heading', { name: /Xin chào/ }).waitFor()
}
