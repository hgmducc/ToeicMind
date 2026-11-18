import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api.js'
import {
  isAuthSession,
  readSession,
  sessionData,
  writeSession,
} from '../features/auth/services/sessionStore.js'

export class ApiError extends Error {
  constructor(message, { status, code, errors, raw } = {}) {
    super(message)
    this.name = 'ApiError'
    Object.assign(this, { status, code, errors, raw })
  }
}

const messages = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa.',
  EMAIL_EXISTS: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
  PASSWORD_MISMATCH: 'Mật khẩu xác nhận chưa khớp. Vui lòng kiểm tra lại.',
  PASSWORD_TOO_LONG: 'Mật khẩu vượt quá 72 byte. Hãy dùng mật khẩu ngắn hơn, đặc biệt khi có ký tự có dấu.',
  VALIDATION_ERROR: 'Một vài thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  OTP_COOLDOWN: 'Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới.',
  OTP_EXPIRED_OR_NOT_FOUND: 'Mã OTP không tồn tại hoặc đã hết hạn.',
  OTP_MAX_ATTEMPTS_EXCEEDED:
    'Bạn đã nhập sai mã OTP quá số lần cho phép (5 lần). Vui lòng yêu cầu mã OTP mới.',
  INVALID_OTP: 'Mã OTP không chính xác.',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đã bị khóa.',
  NO_PASSWORD_SET:
    'Tài khoản này được đăng ký qua Google và chưa có mật khẩu. Vui lòng chọn Đăng nhập với Google!',
  PASSWORD_ALREADY_SET: 'Tài khoản đã có mật khẩu. Vui lòng sử dụng chức năng Đổi mật khẩu.',
  INVALID_REFRESH_TOKEN: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
}

function errorMessage(data, status) {
  if (status >= 500) return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
  return (
    messages[data?.code] ||
    data?.message ||
    (status === 429
      ? 'Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.'
      : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.')
  )
}

async function responseData(response) {
  const body = await response.text()
  let data = null
  try {
    if (body) data = JSON.parse(body)
  } catch {
    throw new ApiError('Máy chủ chưa phản hồi đúng định dạng. Vui lòng thử lại sau.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    })
  }
  if (!response.ok)
    throw new ApiError(errorMessage(data, response.status), {
      status: response.status,
      code: data?.code,
      errors: data?.errors,
      raw: data,
    })
  return data
}

const refreshedListeners = new Set(),
  expiredListeners = new Set()
export const onSessionRefreshed = (fn) => {
  refreshedListeners.add(fn)
  return () => refreshedListeners.delete(fn)
}
export const onSessionExpired = (fn) => {
  expiredListeners.add(fn)
  return () => expiredListeners.delete(fn)
}
let memorySession,
  sessionVersion = 0,
  activeRefresh = null

export function setClientSession(session) {
  if (memorySession?.refreshToken !== session?.refreshToken) sessionVersion++
  memorySession = session
}

export function getClientSession() {
  if (memorySession !== undefined) return memorySession
  try {
    return readSession(window.localStorage)
  } catch {
    return null
  }
}

export async function requestTokenRefresh() {
  if (activeRefresh) return activeRefresh
  const saved = getClientSession(),
    version = sessionVersion
  activeRefresh = (async () => {
    try {
      if (!saved?.refreshToken)
        throw new ApiError('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', {
          status: 401,
          code: 'INVALID_REFRESH_TOKEN',
        })
      const result = await request(
        '/auth/refresh',
        { method: 'POST', body: { refreshToken: saved.refreshToken } },
        true,
      )
      if (!isAuthSession(result))
        throw new ApiError('Phiên đăng nhập không còn hợp lệ.', {
          status: 401,
          code: 'INVALID_REFRESH_TOKEN',
        })
      if (version !== sessionVersion)
        throw new ApiError('Phiên đăng nhập đã thay đổi.', { code: 'SESSION_CHANGED' })
      const next = sessionData({ ...saved, ...result })
      memorySession = next
      try {
        writeSession(window.localStorage, next)
      } catch {
        /* Phiên vẫn hoạt động trong bộ nhớ. */
      }
      for (const fn of refreshedListeners) fn(next)
      return next
    } catch (error) {
      if (version === sessionVersion && (error.status === 401 || error.status === 403)) {
        setClientSession(null)
        try {
          writeSession(window.localStorage, null)
        } catch {
          /* Storage bị chặn. */
        }
        for (const fn of expiredListeners) fn(error)
      }
      throw error
    }
  })().finally(() => {
    activeRefresh = null
  })
  return activeRefresh
}

// 401 mang mã nghiệp vụ (vd. sai mật khẩu hiện tại khi đổi mật khẩu) không phải phiên hết hạn: không làm mới token, không đăng xuất.
const BUSINESS_401_CODES = new Set(['INVALID_OLD_PASSWORD'])
async function isSessionFailure(response) {
  if (response.status !== 401) return false
  try { return !BUSINESS_401_CODES.has((await response.clone().json())?.code) } catch { return true }
}

async function request(
  path,
  { method = 'GET', body, headers = {}, timeoutMs = API_TIMEOUT_MS } = {},
  retry = false,
) {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), timeoutMs)
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
    const sessionFailure = await isSessionFailure(response)
    if (
      sessionFailure &&
      !retry &&
      headers.Authorization?.startsWith('Bearer ') &&
      !path.startsWith('/auth/refresh')
    ) {
      const current = getClientSession()
      const next =
        current?.accessToken && headers.Authorization !== `Bearer ${current.accessToken}`
          ? current
          : await requestTokenRefresh()
      return request(
        path,
        { method, body, timeoutMs, headers: { ...headers, Authorization: `Bearer ${next.accessToken}` } },
        true,
      )
    }
    if (
      sessionFailure &&
      retry &&
      headers.Authorization === `Bearer ${getClientSession()?.accessToken}`
    ) {
      setClientSession(null)
      try {
        writeSession(window.localStorage, null)
      } catch {
        /* Storage bị chặn. */
      }
      for (const fn of expiredListeners) fn(new ApiError('Phiên đăng nhập đã hết hạn.', { status: 401 }))
    }
    return await responseData(response)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      controller.signal.aborted
        ? 'Kết nối quá thời gian cho phép. Hãy kiểm tra dữ liệu trên hệ thống trước khi thử lại.'
        : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
      { code: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' },
    )
  } finally {
    clearTimeout(timeout)
  }
}

export const getJson = (path, options) => request(path, options)
export const postJson = (path, body, options) => request(path, { ...options, method: 'POST', body })
export const putJson = (path, body, options) => request(path, { ...options, method: 'PUT', body })
export const deleteJson = (path, options) => request(path, { ...options, method: 'DELETE' })
export const uploadMultipart = (path, body, options) =>
  request(path, { timeoutMs: 60000, ...options, method: 'POST', body })
