import { useEffect, useRef, useState } from 'react'
import { forgotPassword, resetPassword } from '../services/authApi.js'
import { mapApiFieldErrors, validateForgotPassword, validateResetPassword } from '../validation.js'

export default function useForgotPassword() {
  const [step, setStep] = useState(1) // 1=email, 2=otp+newPassword
  const [email, setEmail] = useState('')
  const [values, setValues] = useState({ otp: '', newPassword: '', confirmNewPassword: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlight = useRef(false)
  const formRef = useRef(null)
  const focusPending = useRef(false)

  useEffect(() => {
    if (isSubmitting || !focusPending.current) return
    focusPending.current = false
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [errors, isSubmitting])

  function changeEmail(e) {
    setEmail(e.target.value)
    setErrors((prev) => ({ ...prev, email: undefined }))
    setNotice(null)
  }

  function changeField(e) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setNotice(null)
  }

  function backToStep1() {
    if (inFlight.current) return
    setStep(1)
    setValues({ otp: '', newPassword: '', confirmNewPassword: '' })
    setErrors({})
    setNotice(null)
  }

  async function submitEmail(event) {
    event.preventDefault()
    if (inFlight.current) return
    formRef.current = event.currentTarget
    focusPending.current = true
    const fieldErrors = validateForgotPassword(email)
    setErrors(fieldErrors)
    setNotice(null)
    if (Object.keys(fieldErrors).length) return

    inFlight.current = true
    setIsSubmitting(true)
    try {
      await forgotPassword(email)
      setNotice({
        kind: 'success',
        title: 'Đã gửi mã OTP!',
        message: 'Nếu email hợp lệ, mã OTP đã được gửi. Kiểm tra hộp thư và nhập mã bên dưới.',
      })
      setStep(2)
    } catch (err) {
      const fieldErrors = mapApiFieldErrors(err)
      setErrors(fieldErrors)
      setNotice({ kind: 'error', title: 'Không thể gửi mã OTP', message: err.message })
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }

  async function submitReset(event) {
    event.preventDefault()
    if (inFlight.current) return
    formRef.current = event.currentTarget
    focusPending.current = true
    const fieldErrors = validateResetPassword(values)
    setErrors(fieldErrors)
    setNotice(null)
    if (Object.keys(fieldErrors).length) return

    inFlight.current = true
    setIsSubmitting(true)
    try {
      await resetPassword({ email, ...values })
      setNotice({
        kind: 'success',
        title: 'Đặt lại mật khẩu thành công!',
        message: 'Mật khẩu đã được cập nhật. Vui lòng quay lại đăng nhập với mật khẩu mới.',
      })
      setValues({ otp: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      const fe = mapApiFieldErrors(err)
      setErrors(fe)
      setNotice({ kind: 'error', title: 'Chưa thể đặt lại mật khẩu', message: err.message })
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }

  async function resendOtp() {
    if (inFlight.current) return
    inFlight.current = true
    setIsSubmitting(true)
    setNotice(null)
    try {
      await forgotPassword(email)
      setNotice({ kind: 'success', title: 'Đã gửi lại mã OTP!', message: 'Kiểm tra hộp thư của bạn.' })
    } catch (err) {
      setNotice({ kind: 'error', title: 'Không thể gửi lại', message: err.message })
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }

  return {
    step,
    email,
    values,
    errors,
    notice,
    isSubmitting,
    changeEmail,
    changeField,
    backToStep1,
    submitEmail,
    submitReset,
    resendOtp,
  }
}
