import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, postJson } from '../src/lib/apiClient.js'
import { getMe, googleLogin, login, logout, register, setPassword } from '../src/features/auth/services/authApi.js'
import { mapApiFieldErrors, validateAuth, validateSetPassword } from '../src/features/auth/validation.js'

const validValues = {
  username: 'Học viên',
  email: 'learner@example.com',
  password: 'secret123',
  confirmPassword: 'secret123',
}
const user = { userId: 1, username: 'Học viên', email: validValues.email, role: 'LEARNER', status: 'ACTIVE', hasPassword: true, createdAt: '2026-10-29T08:00:00Z' }
const session = { user, accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

test('registration accepts a complete valid form without mutating its values', () => {
  const values = { ...validValues, email: ' learner@example.com ', username: ' Học viên ' }
  const original = { ...values }
  assert.deepEqual(validateAuth(values, 'register'), {})
  assert.deepEqual(values, original)
})

test('registration requires six characters while login accepts an existing shorter password', () => {
  const values = { ...validValues, password: 'abc', confirmPassword: 'abc' }
  assert.ok(validateAuth(values, 'register').password)
  assert.deepEqual(validateAuth(values, 'login'), {})
  assert.deepEqual(validateAuth({ ...values, password: 'abcdef', confirmPassword: 'abcdef' }, 'register'), {})
})

test('blank and whitespace-only required values are rejected', () => {
  const errors = validateAuth({ username: '  ', email: ' ', password: '      ', confirmPassword: '' }, 'register')
  assert.deepEqual(Object.keys(errors), ['username', 'email', 'password', 'confirmPassword'])
})

test('confirmation compares the full password including meaningful whitespace', () => {
  const values = { ...validValues, password: ' secret123 ', confirmPassword: 'secret123' }
  assert.ok(validateAuth(values, 'register').confirmPassword)
  assert.deepEqual(validateAuth({ ...values, confirmPassword: values.password }, 'register'), {})
})

test('ASCII password accepts 72 bytes and rejects 73 bytes for both modes', () => {
  for (const mode of ['login', 'register']) {
    assert.deepEqual(validateAuth({ ...validValues, password: 'a'.repeat(72), confirmPassword: 'a'.repeat(72) }, mode), {})
    assert.ok(validateAuth({ ...validValues, password: 'a'.repeat(73), confirmPassword: 'a'.repeat(73) }, mode).password)
  }
})

test('Vietnamese Unicode password enforces UTF-8 bytes rather than character count', () => {
  // U+1EA5 occupies three bytes: 24 characters = 72 bytes, 25 = 75 bytes.
  for (const mode of ['login', 'register']) {
    const atLimit = 'ấ'.repeat(24)
    const overLimit = 'ấ'.repeat(25)
    assert.deepEqual(validateAuth({ ...validValues, password: atLimit, confirmPassword: atLimit }, mode), {})
    assert.ok(validateAuth({ ...validValues, password: overLimit, confirmPassword: overLimit }, mode).password)
  }
})

test('emoji password also respects the UTF-8 72-byte boundary', () => {
  const atLimit = '😀'.repeat(18)
  const overLimit = `${atLimit}a`
  assert.deepEqual(validateAuth({ ...validValues, password: atLimit, confirmPassword: atLimit }, 'register'), {})
  assert.ok(validateAuth({ ...validValues, password: overLimit }, 'login').password)
})

test('invalid email and backend maximum field lengths are rejected', () => {
  assert.ok(validateAuth({ ...validValues, email: 'invalid-address' }, 'login').email)
  assert.ok(validateAuth({ ...validValues, email: `${'a'.repeat(250)}@example.com` }, 'login').email)
  assert.ok(validateAuth({ ...validValues, username: 'a'.repeat(101) }, 'register').username)
  assert.deepEqual(validateAuth({ ...validValues, username: 'a'.repeat(100) }, 'register'), {})
})

test('registration sends only the DTO fields, trims identity values and preserves passwords', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return jsonResponse(user, 201)
  })
  const result = await register({
    ...validValues,
    username: ' Học viên ',
    email: ' learner@example.com ',
    password: ' secret123 ',
    confirmPassword: ' secret123 ',
    role: 'ADMIN',
    status: 'ACTIVE',
  })
  assert.deepEqual(result, user)
  assert.equal(request.url, '/api/auth/register')
  assert.equal(request.method, 'POST')
  assert.deepEqual(JSON.parse(request.body), {
    username: 'Học viên',
    email: 'learner@example.com',
    password: ' secret123 ',
    confirmPassword: ' secret123 ',
  })
})

