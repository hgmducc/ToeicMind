export function passwordByteLength(value) {
  return new TextEncoder().encode(value).length
}

export function validateAuth(values, mode = 'login') {
  const errors = {}
  const email = values.email.trim()

  if (mode === 'register') {
    if (!values.username.trim()) errors.username = 'Vui lòng nhập tên hiển thị.'
    else if (values.username.trim().length > 100) errors.username = 'Tên hiển thị không được vượt quá 100 ký tự.'
  }

  if (!email) errors.email = 'Vui lòng nhập email.'
  else if (email.length > 255) errors.email = 'Email không được vượt quá 255 ký tự.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Vui lòng nhập đúng định dạng email.'

  if (!values.password.trim()) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (mode === 'register' && values.password.length < 6) errors.password = 'Mật khẩu cần có ít nhất 6 ký tự.'
  else if (values.password.length > 72 || passwordByteLength(values.password) > 72) {
    errors.password = 'Mật khẩu vượt quá 72 byte. Hãy dùng mật khẩu ngắn hơn, đặc biệt khi có ký tự có dấu.'
  }

  if (mode === 'register') {
    if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.'
    else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
  }

  return errors
}

export function validateForgotPassword(email) {
  const errors = {}
  const trimmed = email.trim()
  if (!trimmed) errors.email = 'Vui lòng nhập email.'
  else if (trimmed.length > 255) errors.email = 'Email không được vượt quá 255 ký tự.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) errors.email = 'Vui lòng nhập đúng định dạng email.'
  return errors
}

export function validateResetPassword({ otp, newPassword, confirmNewPassword }) {
  const errors = {}
  if (!otp.trim()) errors.otp = 'Vui lòng nhập mã OTP.'
  else if (!/^\d{6}$/.test(otp.trim())) errors.otp = 'Mã OTP phải gồm đúng 6 chữ số.'
  if (!newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
  else if (newPassword.length < 6) errors.newPassword = 'Mật khẩu mới cần có ít nhất 6 ký tự.'
  else if (newPassword.length > 72 || passwordByteLength(newPassword) > 72) errors.newPassword = 'Mật khẩu vượt quá 72 byte.'
  if (!confirmNewPassword) errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới.'
  else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = 'Mật khẩu xác nhận chưa khớp.'
  return errors
}

export function validateSetPassword({ newPassword, confirmNewPassword }) {
  const errors = {}
  if (!newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
  else if (newPassword.length < 6) errors.newPassword = 'Mật khẩu mới cần có ít nhất 6 ký tự.'
  else if (newPassword.length > 72 || passwordByteLength(newPassword) > 72) {
    errors.newPassword = 'Mật khẩu vượt quá 72 byte. Hãy dùng mật khẩu ngắn hơn.'
  }

  if (!confirmNewPassword) errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới.'
  else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = 'Mật khẩu xác nhận chưa khớp.'

  return errors
}

export function validateProfile({ username }) {
  const errors = {}
  const name = username.trim()
  if (!name) errors.username = 'Vui lòng nhập tên hiển thị.'
  else if (name.length > 100) errors.username = 'Tên hiển thị không được vượt quá 100 ký tự.'
  return errors
}

export function validateChangePassword({ oldPassword, newPassword, confirmNewPassword }) {
  const errors = {}
  if (!oldPassword) errors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại.'
  Object.assign(errors, validateSetPassword({ newPassword, confirmNewPassword }))
  if (!errors.newPassword && oldPassword && newPassword === oldPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
  return errors
}

export function mapApiFieldErrors(error) {
  const fieldErrors = {}
  const labels = {
    username: 'Tên hiển thị chưa hợp lệ. Vui lòng kiểm tra lại.',
    email: 'Email chưa hợp lệ. Vui lòng kiểm tra lại.',
    password: 'Mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.',
    confirmPassword: 'Mật khẩu xác nhận chưa hợp lệ. Vui lòng kiểm tra lại.',
    newPassword: 'Mật khẩu mới chưa hợp lệ. Vui lòng kiểm tra lại.',
    confirmNewPassword: 'Mật khẩu xác nhận chưa hợp lệ. Vui lòng kiểm tra lại.',
  }

  for (const key of Object.keys(error.errors ?? {})) {
    const fieldName = key.split('.').pop()
    const match = Object.keys(labels).find((field) => field.toLowerCase() === fieldName.toLowerCase())
    if (match) fieldErrors[match] = labels[match]
  }

  if (error.code === 'EMAIL_EXISTS') fieldErrors.email = 'Email này đã được sử dụng.'
  if (error.code === 'PASSWORD_MISMATCH') {
    fieldErrors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    fieldErrors.confirmNewPassword = 'Mật khẩu xác nhận chưa khớp.'
  }
  if (error.code === 'PASSWORD_TOO_LONG') {
    fieldErrors.password = error.message
    fieldErrors.newPassword = error.message
  }

  // Reset password field errors
  if (error.code === 'INVALID_OTP' || error.code === 'OTP_EXPIRED_OR_NOT_FOUND' || error.code === 'OTP_MAX_ATTEMPTS_EXCEEDED') {
    fieldErrors.otp = error.message
  }

  return fieldErrors
}
