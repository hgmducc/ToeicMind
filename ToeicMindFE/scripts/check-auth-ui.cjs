const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  try {
    // Mặc định chỉ kiểm giao diện người học (5173). Bản mở rộng cho Admin nằm ở ../ToeicMindAdmin/scripts/check-auth-ui.cjs; UI_PORTS=5174,5173 để chạy cả hai.
    for (const port of (process.env.UI_PORTS || '5173').split(',').map(Number)) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
      await page.route('**/GoogleSignInButton.jsx*', async (route) => {
        const response = await route.fetch()
        const body = (await response.text()).replace(/const CLIENT_ID = [^\n]+/, 'const CLIENT_ID = "mock-client.apps.googleusercontent.com";')
        await route.fulfill({ response, body })
      })
      await page.route('https://accounts.google.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.google={accounts:{id:{initialize(o){window.gsi=o;if(o.ux_mode!=='popup'||o.auto_select!==false)throw Error('Expected popup account selection')},renderButton(host,o){const b=document.createElement('button');b.textContent='Mock Google';b.style.width=o.width+'px';b.onclick=()=>{window.gsi.callback({credential:'mock-id-token'});window.gsi.callback({credential:'mock-id-token'})};host.append(b)},disableAutoSelect(){}}}}` }))
      const baseUser = { userId: 7, username: 'Mock Account', email: 'mock@example.com', role: port === 5174 ? 'ADMIN' : 'LEARNER', status: 'ACTIVE', hasPassword: false, createdAt: '2026-10-29T08:00:00Z' }
      let user = { ...baseUser }
      const tokenSession = () => ({ user, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-10-29T08:00:00Z', refreshExpiresAt: '2099-11-29T08:00:00Z' })
      let passwordBehavior = 'success', release, passwordRequests = 0, googleRequests = 0, loginFails = false
      const registerBodies = [], loginBodies = []
      const key = port === 5174 ? 'toeicmind_admin_session' : 'toeicmind_fe_session'
      await page.route('**/api/**', (route) => route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Mock chưa hỗ trợ' } }))
      await page.route('**/api/auth/**', async (route) => {
        const endpoint = new URL(route.request().url()).pathname.split('/').at(-1)
        if (endpoint === 'google-login') {
          googleRequests++
          assert.deepEqual(route.request().postDataJSON(), { idToken: 'mock-id-token' })
          return route.fulfill({ json: tokenSession() })
        }
        if (endpoint === 'set-password') {
          passwordRequests++
          assert.equal(route.request().headers().authorization, 'Bearer mock-access')
          const body = route.request().postDataJSON()
          assert.equal(body.newPassword, body.confirmNewPassword)
          if (passwordBehavior === 'delay') await new Promise((resolve) => { release = resolve })
          if (passwordBehavior === 'error') return route.fulfill({ status: 400, json: { code: 'PASSWORD_TOO_LONG' } })
          if (passwordBehavior === 'already') { user.hasPassword = true; return route.fulfill({ status: 400, json: { code: 'PASSWORD_ALREADY_SET' } }) }
          user.hasPassword = true
          return route.fulfill({ json: { message: 'Password set successfully' } })
        }
        if (endpoint === 'me' && route.request().method() === 'PUT') {
          assert.equal(route.request().headers().authorization, 'Bearer mock-access')
          assert.deepEqual(Object.keys(route.request().postDataJSON()), ['username'])   // chỉ gửi tên hiển thị
          user = { ...user, username: route.request().postDataJSON().username }
          return route.fulfill({ json: user })
        }
        if (endpoint === 'me') return route.fulfill({ json: user })
        if (endpoint === 'logout') return route.fulfill({ status: 204 })
        if (endpoint === 'login') {
          loginBodies.push(route.request().postDataJSON())
          if (loginFails) return route.fulfill({ status: 500, json: { code: 'SERVER_ERROR', message: 'Mock lỗi đăng nhập' } })
          return user.hasPassword
            ? route.fulfill({ json: tokenSession() })
            : route.fulfill({ status: 400, json: { code: 'NO_PASSWORD_SET' } })
        }
        if (endpoint === 'register') { registerBodies.push(route.request().postDataJSON()); user = { ...baseUser, hasPassword: true }; return route.fulfill({ status: 201, json: user }) }
        throw new Error('Unexpected API endpoint: ' + endpoint)
      })
      // Expected business errors are surfaced in the UI; ignore their browser HTTP log.
      page.removeAllListeners('console')
      page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text()) })
      const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
      // Admin: sau đăng nhập mở thẳng trang UserDto. FE: mở Trang chủ, trang UserDto ở /account (menu người dùng).
      // Đăng ký email ở FE: thông báo thành công rồi tự đăng nhập và vào Trang chủ (lỗi đăng nhập tự động → tab Đăng nhập).
      const info = async () => {
        if (port === 5173) {
          // Chờ trang UserDto hoặc khung người học (sau đăng nhập; nội dung trang chủ cần API khác, ở đây chưa mock).
          await page.locator('#user-info-title, .user-button').first().waitFor()
          if (!(await page.locator('#user-info-title').count())) {
            await page.locator('.user-button').click(); await page.getByRole('menuitem', { name: 'Tài khoản' }).click()
          }
        }
        return page.locator('#user-info-title').waitFor()
      }
      const google = () => page.getByText('Mock Google', { exact: true }).click()
      const logout = async () => {
        if (port === 5173 && await page.locator('.user-button').count()) { await page.locator('.user-button').click(); await page.getByRole('menuitem', { name: 'Đăng xuất' }).click(); return }
        await page.locator('.user-info-actions button').last().click()
      }
      const openForm = async () => { await page.locator('dialog input[name=newPassword]').waitFor() } // form tạo mật khẩu hiện ngay, không còn bước hỏi riêng
      const fillPasswords = async (password = 'ValidPass123!') => {
        await page.locator('dialog input[name=newPassword]').fill(password)
        await page.locator('dialog input[name=confirmNewPassword]').fill(password)
      }
      await page.goto('http://' + (process.env.UI_HOST || '127.0.0.1') + ':' + port) // UI_HOST=localhost khi Vite chỉ nghe IPv6
      if (port === 5174) assert.equal(await page.locator('.auth-tab').count(), 0)
      // Save tokens before onboarding; reload resumes the unfinished prompt.
      await google(); await page.locator('dialog[open]').waitFor()
      assert.equal(googleRequests, 1)
      // Form tạo mật khẩu hiện ngay (không bước hỏi riêng), ô đầu được focus, có lời nhắc lần sau và nút Bỏ qua.
      await page.locator('dialog input[name=newPassword]').waitFor()
      assert.equal(await page.locator('dialog input[name=newPassword]').evaluate((e) => e === document.activeElement), true)
      assert.match(await page.locator('dialog .modal-description').textContent(), /lần sau.*email và mật khẩu.*bỏ qua/i)
      assert.equal(await page.locator('dialog .modal-skip-button').textContent(), 'Bỏ qua')
      assert.equal((await saved()).pendingPasswordPrompt, true)
      assert.equal((await saved()).user.hasPassword, false)
      await page.reload(); await page.locator('dialog[open]').waitFor()
      await page.locator('dialog .modal-skip-button').click(); await info()
      assert.equal((await saved()).pendingPasswordPrompt, false)
      assert.equal((await saved()).user.hasPassword, false)
      assert.equal(passwordRequests, 0)
      assert.equal(await page.locator('.account-email').textContent(), user.email)
      assert.equal(await page.locator('.account-page pre').count(), 0)
      await page.reload(); await info(); assert.equal(await page.locator('dialog').count(), 0)
      await logout(); assert.equal(await saved(), null)
      await page.locator('input[name=email]').fill(user.email)
      await page.locator('input[name=password]').fill('wrong-password')
      await page.locator('form .submit-button').click()
      await page.locator('.google-btn-wrapper[data-highlighted=true]').waitFor()
      assert.equal(await saved(), null)
      // Configure a password and check client validation, focus and server errors.
      await google(); await page.locator('dialog[open]').waitFor(); await openForm()
      await page.locator('dialog .submit-button').click()
      assert.equal(passwordRequests, 0)
      assert.equal(await page.locator('dialog input[name=newPassword]').evaluate((e) => e === document.activeElement), true)
      await page.locator('dialog input[name=newPassword]').fill('ValidPass123!')
      await page.locator('dialog input[name=confirmNewPassword]').fill('different')
      await page.locator('dialog .submit-button').click(); assert.equal(passwordRequests, 0)
      await fillPasswords('ấ'.repeat(25)); await page.locator('dialog .submit-button').click(); assert.equal(passwordRequests, 0)
      await page.locator('dialog .field-toggle').first().click()
      assert.equal(await page.locator('dialog input[name=newPassword]').getAttribute('type'), 'text')
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab')
        assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('dialog') || !!document.activeElement.closest('dialog')), true)
      }
      await fillPasswords(); passwordBehavior = 'error'
      await page.locator('dialog .submit-button').click(); await page.locator('dialog [role=alert]').waitFor()
      assert.equal((await saved()).user.hasPassword, false)
      passwordBehavior = 'delay'; await fillPasswords()
      await page.locator('dialog .submit-button').click()
      await page.waitForFunction(() => document.querySelector('dialog .submit-button').disabled)
      await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(), 1)
      await page.locator('dialog form').evaluate((form) => form.requestSubmit())
      assert.equal(passwordRequests, 2)
      release(); await page.locator('dialog').waitFor({ state: 'detached' }); await info()
      assert.equal((await saved()).user.hasPassword, true)
      assert.equal((await saved()).pendingPasswordPrompt, false)
      assert.equal(await page.locator('.account-email').textContent(), user.email)
      assert.equal(await page.locator('.account-page pre').count(), 0)
      assert.ok(!/mock-access|Access token|UserDto/.test(await page.locator('.account-page').textContent()))
      await page.reload(); await info(); assert.equal(await page.locator('dialog').count(), 0)
      await logout()
      await page.locator('input[name=email]').fill(user.email); await page.locator('input[name=password]').fill('ValidPass123!')
      await page.locator('form .submit-button').click(); await info(); assert.equal(await page.locator('dialog').count(), 0)
      await page.getByLabel('Tên hiển thị').fill('Tên mới')
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
      await page.locator('.account-page [role=status]').waitFor()
      assert.equal(await page.locator('.account-name').textContent(), 'Tên mới')
      for (const width of [320, 375, 760, 1280]) {
        await page.setViewportSize({ width, height: 800 })
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Account page overflow at ' + width)
      }
      await logout()
      user = { ...baseUser }
      await google(); await page.locator('dialog[open]').waitFor(); await openForm()
      await page.setViewportSize({ width: 320, height: 568 })
      assert.ok(await page.locator('dialog').evaluate((e) => e.getBoundingClientRect().right <= innerWidth && e.getBoundingClientRect().left >= 0))
      passwordBehavior = 'already'; await fillPasswords(); await page.locator('dialog .submit-button').click()
      await page.locator('dialog').waitFor({ state: 'detached' }); assert.equal((await saved()).user.hasPassword, true)
      await logout(); await page.setViewportSize({ width: 1280, height: 900 })
      if (port === 5174) {
        user.role = 'LEARNER'; await google(); await page.locator('.form-notice[data-kind=error]').waitFor()
        assert.equal(await saved(), null); assert.equal(await page.locator('dialog').count(), 0)
      } else {
        // Mở từ Trang chủ (chưa có phiên → /login, state.from='/'): bỏ state.from '/account' còn lại sau lần đăng xuất trước,
        // để chắc đích sau đăng ký là Trang chủ. (Cùng URL /login sẽ bị trình duyệt coi là reload và giữ lại state cũ.)
        await page.goto('http://' + (process.env.UI_HOST || '127.0.0.1') + ':' + port + '/')
        await page.locator('.auth-tab').nth(1).click()
        await page.locator('input[name=username]').fill('Mock Account')
        await page.locator('input[name=email]').fill('mock@example.com')
        await page.locator('input[name=password]').fill('ValidPass123!')
        await page.locator('input[name=confirmPassword]').fill('ValidPass123!')
        await page.locator('form .submit-button').click()
        // Đăng ký thành công → tự đăng nhập → Trang chủ kèm thông báo chào mừng (không còn trang UserDto kiểm thử).
        await page.locator('.learner-notice').waitFor()
        assert.match(await page.locator('.learner-notice').textContent(), /Đăng ký thành công/)
        // Sau đăng nhập còn bước kiểm tra hồ sơ mục tiêu (GET /me/profile) rồi mới rời /login → chờ chuyển trang xong.
        await page.waitForURL((url) => url.pathname === '/')
        assert.equal(new URL(page.url()).pathname, '/')
        assert.equal(await page.locator('#user-info-title').count(), 0)
        assert.equal(await page.locator('dialog').count(), 0)
        assert.deepEqual(registerBodies, [{ username: 'Mock Account', email: 'mock@example.com', password: 'ValidPass123!', confirmPassword: 'ValidPass123!' }])
        assert.deepEqual(loginBodies.at(-1), { email: 'mock@example.com', password: 'ValidPass123!' })
        assert.equal((await saved()).user.email, 'mock@example.com')
        assert.equal((await saved()).pendingPasswordPrompt, false)
        assert.ok(!JSON.stringify(await saved()).includes('ValidPass123!'), 'Mật khẩu không được lưu vào phiên')
        await logout()
        // Đăng nhập tự động lỗi sau khi đã tạo tài khoản → tab Đăng nhập, giữ email, báo đăng ký thành công, không có phiên.
        loginFails = true
        await page.locator('.auth-tab').nth(1).click()
        await page.locator('input[name=username]').fill('Mock Account')
        await page.locator('input[name=email]').fill('mock@example.com')
        await page.locator('input[name=password]').fill('ValidPass123!')
        await page.locator('input[name=confirmPassword]').fill('ValidPass123!')
        await page.locator('form .submit-button').click()
        await page.locator('.form-notice[data-kind=success]').waitFor()
        assert.match(await page.locator('.form-notice[data-kind=success]').textContent(), /Đăng ký thành công.*đăng nhập/s)
        assert.equal(await page.locator('input[name=username]').count(), 0)
        assert.equal(await page.locator('input[name=email]').inputValue(), 'mock@example.com')
        assert.equal(await page.locator('input[name=password]').inputValue(), '')
        assert.equal(await saved(), null)
        loginFails = false
      }
      assert.deepEqual(errors, [])
      console.log('PASS ' + port + ': popup, onboarding, skip, password validation/API, session restore/logout, trang tài khoản (sửa tên, không JSON), role, responsive' + (port === 5173 ? ', registration → tự đăng nhập → Trang chủ (và dự phòng về Đăng nhập)' : ''))
      await context.close()
    }
  } finally { await browser.close() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
