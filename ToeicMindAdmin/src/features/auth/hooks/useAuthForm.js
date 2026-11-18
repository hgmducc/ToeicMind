import { useRef, useState } from 'react'
import { login, logout, register } from '../services/authApi.js'
import { mapApiFieldErrors, validateAuth } from '../validation.js'

const emptyValues = { username: '', email: '', password: '', confirmPassword: '' }

export default function useAuthForm(isAdmin, { onSuccess, onRegisterSuccess } = {}) {
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlight = useRef(false)
  const formRef = useRef(null)

  function switchMode(nextMode) {
    if (isAdmin || inFlight.current || nextMode === mode) return
    setMode(nextMode)
    setValues((current) => ({ ...emptyValues, email: current.email }))
    setErrors({})
    setNotice(null)
  }

  function changeField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setNotice(null)
  }

  function focusFirstError(fieldErrors) {
    const firstField = Object.keys(fieldErrors)[0]
    formRef.current?.elements.namedItem(firstField)?.focus()
  }

  async function submit(event) {
    event.preventDefault()
    if (inFlight.current) return
    const validationErrors = validateAuth(values, mode)
    setErrors(validationErrors)
    setNotice(null)
    if (Object.keys(validationErrors).length) {
      focusFirstError(validationErrors)
      return
    }

    inFlight.current = true
    setIsSubmitting(true)

    try {
      if (mode === 'register' && !isAdmin) {
        const userResult = await register(values)
        setValues((current) => ({ ...current, password: '', confirmPassword: '' }))
        if (onRegisterSuccess) {
          onRegisterSuccess(userResult)
        } else {
          setNotice({
            kind: 'success',
            title: 'Tạo tài khoản thành công!',
            message: 'Bạn đã sẵn sàng bắt đầu hành trình cùng ToeicMind. Hãy đăng nhập bằng tài khoản vừa tạo.',
          })
        }
      } else {
        const result = await login(values)
        if (isAdmin && result.user.role !== 'ADMIN') {
          // The shared backend login accepts both roles. Reject the learner
          // here and revoke the unused refresh session without keeping tokens.
          void logout(result.refreshToken).catch(() => {})
          setValues((current) => ({ ...current, password: '', confirmPassword: '' }))
          setNotice({
            kind: 'error',
            title: 'Tài khoản chưa có quyền truy cập',
            message: 'Khu vực này chỉ dành cho quản trị viên. Vui lòng sử dụng tài khoản Admin được cấp.',
          })
          return
        }
        setValues((current) => ({ ...current, password: '', confirmPassword: '' }))
        if (onSuccess) {
          onSuccess(result)
        } else {
          setNotice({
            kind: 'success',
            title: 'Đăng nhập thành công!',
            message: isAdmin
              ? `Chào mừng ${result.user.username || 'quản trị viên'} trở lại ToeicMind Admin.`
              : `Chào mừng ${result.user.username || 'bạn'} trở lại ToeicMind. Chúc bạn có một buổi học thật hiệu quả!`,
          })
        }
      }
    } catch (error) {
      const fieldErrors = mapApiFieldErrors(error)
      setErrors(fieldErrors)
      if (error.code === 'NO_PASSWORD_SET') {
        setNotice({
          kind: 'error',
          code: 'NO_PASSWORD_SET',
          title: 'Chưa thiết lập mật khẩu',
          message: 'Tài khoản này được đăng ký qua Google và chưa có mật khẩu. Vui lòng chọn Đăng nhập với Google!',
        })
      } else {
        setNotice({
          kind: 'error',
          code: error.code,
          title: mode === 'register' ? 'Chưa thể tạo tài khoản' : 'Chưa thể đăng nhập',
          message: error.message,
        })
      }
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }

  function clearPasswords() {
    setValues((current) => ({ ...current, password: '', confirmPassword: '' }))
    setErrors({})
  }

  return { clearPasswords, mode, values, errors, notice, setNotice, isSubmitting, formRef, switchMode, changeField, submit }
}
