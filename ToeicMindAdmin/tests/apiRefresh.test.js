import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getClientSession,
  getJson,
  onSessionExpired,
  requestTokenRefresh,
  setClientSession,
} from '../src/lib/apiClient.js'

const session = {
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  user: { userId: 1, email: 'test@example.com', role: 'ADMIN', hasPassword: true },
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status })

test('concurrent 401 responses rotate once and both requests retry with the new token', async (t) => {
  const original = globalThis.fetch
  t.after(() => {
    globalThis.fetch = original
    setClientSession(undefined)
  })
  setClientSession(session)
  let refreshes = 0
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++
      await new Promise((resolve) => setTimeout(resolve, 10))
      return json({ ...session, accessToken: 'new-access', refreshToken: 'new-refresh' })
    }
    return options.headers.Authorization === 'Bearer new-access'
      ? json({ ok: true })
      : json({ code: 'UNAUTHORIZED' }, 401)
  }
  const result = await Promise.all([
    getJson('/admin/exams', { headers: { Authorization: 'Bearer old-access' } }),
    getJson('/admin/exam-sets', { headers: { Authorization: 'Bearer old-access' } }),
  ])
  assert.deepEqual(result, [{ ok: true }, { ok: true }])
  assert.equal(refreshes, 1)
})

test('logout during token rotation cannot restore a logged-out session', async (t) => {
  const original = globalThis.fetch
  t.after(() => {
    globalThis.fetch = original
    setClientSession(undefined)
  })
  setClientSession(session)
  let resolve
  globalThis.fetch = () =>
    new Promise((done) => {
      resolve = done
    })
  const pending = requestTokenRefresh()
  setClientSession(null)
  resolve(json({ ...session, accessToken: 'new' }))
  await assert.rejects(pending, (error) => error.code === 'SESSION_CHANGED')
  assert.equal(getClientSession(), null)
})

test('transient refresh failure preserves the session and permits a later retry', async (t) => {
  const original = globalThis.fetch
  t.after(() => {
    globalThis.fetch = original
    setClientSession(undefined)
  })
  setClientSession(session)
  globalThis.fetch = async () => json({}, 503)
  await assert.rejects(requestTokenRefresh(), (error) => error.status === 503)
  assert.equal(getClientSession().refreshToken, 'old-refresh')
  globalThis.fetch = async () => json({ ...session, accessToken: 'new' })
  assert.equal((await requestTokenRefresh()).accessToken, 'new')
})

test('a refreshed LEARNER session is rejected by Admin and session expiry is emitted', async (t) => {
  const original = globalThis.fetch
  let expired = 0
  const off = onSessionExpired(() => expired++)
  t.after(() => {
    globalThis.fetch = original
    setClientSession(undefined)
    off()
  })
  setClientSession(session)
  globalThis.fetch = async () => json({ ...session, user: { ...session.user, role: 'LEARNER' } })
  await assert.rejects(requestTokenRefresh(), (error) => error.status === 401)
  assert.equal(expired, 1)
  assert.equal(getClientSession(), null)
})
