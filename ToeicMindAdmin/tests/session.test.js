import assert from 'node:assert/strict'
import test from 'node:test'
import { isAuthSession, readSession, writeSession } from '../src/features/auth/services/sessionStore.js'

const user = { userId: 1, username: 'Mock Admin', email: 'test@example.com', role: 'ADMIN', status: 'ACTIVE', hasPassword: false, createdAt: '2026-10-29T08:00:00Z' }
const session = { user, accessToken: 'mock-access', refreshToken: 'mock-refresh', pendingPasswordPrompt: true }
function storage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values }
}

test('session round-trip preserves onboarding, tokens and DTO without password fields', () => {
  const local = storage()
  assert.equal(writeSession(local, { ...session, password: 'must-not-be-saved', user: { ...user, passwordHash: 'must-not-be-saved' } }), true)
  assert.deepEqual(readSession(local), { ...session, expiresAt: undefined, refreshExpiresAt: undefined })
  assert.ok(![...local.values.values()][0].includes('must-not-be-saved'))
  assert.equal(writeSession(local, null), true)
  assert.equal(readSession(local), null)
})

test('completed password setup clears pending onboarding when persisted', () => {
  const local = storage()
  writeSession(local, { ...session, user: { ...user, hasPassword: true } })
  assert.equal(readSession(local).pendingPasswordPrompt, false)
})

test('registration DTOs and non-admin sessions cannot masquerade as admin sessions', () => {
  assert.equal(isAuthSession({ user }, 'admin'), false)
  const learner = { ...session, user: { ...user, role: 'LEARNER' } }
  assert.equal(isAuthSession(learner, 'admin'), false)
  assert.equal(isAuthSession(learner, 'learner'), true)
})

test('storage errors are recoverable and malformed JSON never becomes a session', () => {
  const unavailable = { getItem() { throw new Error('disabled') }, setItem() { throw new Error('disabled') }, removeItem() { throw new Error('disabled') } }
  assert.equal(readSession(unavailable), null)
  assert.equal(writeSession(unavailable, session), false)
  const invalid = { getItem: () => '{invalid', removeItem() {} }
  assert.equal(readSession(invalid), null)
})
