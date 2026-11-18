import { APP_AUDIENCE } from '../../../config/app.js'

const STORAGE_KEY = APP_AUDIENCE === 'admin' ? 'toeicmind_admin_session' : 'toeicmind_fe_session'

export function isUserDto(user) {
  return Number.isSafeInteger(user?.userId) && user.userId > 0
    && typeof user.email === 'string' && !!user.email.trim()
    && ['ADMIN', 'LEARNER'].includes(user.role)
    && typeof user.hasPassword === 'boolean'
}

export function isAuthSession(session, audience = APP_AUDIENCE) {
  return isUserDto(session?.user)
    && (audience !== 'admin' || session.user.role === 'ADMIN')
    && typeof session.accessToken === 'string' && !!session.accessToken.trim()
    && typeof session.refreshToken === 'string' && !!session.refreshToken.trim()
}

export function sessionData(session) {
  const { userId, username, email, role, status, hasPassword, createdAt } = session.user
  return {
    accessToken: session.accessToken, refreshToken: session.refreshToken,
    expiresAt: session.expiresAt, refreshExpiresAt: session.refreshExpiresAt,
    user: { userId, username, email, role, status, hasPassword, createdAt },
    pendingPasswordPrompt: session.pendingPasswordPrompt === true && !hasPassword,
  }
}

export function readSession(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY))
    if (isAuthSession(saved)) return sessionData(saved)
    storage.removeItem(STORAGE_KEY)
  } catch { /* Storage can be disabled or contain invalid JSON. */ }
  return null
}

export function writeSession(storage, session) {
  try {
    if (session === null) storage.removeItem(STORAGE_KEY)
    else {
      if (!isAuthSession(session)) return false
      storage.setItem(STORAGE_KEY, JSON.stringify(sessionData(session)))
    }
    return true
  } catch { return false }
}
