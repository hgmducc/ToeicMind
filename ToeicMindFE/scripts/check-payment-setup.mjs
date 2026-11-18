// Kiểm tra nhanh cấu hình thanh toán VNPay trước khi test trên giao diện người học.
// Chạy: npm run check:payment   (đọc ../ToeicMind/.env; đổi bằng TOEICMIND_BACKEND_ENV; FE mặc định http://localhost:5173, đổi bằng FE_ORIGIN)
// Không bao giờ in TmnCode/HashSecret hay bất kỳ bí mật nào: chỉ báo "đã đặt" hoặc "trống".
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = process.env.TOEICMIND_BACKEND_ENV || path.resolve(root, '../ToeicMind/.env')
const feOrigin = (process.env.FE_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '')

const results = []
const add = (level, label, hint = '') => results.push({ level, label, hint })

function readEnv(file) {
  const values = {}
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const at = line.indexOf('=')
    values[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return values
}

async function probe(url, options) {
  try { return await fetch(url, { signal: AbortSignal.timeout(6000), ...options }) } catch { return null }
}

let env = null
if (!fs.existsSync(envPath)) add('fail', `Không tìm thấy ${envPath}`, 'Sao chép .env.example thành .env trong backend rồi điền khóa VNPay (Merchant Admin sandbox).')
else { env = readEnv(envPath); add('ok', 'Đọc được file .env của backend') }

let backend = 'http://localhost:5078'
if (env) {
  for (const key of ['VnPay__TmnCode', 'VnPay__HashSecret']) {
    if (env[key]) add('ok', `${key} đã đặt (ẩn giá trị)`)
    else add('fail', `${key} đang trống`, 'Lấy trong Merchant Admin của VNPay sandbox rồi đặt vào .env.')
  }
  const paymentUrl = env.VnPay__PaymentUrl || ''
  if (!paymentUrl) add('fail', 'VnPay__PaymentUrl trống', 'Sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
  else add(/sandbox/.test(paymentUrl) ? 'ok' : 'warn', `VnPay__PaymentUrl = ${paymentUrl}`, /sandbox/.test(paymentUrl) ? '' : 'Đang trỏ cổng thật (production): chỉ dùng khóa production.')

  const returnUrl = env.VnPay__ReturnUrl || ''
  if (!/^https?:\/\/[^/]+\/api\/vip\/vnpay-return\/?$/i.test(returnUrl)) add('fail', `VnPay__ReturnUrl không đúng dạng: "${returnUrl}"`, 'Phải là URL backend, ví dụ http://localhost:5078/api/vip/vnpay-return')
  else { add('ok', `VnPay__ReturnUrl = ${returnUrl}`); backend = new URL(returnUrl).origin }

  const result = env.VnPay__FrontendResultUrl || ''
  if (!result) add('warn', 'VnPay__FrontendResultUrl trống', `Backend sẽ trả JSON thay vì chuyển về giao diện. Đặt '${feOrigin}/vip/result' rồi khởi động lại backend.`)
  else if (result.replace(/\/+$/, '') === `${feOrigin}/vip/result`) add('ok', `VnPay__FrontendResultUrl = ${result} (trang kết quả của ToeicMindFE)`)
  else if (/#\/vip\/result/.test(result) && result.startsWith(feOrigin)) add('warn', `VnPay__FrontendResultUrl dùng hash: ${result}`, `Vẫn hoạt động (FE đổi hash sang đường dẫn) nhưng nên đặt '${feOrigin}/vip/result'.`)
  else add('fail', `VnPay__FrontendResultUrl = ${result}`, `Sau khi trả tiền trình duyệt sẽ không về ToeicMindFE. Đặt '${feOrigin}/vip/result' rồi khởi động lại backend.`)
}

// Backend đang chạy và có bảng VIP (GET công khai).
const plans = await probe(`${backend}/api/vip/plans`)
if (!plans) add('fail', `Không kết nối được backend ${backend}`, 'Chạy: dotnet run --launch-profile http (trong ../ToeicMind).')
else if (!plans.ok) add('fail', `GET ${backend}/api/vip/plans trả ${plans.status}`, 'Thường do database chưa có bảng VipPlan/PaymentOrder: chạy Docs/DATABASE/01_schema.sql (phần D — CHG-006) rồi khởi động lại backend.')
else {
  const list = await plans.json().catch(() => null)
  if (Array.isArray(list) && list.length) add('ok', `Backend sẵn sàng, đang bán ${list.length} gói VIP (${list.map((p) => p.code).join(', ')})`)
  else add('warn', 'Backend chạy nhưng chưa có gói VIP nào đang bán', 'Thêm gói ở Admin → VIP & Thanh toán (hoặc chạy lại 01_schema.sql để nạp 3 gói mặc định).')
}

// Giao diện: dev server và proxy /api.
const page = await probe(`${feOrigin}/`)
if (!page || !page.ok) add('warn', `Chưa mở được ${feOrigin}`, 'Chạy: npm run dev (trong ToeicMindFE).')
else {
  add('ok', `ToeicMindFE đang chạy tại ${feOrigin}`)
  const viaProxy = await probe(`${feOrigin}/api/vip/plans`)
  if (viaProxy?.ok) add('ok', 'Proxy /api của Vite tới backend hoạt động')
  else add('warn', 'Proxy /api của Vite chưa tới được backend', 'Kiểm tra VITE_API_PROXY_TARGET trong .env của ToeicMindFE (mặc định http://localhost:5078).')
}

const icon = { ok: '✓', warn: '!', fail: '✗' }
for (const r of results) console.log(`${icon[r.level]} ${r.label}${r.hint ? `\n    → ${r.hint}` : ''}`)
const failed = results.filter((r) => r.level === 'fail').length
console.log(failed
  ? `\n${failed} mục cần sửa trước khi test thanh toán.`
  : '\nSẵn sàng test: đăng nhập tại ' + `${feOrigin} → VIP → chọn gói → thanh toán trên VNPay sandbox (thẻ test nằm trong Docs/## Cấu hình (Sandbox).txt của backend) → tự quay về ${feOrigin}/vip/result.`)
process.exitCode = failed ? 1 : 0
