const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  try {
    for (const port of [5174, 5173]) {
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
      let passwordBehavior = 'success', release, passwordRequests = 0, googleRequests = 0, forgotRequests = 0, resetRequests = 0, resetBehavior = 'invalid'
      const key = port === 5174 ? 'toeicmind_admin_session' : 'toeicmind_fe_session'
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
        if (endpoint === 'me') return route.fulfill({ json: user })
        if (endpoint === 'refresh') return route.fulfill({ json: tokenSession() })
        if (endpoint === 'forgot-password') {
          forgotRequests++
          return forgotRequests === 1 ? route.fulfill({ json: { message: 'OTP sent' } }) : route.fulfill({ status: 429, json: { code: 'OTP_COOLDOWN' } })
        }
        if (endpoint === 'reset-password') {
          resetRequests++
          return resetBehavior === 'invalid' ? route.fulfill({ status: 400, json: { code: 'INVALID_OTP' } }) : route.fulfill({ json: { message: 'Password reset' } })
        }
        if (endpoint === 'logout') return route.fulfill({ status: 204 })
        if (endpoint === 'login') return user.hasPassword
          ? route.fulfill({ json: tokenSession() })
          : route.fulfill({ status: 400, json: { code: 'NO_PASSWORD_SET' } })
        if (endpoint === 'register') { user = { ...baseUser, hasPassword: true }; return route.fulfill({ status: 201, json: user }) }
        throw new Error('Unexpected API endpoint: ' + endpoint)
      })
      // Expected business errors are surfaced in the UI; ignore their browser HTTP log.
      page.removeAllListeners('console')
      page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text()) })
      const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
      const info = () => page.locator('#user-info-title').waitFor()
      const google = () => page.getByText('Mock Google', { exact: true }).click()
      const logout = () => page.locator('.user-info-actions button').last().click()
      const openForm = async () => { await page.locator('dialog .submit-button').click(); await page.locator('dialog input[name=newPassword]').waitFor() }
      const fillPasswords = async (password = 'ValidPass123!') => {
        await page.locator('dialog input[name=newPassword]').fill(password)
        await page.locator('dialog input[name=confirmNewPassword]').fill(password)
      }
      await page.goto('http://127.0.0.1:' + port)
      if (port === 5174) assert.equal(await page.locator('.auth-tab').count(), 0)
      // Save tokens before onboarding; reload resumes the unfinished prompt.
      await google(); await page.locator('dialog[open]').waitFor()
      assert.equal(googleRequests, 1)
      assert.equal((await saved()).pendingPasswordPrompt, true)
      assert.equal((await saved()).user.hasPassword, false)
      await page.reload(); await page.locator('dialog[open]').waitFor()
      await page.locator('dialog .modal-skip-button').click(); await info()
      assert.equal((await saved()).pendingPasswordPrompt, false)
      assert.equal((await saved()).user.hasPassword, false)
      assert.equal(passwordRequests, 0)
      assert.equal(await page.locator('.user-dto-json').textContent(), JSON.stringify(user, null, 2))
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
      assert.equal(await page.locator('.user-dto-json').textContent(), JSON.stringify(user, null, 2))
      assert.ok(!(await page.locator('.user-info-container').textContent()).includes('mock-access'))
      await page.reload(); await info(); assert.equal(await page.locator('dialog').count(), 0)
      await logout()
      await page.locator('input[name=email]').fill(user.email); await page.locator('input[name=password]').fill('ValidPass123!')
      await page.locator('form .submit-button').click(); await info(); assert.equal(await page.locator('dialog').count(), 0)
      await page.locator('.user-info-actions button').first().click()
      await page.locator('.user-info-container [role=status]').waitFor()
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
        await page.locator('.auth-tab').nth(1).click()
        await page.locator('input[name=username]').fill('Mock Account')
        await page.locator('input[name=email]').fill('mock@example.com')
        await page.locator('input[name=password]').fill('ValidPass123!')
        await page.locator('input[name=confirmPassword]').fill('ValidPass123!')
        await page.locator('form .submit-button').click(); await info()
        assert.equal(await saved(), null)
        assert.equal(await page.locator('.user-info-actions button').count(), 1)
      }
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await page.getByRole('button', { name: 'Quên mật khẩu?', exact: true }).click()
      await page.locator('form .submit-button').click()
      assert.equal(await page.locator('input[name=email]').getAttribute('aria-invalid'), 'true')
      assert.equal(await page.locator('input[name=email]').evaluate((el) => el === document.activeElement), true)
      assert.equal(forgotRequests, 0)
      await page.locator('input[name=email]').fill('mock@example.com')
      await page.locator('form').evaluate((form) => { form.requestSubmit(); form.requestSubmit() })
      await page.locator('input[name=otp]').waitFor()
      assert.equal(forgotRequests, 1)
      await page.locator('form .submit-button').click()
      assert.equal(await page.locator('input[name=otp]').evaluate((el) => el === document.activeElement), true)
      assert.equal(resetRequests, 0)
      await page.locator('input[name=otp]').fill('123456')
      await page.locator('input[name=newPassword]').fill('ValidPass123!')
      await page.locator('input[name=confirmNewPassword]').fill('different')
      await page.locator('form .submit-button').click()
      assert.equal(resetRequests, 0)
      await page.locator('input[name=confirmNewPassword]').fill('ValidPass123!')
      await page.locator('form .submit-button').click()
      await page.locator('input[name=otp][aria-invalid=true]').waitFor()
      assert.equal(resetRequests, 1)
      assert.equal(await page.locator('input[name=otp]').evaluate((el) => el === document.activeElement), true)
      await page.getByRole('button', { name: 'Gửi lại mã OTP', exact: true }).click()
      await page.getByText('Vui lòng đợi 60 giây', { exact: false }).waitFor()
      resetBehavior = 'success'
      await page.locator('input[name=otp]').fill('654321')
      await page.locator('form .submit-button').click()
      await page.getByText('Đặt lại mật khẩu thành công!', { exact: true }).waitFor()
      assert.equal(await page.locator('input[name=newPassword]').inputValue(), '')
      assert.equal(await page.locator('input[name=confirmNewPassword]').inputValue(), '')
      assert.equal(await saved(), null)
      await page.setViewportSize({ width: 320, height: 800 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'OTP form overflow')
      await page.getByRole('button', { name: 'Đổi email', exact: true }).click()
      assert.equal(await page.locator('input[name=email]').inputValue(), 'mock@example.com')
      await page.getByRole('button', { name: 'Quay lại đăng nhập', exact: true }).click()
      await page.locator('input[name=password]').waitFor()
      assert.deepEqual(errors, [])
      console.log('PASS ' + port + ': popup, onboarding, skip, password validation/API, session restore/logout, UserDto, role, forgot/OTP/reset, responsive' + (port === 5173 ? ', registration' : ''))
      await context.close()
    }
  } finally { await browser.close() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
