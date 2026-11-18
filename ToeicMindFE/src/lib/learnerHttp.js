import { deleteJson, getClientSession, getJson, postJson, putJson } from './apiClient.js'

// Tầng HTTP của khu vực người học: tự gắn Bearer của phiên hiện tại. Việc làm mới token khi gặp 401
// do apiClient xử lý (một lượt refresh dùng chung); ở đây chỉ bổ sung query string và thông báo VIP.
const vipListeners = new Set()

export function onVipRequired(listener) {
  vipListeners.add(listener)
  return () => vipListeners.delete(listener)
}

export function withQuery(path, query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `${path}?${text}` : path
}

function authOptions(options = {}) {
  const token = getClientSession()?.accessToken
  return { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }
}

async function call(run) {
  try {
    return await run()
  } catch (error) {
    if (error?.status === 402 && error.code === 'VIP_REQUIRED') for (const listener of vipListeners) listener(error)
    // 503 kèm mã vận hành (PAYMENT_NOT_CONFIGURED, VOCAB_SCHEMA_MISSING…): hiện thông điệp cụ thể của backend thay cho câu chung chung.
    if (error?.status === 503 && typeof error.raw?.message === 'string' && error.raw.message) error.message = error.raw.message
    throw error
  }
}

export const api = {
  get: (path, query, options) => call(() => getJson(withQuery(path, query), authOptions(options))),
  post: (path, body, options) => call(() => postJson(path, body, authOptions(options))),
  put: (path, body, options) => call(() => putJson(path, body, authOptions(options))),
  del: (path, options) => call(() => deleteJson(path, authOptions(options))),
}