test('login sends only email and the unchanged password', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return jsonResponse(session)
  })
  assert.deepEqual(await login({ ...validValues, email: ' learner@example.com ', password: ' short ', role: 'ADMIN' }), session)
  assert.equal(request.url, '/api/auth/login')
  assert.deepEqual(JSON.parse(request.body), { email: 'learner@example.com', password: ' short ' })
  assert.equal(request.credentials, 'omit')
  assert.equal(request.cache, 'no-store')
})

test('duplicate registration retains the backend error code and maps to email', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ code: 'EMAIL_EXISTS' }, 409))
  await assert.rejects(register(validValues), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 409)
    assert.equal(error.code, 'EMAIL_EXISTS')
    assert.ok(mapApiFieldErrors(error).email)
    return true
  })
})

test('invalid credentials never resolve as a successful login', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ code: 'INVALID_CREDENTIALS' }, 401))
  await assert.rejects(login(validValues), (error) => error.code === 'INVALID_CREDENTIALS' && error.status === 401)
})

test('backend validation keys are mapped without exposing unknown fields', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({
    code: 'VALIDATION_ERROR',
    errors: { Email: ['Invalid'], 'dto.ConfirmPassword': ['Mismatch'], InternalField: ['Internal detail'] },
  }, 400))
  await assert.rejects(register(validValues), (error) => {
    assert.deepEqual(Object.keys(mapApiFieldErrors(error)).sort(), ['confirmPassword', 'email'])
    return true
  })
})

test('network rejection becomes a recoverable API error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(login(validValues), (error) => error instanceof ApiError && error.code === 'NETWORK_ERROR')
})

test('server failures use a safe message instead of internal server detail', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ message: 'SQL connection secret detail' }, 500))
  await assert.rejects(login(validValues), (error) => {
    assert.equal(error.status, 500)
    assert.ok(!error.message.includes('SQL'))
    return true
  })
})

test('non-JSON proxy responses become an error instead of false success', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Proxy failure</html>', { status: 502 }))
  await assert.rejects(login(validValues), (error) => error.code === 'INVALID_RESPONSE' && error.status === 502)
})

test('incomplete login success responses are rejected', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ user }))
  await assert.rejects(login(validValues), (error) => error.code === 'INVALID_RESPONSE')
})

test('incomplete registration success responses are rejected', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ message: 'Created' }, 201))
  await assert.rejects(register(validValues), (error) => error.code === 'INVALID_RESPONSE')
})

test('logout supports the backend empty 204 response and sends only its refresh token', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return new Response(null, { status: 204 })
  })
  assert.equal(await logout('unused-refresh-token'), null)
  assert.equal(request.url, '/api/auth/logout')
  assert.deepEqual(JSON.parse(request.body), { refreshToken: 'unused-refresh-token' })
})

test('rate limiting preserves the HTTP status for retry feedback', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({}, 429))
  await assert.rejects(postJson('/auth/login', validValues), (error) => error instanceof ApiError && error.status === 429)
})

test('validateSetPassword enforces length, UTF-8 byte boundary, and confirmation matching', () => {
  assert.ok(validateSetPassword({ newPassword: '', confirmNewPassword: '' }).newPassword)
  assert.ok(validateSetPassword({ newPassword: '123', confirmNewPassword: '123' }).newPassword)
  assert.ok(validateSetPassword({ newPassword: 'password123', confirmNewPassword: 'different' }).confirmNewPassword)
  assert.ok(validateSetPassword({ newPassword: 'ấ'.repeat(25), confirmNewPassword: 'ấ'.repeat(25) }).newPassword)
  assert.deepEqual(validateSetPassword({ newPassword: 'ValidPass123!', confirmNewPassword: 'ValidPass123!' }), {})
})

test('setPassword sends Bearer authorization header and DTO body', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return jsonResponse({ message: 'Thiết lập mật khẩu thành công.' })
  })
  const res = await setPassword({ newPassword: 'Pass123!', confirmNewPassword: 'Pass123!' }, 'mock-token-abc')
  assert.equal(request.url, '/api/auth/set-password')
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.Authorization, 'Bearer mock-token-abc')
  assert.deepEqual(JSON.parse(request.body), { newPassword: 'Pass123!', confirmNewPassword: 'Pass123!' })
  assert.equal(res.message, 'Thiết lập mật khẩu thành công.')
})

