import { ApiError, getJson, postJson, putJson } from '../../../lib/apiClient.js'
import { isAuthSession, isUserDto } from './sessionStore.js'

export async function login({ email, password }) {
  const result = await postJson('/auth/login', { email: email.trim(), password })
  if (!isAuthSession(result, 'learner')) {
    throw new ApiError('Phản hồi đăng nhập chưa đầy đủ. Vui lòng thử lại.', { code: 'INVALID_RESPONSE' })
  }
  return result
}

export async function register({ username, email, password, confirmPassword }) {
  const result = await postJson('/auth/register', {
    username: username.trim(),
    email: email.trim(),
    password,
    confirmPassword,
  })
  if (!isUserDto(result)) {
    throw new ApiError('Phản hồi đăng ký chưa đầy đủ. Vui lòng thử lại.', { code: 'INVALID_RESPONSE' })
  }
  return result
}

export async function googleLogin(idToken) {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new ApiError('Google chưa trả về thông tin xác thực. Vui lòng thử lại.', { code: 'INVALID_GOOGLE_TOKEN' })
  }
  const result = await postJson('/auth/google-login', { idToken })
  if (!isAuthSession(result, 'learner')) {
    throw new ApiError('Phản hồi đăng nhập Google chưa đầy đủ. Vui lòng thử lại.', { code: 'INVALID_RESPONSE' })
  }
  return result
}

export async function setPassword({ newPassword, confirmNewPassword }, accessToken) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new ApiError('Vui lòng đăng nhập lại trước khi thiết lập mật khẩu.', { status: 401 })
  }
  const result = await postJson(
    '/auth/set-password',
    { newPassword, confirmNewPassword },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (typeof result?.message !== 'string' || !result.message.trim()) {
    throw new ApiError('Phản hồi thiết lập mật khẩu chưa đầy đủ. Vui lòng thử lại.', { code: 'INVALID_RESPONSE' })
  }
  return result
}

export async function getMe(accessToken) {
  const result = await getJson('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!isUserDto(result)) {
    throw new ApiError('Phản hồi thông tin người dùng chưa đầy đủ.', { code: 'INVALID_RESPONSE' })
  }
  return result
}

const bearer = (accessToken, action) => {
  if (typeof accessToken !== 'string' || !accessToken.trim()) throw new ApiError(`Vui lòng đăng nhập lại trước khi ${action}.`, { status: 401 })
  return { headers: { Authorization: `Bearer ${accessToken}` } }
}

// Người dùng tự sửa hồ sơ của chính mình (backend lấy mã người dùng từ token; chỉ nhận tên hiển thị).
export async function updateProfile({ username }, accessToken) {
  const result = await putJson('/auth/me', { username: username.trim() }, bearer(accessToken, 'cập nhật hồ sơ'))
  if (!isUserDto(result)) throw new ApiError('Phản hồi cập nhật hồ sơ chưa đầy đủ. Vui lòng thử lại.', { code: 'INVALID_RESPONSE' })
  return result
}

// Đổi mật khẩu (cần mật khẩu hiện tại). Backend đăng xuất mọi phiên sau khi đổi.
export function changePassword({ oldPassword, newPassword, confirmNewPassword }, accessToken) {
  return putJson('/auth/change-password', { oldPassword, newPassword, confirmNewPassword }, bearer(accessToken, 'đổi mật khẩu'))
}

export async function forgotPassword(email) {
  return postJson('/auth/forgot-password', { email: email.trim() })
}

export async function resetPassword({ email, otp, newPassword, confirmNewPassword }) {
  return postJson('/auth/reset-password', { email: email.trim(), otp, newPassword, confirmNewPassword })
}

export function logout(refreshToken) {
  return postJson('/auth/logout', { refreshToken })
}
