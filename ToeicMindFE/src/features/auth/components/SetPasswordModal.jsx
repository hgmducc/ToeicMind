import { useEffect, useRef, useState } from 'react'
import AuthField from './AuthField.jsx'
import { getMe, setPassword } from '../services/authApi.js'
import { mapApiFieldErrors, validateSetPassword } from '../validation.js'

export default function SetPasswordModal({ accessToken, onClose, onSuccess, onSessionExpired }) {
  const [values, setValues] = useState({ newPassword: '', confirmNewPassword: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef(null)
  const formRef = useRef(null)
  const inFlight = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    formRef.current?.elements.namedItem('newPassword')?.focus()
    return () => {
      mounted.current = false
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  function close() {
    if (!inFlight.current) onClose()
  }

  function focusError(fieldErrors) {
    const field = ['newPassword', 'confirmNewPassword'].find((name) => fieldErrors[name])
    if (field) formRef.current?.elements.namedItem(field)?.focus()
  }

  function changeField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setMessage(null)
  }

  async function submit(event) {
    event.preventDefault()
    if (inFlight.current) return
    const invalid = validateSetPassword(values)
    setErrors(invalid)
    setMessage(null)
    if (Object.keys(invalid).length) { focusError(invalid); return }
    inFlight.current = true
    setIsSubmitting(true)
    try {
      await setPassword(values, accessToken)
      if (mounted.current) {
        setValues({ newPassword: '', confirmNewPassword: '' })
        onSuccess()
      }
    } catch (error) {
      if (!mounted.current) return
      if (error.status === 401) { onSessionExpired(); return }
      if (error.code === 'PASSWORD_ALREADY_SET') {
        try {
          const user = await getMe(accessToken)
          if (mounted.current && user.hasPassword === true) { onSuccess(user); return }
        } catch { /* Keep the actionable error if reconciliation fails. */ }
      }
      if (!mounted.current) return
      const fieldErrors = mapApiFieldErrors(error)
      setErrors(fieldErrors)
      setMessage(error.message)
      focusError(fieldErrors)
    } finally {
      inFlight.current = false
      if (mounted.current) setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal-card password-dialog"
      aria-labelledby="password-dialog-title"
      aria-describedby="password-dialog-description"
      onCancel={(event) => { event.preventDefault(); close() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first) { event.preventDefault(); return }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
      } }}
    >
      <h2 id="password-dialog-title" className="modal-title">Tạo mật khẩu cho tài khoản</h2>
      <p id="password-dialog-description" className="modal-description">
        Tạo mật khẩu để lần sau bạn có thể đăng nhập bằng email và mật khẩu. Bạn cũng có thể bỏ qua và tiếp tục đăng nhập bằng Google.
      </p>
      <form ref={formRef} className="auth-form" noValidate onSubmit={submit} aria-busy={isSubmitting}>
        {message && <p className="form-notice" data-kind="error" role="alert">{message}</p>}
        <AuthField name="newPassword" label="Mật khẩu mới" icon="lock" type="password" autoComplete="new-password"
          value={values.newPassword} error={errors.newPassword} onChange={changeField} disabled={isSubmitting}
          maxLength={72} hint="Ít nhất 6 ký tự, tối đa 72 byte UTF-8." />
        <AuthField name="confirmNewPassword" label="Xác nhận mật khẩu mới" icon="lock" type="password" autoComplete="new-password"
          value={values.confirmNewPassword} error={errors.confirmNewPassword} onChange={changeField} disabled={isSubmitting} maxLength={72} />
        <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo mật khẩu…' : 'Tạo mật khẩu'}</button>
        <button className="modal-skip-button" type="button" onClick={close} disabled={isSubmitting}>Bỏ qua</button>
      </form>
    </dialog>
  )
}