test('getMe sends Bearer authorization header and returns UserDto', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return jsonResponse({
      userId: 5,
      username: 'Test User',
      email: 'test@example.com',
      role: 'LEARNER',
      status: 'ACTIVE',
      hasPassword: false,
      createdAt: '2026-10-29T08:00:00Z',
    })
  })
  const user = await getMe('learner-token-123')
  assert.equal(request.url, '/api/auth/me')
  assert.equal(request.method, 'GET')
  assert.equal(request.headers.Authorization, 'Bearer learner-token-123')
  assert.equal(user.userId, 5)
  assert.equal(user.hasPassword, false)
})

test('NO_PASSWORD_SET error from login resolves to specific guidance message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ code: 'NO_PASSWORD_SET' }, 400))
  await assert.rejects(login(validValues), (error) => {
    assert.equal(error.code, 'NO_PASSWORD_SET')
    assert.ok(error.message.includes('Google'))
    return true
  })
})

test('PASSWORD_ALREADY_SET error from setPassword resolves to specific guidance message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ code: 'PASSWORD_ALREADY_SET' }, 400))
  await assert.rejects(setPassword({ newPassword: 'a', confirmNewPassword: 'a' }, 'tok'), (error) => {
    assert.equal(error.code, 'PASSWORD_ALREADY_SET')
    assert.ok(error.message.includes('Đổi mật khẩu'))
    return true
  })
})


test('Google login sends only the ID token and never sends browser credentials', async (t) => {
  let request
  const googleSession = { ...session, user: { ...user, hasPassword: false } }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options }
    return jsonResponse(googleSession)
  })
  assert.deepEqual(await googleLogin('mock-google-id-token'), googleSession)
  assert.equal(request.url, '/api/auth/google-login')
  assert.deepEqual(JSON.parse(request.body), { idToken: 'mock-google-id-token' })
  assert.equal(request.credentials, 'omit')
  assert.equal(request.cache, 'no-store')
})

test('Google login rejects empty credentials without making a request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected request') })
  for (const credential of [undefined, null, '', '   ', {}]) {
    await assert.rejects(googleLogin(credential), (error) => error.code === 'INVALID_GOOGLE_TOKEN')
  }
  assert.equal(fetch.mock.callCount(), 0)
})

test('Google login rejects incomplete or invalid sessions', async (t) => {
  const valid = { ...session, user: { ...user, hasPassword: true } }
  for (const body of [null, {}, { ...valid, accessToken: {} }, { ...valid, refreshToken: ' ' },
    { ...valid, user: { ...valid.user, role: 'UNKNOWN' } },
    { ...valid, user: { ...valid.user, hasPassword: undefined } },
    { ...valid, user: { ...valid.user, email: '' } }]) {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse(body))
    await assert.rejects(googleLogin('mock-id-token'), (error) => error.code === 'INVALID_RESPONSE')
  }
})

test('Google token and locked-account errors remain recoverable errors', async (t) => {
  for (const code of ['INVALID_GOOGLE_TOKEN', 'ACCOUNT_LOCKED']) {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({ code }, 401))
    await assert.rejects(googleLogin('mock-id-token'), (error) => error.code === code && error.status === 401)
  }
})


test('all user responses must include a boolean hasPassword', async (t) => {
  const missing = { ...user, hasPassword: undefined }
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ ...session, user: missing }))
  await assert.rejects(login(validValues), (error) => error.code === 'INVALID_RESPONSE')
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(missing))
  await assert.rejects(register(validValues), (error) => error.code === 'INVALID_RESPONSE')
  await assert.rejects(getMe('mock-token'), (error) => error.code === 'INVALID_RESPONSE')
})

test('set password requires a real session and a complete success response', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => jsonResponse({}))
  await assert.rejects(setPassword({ newPassword: 'secret123', confirmNewPassword: 'secret123' }), (error) => error.status === 401)
  assert.equal(fetch.mock.callCount(), 0)
  await assert.rejects(setPassword({ newPassword: 'secret123', confirmNewPassword: 'secret123' }, 'mock-token'), (error) => error.code === 'INVALID_RESPONSE')
})
