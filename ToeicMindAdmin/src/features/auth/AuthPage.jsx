import { useEffect, useRef, useState } from 'react'
import GoogleSignInButton from './components/GoogleSignInButton.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { APP_AUDIENCE } from '../../config/app.js'
import AuthField from './components/AuthField.jsx'
import useAuthForm from './hooks/useAuthForm.js'
import { googleLogin, logout } from './services/authApi.js'


export default function AuthPage({ onForgotPassword, onAuthSuccess, onRegisterSuccess }) {
  const isAdmin = APP_AUDIENCE === 'admin'
  const {
    mode,
    values,
    errors,
    notice,
    setNotice,
    isSubmitting,
    formRef,
    switchMode,
    changeField,
    submit,
    clearPasswords,
  } = useAuthForm(isAdmin, {
    onSuccess: (result) => {
      onAuthSuccess?.(result)
    },
    onRegisterSuccess: (userResult) => {
      onRegisterSuccess?.(userResult)
    },
  })

  const isRegister = mode === 'register'

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleNotice, setGoogleNotice] = useState(null)

  const sharedProps = { disabled: isSubmitting || isGoogleLoading, onChange: handleFieldChange }

  const googleInFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  function handleFieldChange(e) {
    if (googleNotice) setGoogleNotice(null)
    changeField(e)
  }

  // Handle Google popup response (credential is Google ID token)
  const handleGoogleCredentialResponse = async (response) => {
    if (googleInFlight.current || isSubmitting) return
    setNotice(null)
    if (typeof response?.credential !== 'string' || !response.credential.trim()) {
      setGoogleNotice({ kind: 'error', title: 'Đăng nhập Google thất bại', message: 'Google chưa trả về thông tin xác thực. Vui lòng thử lại.' })
      return
    }
    googleInFlight.current = true
    setIsGoogleLoading(true)
    setGoogleNotice(null)

    try {
      const result = await googleLogin(response.credential)
      if (!mounted.current) {
        void logout(result.refreshToken).catch(() => {})
        return
      }

      if (isAdmin && result.user.role !== 'ADMIN') {
        void logout(result.refreshToken).catch(() => {})
        setGoogleNotice({
          kind: 'error',
          title: 'Tài khoản chưa có quyền truy cập',
          message: 'Khu vực này chỉ dành cho quản trị viên. Vui lòng sử dụng tài khoản Admin được cấp.',
        })
        return
      }

      clearPasswords()
      onAuthSuccess?.(result, { provider: 'google' })
    } catch (err) {
      if (!mounted.current) return
      setGoogleNotice({
        kind: 'error',
        title: 'Đăng nhập Google thất bại',
        message: err.message || 'Xác thực Google không thành công.',
      })
    } finally {
      googleInFlight.current = false
      if (mounted.current) setIsGoogleLoading(false)
    }
  }

  const activeNotice = googleNotice || notice

  return (
    <>
      <div className="auth-heading">
        <p className="eyebrow">{isAdmin ? 'KHÔNG GIAN QUẢN TRỊ' : 'HÀNH TRÌNH CỦA BẠN BẮT ĐẦU TỪ ĐÂY'}</p>
        <h1 className="auth-title">
          {isAdmin ? 'Chào mừng trở lại.' : isRegister ? 'Bắt đầu hành trình mới.' : 'Chào bạn, mừng trở lại.'}
        </h1>
        <p className="auth-description">
          {isAdmin
            ? 'Đăng nhập để cùng xây dựng trải nghiệm học tập tốt hơn.'
            : isRegister
              ? 'Tạo tài khoản và tiến gần hơn đến mục tiêu TOEIC của bạn.'
              : 'Một bước nhỏ hôm nay, một bước gần hơn đến mục tiêu TOEIC.'}
        </p>
      </div>

      {!isAdmin && (
        <div className="auth-tabs" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
          <button
            type="button"
            className="auth-tab"
            data-active={!isRegister}
            aria-pressed={!isRegister}
            onClick={() => { setGoogleNotice(null); switchMode('login') }}
            disabled={isSubmitting || isGoogleLoading}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className="auth-tab"
            data-active={isRegister}
            aria-pressed={isRegister}
            onClick={() => { setGoogleNotice(null); switchMode('register') }}
            disabled={isSubmitting || isGoogleLoading}
          >
            Đăng ký
          </button>
        </div>
      )}

      {activeNotice && (
        <div
          className="form-notice"
          data-kind={activeNotice.kind}
          role={activeNotice.kind === 'error' ? 'alert' : 'status'}
          aria-atomic="true"
        >
          <span className="notice-icon">
            <Icon name={activeNotice.kind === 'success' ? 'circle-check' : 'alert-circle'} />
          </span>
          <div className="notice-content">
            <strong>{activeNotice.title}</strong>
            <p>{activeNotice.message}</p>
          </div>
        </div>
      )}

      <form
        key={mode}
        ref={formRef}
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          if (googleInFlight.current) event.preventDefault()
          else { setGoogleNotice(null); void submit(event) }
        }}
        aria-label={isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập tài khoản'}
        aria-busy={isSubmitting}
      >
        {isRegister && (
          <AuthField
            {...sharedProps}
            name="username"
            label="Tên hiển thị"
            icon="user"
            value={values.username}
            error={errors.username}
            placeholder="Bạn muốn được gọi là gì?"
            autoComplete="nickname"
            maxLength={100}
          />
        )}
        <AuthField
          {...sharedProps}
          name="email"
          label="Địa chỉ email"
          icon="mail"
          type="email"
          value={values.email}
          error={errors.email}
          placeholder={isAdmin ? 'admin@example.com' : 'ban@example.com'}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={255}
        />
        <AuthField
          {...sharedProps}
          name="password"
          label="Mật khẩu"
          icon="lock"
          type="password"
          value={values.password}
          error={errors.password}
          placeholder={isRegister ? 'Tạo mật khẩu của bạn' : 'Nhập mật khẩu của bạn'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          maxLength={72}
          hint={isRegister ? 'Sử dụng ít nhất 6 ký tự cho mật khẩu.' : undefined}
        />
        {isRegister && (
          <AuthField
            {...sharedProps}
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            icon="lock"
            type="password"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            placeholder="Nhập lại mật khẩu của bạn"
            autoComplete="new-password"
            maxLength={72}
          />
        )}

        {(!isRegister && onForgotPassword) && (
          <div className="forgot-link-row">
            <button
              type="button"
              className="text-button forgot-link"
              onClick={onForgotPassword}
              disabled={isSubmitting || isGoogleLoading}
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        <button className="submit-button" type="submit" disabled={isSubmitting || isGoogleLoading}>
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              {isRegister ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…'}
            </>
          ) : (
            <>
              {isRegister ? 'Tạo tài khoản' : isAdmin ? 'Đăng nhập quản trị' : 'Đăng nhập'}
              <Icon name="arrow-right" />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider" aria-hidden="true"><span>hoặc</span></div>

      <GoogleSignInButton
        key={`google-${mode}`}
        isRegister={isRegister}
        disabled={isSubmitting || isGoogleLoading}
        loading={isGoogleLoading}
        highlighted={notice?.code === 'NO_PASSWORD_SET'}
        onCredential={handleGoogleCredentialResponse}
        onError={(message) => {
          setNotice(null)
          setGoogleNotice({ kind: 'error', title: 'Chưa thể đăng nhập Google', message })
        }}
      />

      {isAdmin ? (
        <p className="admin-access-note">
          <Icon name="shield" />
          <span>Chỉ dành cho tài khoản quản trị viên được cấp quyền.</span>
        </p>
      ) : (
        <p className="auth-switch">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <button
            className="text-button"
            type="button"
            onClick={() => { setGoogleNotice(null); switchMode(isRegister ? 'login' : 'register') }}
            disabled={isSubmitting || isGoogleLoading}
          >
            {isRegister ? 'Đăng nhập ngay' : 'Tạo tài khoản ngay'}
          </button>
        </p>
      )}


    </>
  )
}
