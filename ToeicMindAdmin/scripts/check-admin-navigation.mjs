import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const base = process.env.ADMIN_UI_URL || 'http://127.0.0.1:5174'
const learner = { userId: 1001, username: 'Học viên kiểm thử', email: 'learner-ui@example.test', role: 'LEARNER', status: 'ACTIVE', hasPassword: true, isVip: true, vipExpiresAt: '2099-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }
const vipHistory = [
  { historyId: 2, kind: 'ADMIN_GRANT', days: 15, previousExpiresAt: '2098-12-17T00:00:00Z', newExpiresAt: '2099-01-01T00:00:00Z', createdAt: '2026-11-10T00:00:00Z', reason: 'Tặng sự kiện', actorUserId: 999, actorName: 'Quản trị kiểm thử' },
  { historyId: 1, kind: 'PURCHASE', days: 30, previousExpiresAt: null, newExpiresAt: '2098-12-17T00:00:00Z', createdAt: '2026-11-01T00:00:00Z', planName: 'VIP 1 tháng', amount: 99000, txnRef: 'TM1', reason: null, actorUserId: null, actorName: null },
]
const vipBodies = []
let withLearner = false
const user = { userId: 999, username: 'Quản trị kiểm thử', email: 'admin-ui@example.test', role: 'ADMIN', status: 'ACTIVE', hasPassword: true, createdAt: '2026-01-01T00:00:00Z' }
const session = { user, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z', refreshExpiresAt: '2099-02-01T00:00:00Z', pendingPasswordPrompt: false }
const directions = [1, 2].map((partNo) => ({ directionId: partNo, examId: null, directionKind: 'PART', partNo, skill: null, directionsEn: `Directions Part ${partNo}`, directionsVi: '', exampleEn: '', exampleVi: '', media: [] }))
let uploadCount = 0, failedUpload = true, savedBody, failDashboard = false
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript((saved) => localStorage.setItem('toeicmind_admin_session', JSON.stringify(saved)), session)
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    let json
    if (path === '/api/auth/me' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      assert.deepEqual(Object.keys(body), ['username'])                 // chỉ gửi tên hiển thị của chính mình
      user.username = body.username.trim()
      json = user
    } else if (path === '/api/auth/me') json = user
    else if (path === '/api/auth/change-password') {
      const body = request.postDataJSON()
      if (body.oldPassword !== 'OldPass123') return route.fulfill({ status: 401, json: { code: 'INVALID_OLD_PASSWORD', message: 'Mật khẩu cũ không chính xác' } })
      json = { message: 'Đổi mật khẩu thành công.' }
    } else if (path === '/api/auth/login') json = { accessToken: 'admin-access-2', refreshToken: 'admin-refresh-2', expiresAt: '2099-01-01T00:00:00Z', refreshExpiresAt: '2099-02-01T00:00:00Z', user }
    else if (/\/directions\/1\/media$/.test(path)) {
      uploadCount++
      assert.match(request.headers()['content-type'], /multipart\/form-data/)
      assert.match(request.postDataBuffer().toString(), /filename="sample.png"/)
      if (failedUpload) { failedUpload = false; return route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE' } }) }
      directions[0].media = [{ mediaId: 55, mediaType: 'IMAGE' }]
      json = directions[0].media[0]
    } else if (path === '/api/admin/directions/1' && request.method() === 'PUT') {
      savedBody = request.postDataJSON()
      Object.assign(directions[0], savedBody)
      json = directions[0]
    } else if (path === '/api/admin/directions') {
      assert.equal(url.searchParams.has('examId'), false)
      json = directions
    } else if (path === '/api/admin/dashboard') {
      if (failDashboard) return route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE' } })
      json = {
        summary: { users: { total: 1280, newLast7Days: 26 }, exams: { sets: 8, published: 32, draft: 6, exams: 38 }, attempts: { total: 8642, submitted: 8204, inProgress: 438 }, activeLearnersLast7Days: 246, averageTotalScaled: 645, averageAccuracyPercent: 68.5, newReports: 12 },
        activity: Array.from({ length: Number(url.searchParams.get('days')) }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, attempts: 10 + i % 7 * 8, newUsers: 2 + i % 4, activeLearners: 12 })),
        popularExams: [{ examId: 1, examCode: 'ETS-TEST-01', title: 'Đề kiểm thử giao diện', attempts: 108, submittedAttempts: 98, averageCorrectPercent: 68, averageTotalScaled: 645 }],
        hardestQuestions: [{ questionId: 1, questionNo: 101, examCode: 'ETS-TEST-01', partNo: 5, answers: 100, wrongAnswers: 62, wrongPercent: 62 }]
      }
    }
    else if (path === '/api/admin/users/summary') json = { total: 1, admins: 1, learners: 0, locked: 0 }
    else if (path === '/api/admin/users') json = withLearner
      ? { items: [{ ...user, activeSessionCount: 1 }, { ...learner, activeSessionCount: 0 }], totalCount: 2, page: 1, pageSize: 10 }
      : { items: [{ ...user, activeSessionCount: 1 }], totalCount: 1, page: 1, pageSize: 10 }
    else if (path === '/api/admin/vip/users/1001/history') json = vipHistory
    else if (path === '/api/admin/vip/users/1001' && request.method() === 'PUT') {
      vipBodies.push(request.postDataJSON())
      json = { historyId: 3, kind: 'ADMIN_GRANT', days: 30, previousExpiresAt: learner.vipExpiresAt, newExpiresAt: '2099-01-31T00:00:00Z', createdAt: new Date().toISOString(), reason: 'Bù lỗi thanh toán', actorUserId: 999, actorName: 'Quản trị kiểm thử' }
    }
    else if (path === '/api/admin/exams') json = { items: [{ examId: 1, examCode: 'ETS-TEST-01', title: 'Đề kiểm thử giao diện', status: 'PUBLISHED' }], totalCount: 1 }
    else throw new Error(`Unmocked request: ${request.method()} ${path}`)
    return route.fulfill({ json })
  })
  await page.goto(`${base}/directions`)
  await page.getByRole('button', { name: 'Tải ảnh Part 1' }).waitFor()
  assert.equal(await page.locator('select').count(), 0)
  assert.equal(await page.getByRole('button', { name: /Nhập JSON|Xem như học viên|^Thống kê$/ }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Tải ảnh Part 1' }).count(), 1)
  const chooseImage = async () => {
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Tải ảnh Part 1' }).click()
    await (await chooser).setFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('mock image') })
  }
  await chooseImage()
  await page.getByRole('alert').waitFor()
  await chooseImage()
  await page.getByRole('status').filter({ hasText: 'Đã tải ảnh' }).waitFor()
  assert.equal(uploadCount, 2)
  await page.locator('tr').filter({ hasText: 'Directions Part 1' }).getByRole('button', { name: 'Sửa', exact: true }).click()
  await page.locator('dialog[open] textarea').first().fill('Updated common directions')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await page.getByText('Updated common directions', { exact: true }).waitFor()
  assert.equal(savedBody.examId, null)
  assert.equal(savedBody.skill, null)
  await page.goto(`${base}/stats`)
  await page.getByRole('heading', { name: 'Hoạt động học tập' }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/dashboard')
  await page.getByRole('heading', { name: 'Đề thi trong hệ thống' }).waitFor()
  for (const route of ['/import', '/learner-preview']) {
    await page.goto(base + route)
    await page.getByRole('heading', { name: 'Hoạt động học tập' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/dashboard')
  }
  for (const path of ['/account', '/directions', '/dashboard']) {
    await page.goto(base + path)
    await page.locator('.admin-content h2').first().waitFor()
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} overflow at ${width}`)
    }
  }
  await page.goto(`${base}/users`)
  await page.getByRole('button', { name: 'Đổi vai trò', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Đặt lại mật khẩu|Đổi mật khẩu/ }).count(), 0)
  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click()
  await page.waitForFunction(() => document.querySelector('.admin-sidebar').getBoundingClientRect().width === 80)
  assert.equal(await page.locator('.admin-sidebar').evaluate((node) => node.getBoundingClientRect().width), 80)
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  await page.getByRole('heading', { name: 'Hoạt động học tập' }).waitFor()
  await page.getByRole('button', { name: 'Mở rộng thanh điều hướng' }).click()
  await page.waitForFunction(() => document.querySelector('.admin-sidebar').getBoundingClientRect().width === 240)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.locator('.dashboard[aria-busy="false"]').waitFor()
  await page.screenshot({ path: 'artifacts/admin-desktop/dashboard.png', fullPage: true })
  failDashboard = true
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await page.locator('.dashboard-kpi .kpi-value').allTextContents(), ['—', '—', '—', '—'])
  failDashboard = false
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click()
  await page.getByRole('alert').waitFor({ state: 'hidden' })
  await page.locator('.dashboard[aria-busy="false"]').waitFor()
  assert.equal(await page.getByRole('alert').count(), 0)
  for (const width of [320, 375, 760, 1023]) {
    await page.setViewportSize({ width, height: 800 })
    await page.getByRole('heading', { name: 'Vui lòng sử dụng máy tính' }).waitFor()
    assert.equal(await page.locator('.admin-shell').isVisible(), false)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  }
  await page.screenshot({ path: 'artifacts/admin-desktop/desktop-required.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  // Hộp thoại VIP: cộng thêm ngày nối tiếp hạn hiện tại, bắt buộc lý do, xem lịch sử VIP (không phải lịch sử thanh toán).
  withLearner = true
  await page.goto(`${base}/users`)
  await page.getByRole('button', { name: 'Cấp VIP', exact: true }).click()
  const vipDialog = page.locator('dialog.vip-grant-dialog[open]')
  await vipDialog.waitFor()
  assert.match(await vipDialog.innerText(), /Đang có VIP đến/)
  await vipDialog.locator('.vip-history-table tbody tr').first().waitFor()
  assert.match(await vipDialog.locator('.vip-history-table').innerText(), /Quản trị viên tặng[\s\S]*Tặng sự kiện[\s\S]*Mua gói[\s\S]*Người dùng \(VNPay\)/)
  assert.match(await vipDialog.locator('#vip-days-hint').innerText(), /cộng nối tiếp hạn hiện tại/)
  await page.screenshot({ path: 'artifacts/admin-desktop/vip-dialog.png' })
  await vipDialog.getByRole('button', { name: 'Cộng thêm ngày VIP' }).click()
  await vipDialog.getByText('Vui lòng nhập lý do.').waitFor()
  assert.equal(vipBodies.length, 0, 'thiếu lý do thì không gửi')
  await vipDialog.getByRole('button', { name: 'Bù lỗi thanh toán' }).click()
  await vipDialog.getByRole('button', { name: 'Cộng thêm ngày VIP' }).click()
  await page.getByRole('status').filter({ hasText: /Đã cộng 30 ngày VIP/ }).or(page.locator('.admin-notice[data-kind=success]').filter({ hasText: /Đã cộng 30 ngày VIP/ })).first().waitFor()
  assert.deepEqual(vipBodies, [{ action: 'GRANT', days: 30, reason: 'Bù lỗi thanh toán' }])
  withLearner = false
  await page.goto(`${base}/account`)
  // Không còn JSON UserDto/hạn phiên; tự sửa tên hiển thị; đổi mật khẩu (sai mật khẩu hiện tại không đăng xuất).
  await page.locator('#user-info-title').waitFor()
  assert.equal(await page.locator('.admin-account pre, .account-dto').count(), 0)
  assert.ok(!/UserDto|Phiên truy cập có hiệu lực|Access token/.test(await page.locator('.admin-account').innerText()))
  await page.getByLabel('Tên hiển thị').fill('Quản trị mới')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await page.getByRole('status').filter({ hasText: 'Đã lưu tên hiển thị.' }).waitFor()
  assert.equal(await page.locator('.account-name').innerText(), 'Quản trị mới')
  await page.getByLabel('Mật khẩu hiện tại').fill('sai')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPass123')
  await page.getByLabel('Nhập lại mật khẩu mới').fill('NewPass123')
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click()
  await page.getByText('Mật khẩu hiện tại không đúng.').waitFor()
  assert.equal(new URL(page.url()).pathname, '/account')
  await page.getByLabel('Mật khẩu hiện tại').fill('OldPass123')
  await page.getByRole('button', { name: 'Đổi mật khẩu' }).click()
  await page.getByRole('status').filter({ hasText: 'Đã đổi mật khẩu' }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/account')
  user.hasPassword = false
  await page.reload()
  await page.getByRole('button', { name: 'Thiết lập mật khẩu', exact: true }).click()
  await page.locator('dialog[open]').waitFor()
  await page.keyboard.press('Escape')
  await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  assert.deepEqual(errors, [])
  const phone = await browser.newPage({ viewport: { width: 375, height: 812 } })
  let phoneApiRequests = 0
  phone.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/')) phoneApiRequests++ })
  await phone.goto(`${base}/login`)
  await phone.getByRole('heading', { name: 'Vui lòng sử dụng máy tính' }).waitFor()
  assert.equal(await phone.locator('input[name="password"]').count(), 0)
  assert.equal(phoneApiRequests, 0)
  await phone.close()
  console.log('PASS: API mock; directions image failure/retry; desktop dashboard error/retry; no user password reset; sidebar collapse/navigation; PC 1024/1280/1440/1920; mobile notice 320/375/760/1023; account refresh/onboarding; no browser errors.')
} finally { await browser.close() }
