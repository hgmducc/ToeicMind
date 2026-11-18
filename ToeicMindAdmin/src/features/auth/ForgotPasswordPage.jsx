import { Icon } from '../../components/ui/Icon.jsx'
import AuthField from './components/AuthField.jsx'
import useForgotPassword from './hooks/useForgotPassword.js'

export default function ForgotPasswordPage({ onBack }) {
  const { step, email, values, errors, notice, isSubmitting, changeEmail, changeField, backToStep1, submitEmail, submitReset, resendOtp } = useForgotPassword()

  return (
    <>
      <div className="auth-heading">
        <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
        <h1 className="auth-title">{step === 1 ? 'Quên mật khẩu?' : 'Đặt lại mật khẩu'}</h1>
        <p className="auth-description">
          {step === 1
            ? 'Nhập địa chỉ email để nhận mã OTP xác thực.'
            : `Nhập mã OTP đã gửi đến ${email} và mật khẩu mới của bạn.`}
        </p>
      </div>

      {notice && (
        <div className="form-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
          <span className="notice-icon"><Icon name={notice.kind === 'success' ? 'circle-check' : 'alert-circle'} /></span>
          <div className="notice-content"><strong>{notice.title}</strong><p>{notice.message}</p></div>
        </div>
      )}

      {step === 1 ? (
        <form className="auth-form" noValidate onSubmit={submitEmail} aria-label="Yêu cầu mã OTP" aria-busy={isSubmitting}>
          <AuthField
            name="email" label="Địa chỉ email" icon="mail" type="email"
            value={email} error={errors.email}
            placeholder="Nhập email đã đăng ký" autoComplete="email"
            autoCapitalize="none" spellCheck={false} maxLength={255}
            onChange={changeEmail} disabled={isSubmitting}
          />
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? <><span className="button-spinner" aria-hidden="true" />Đang gửi…</>
              : <>Gửi mã OTP<Icon name="arrow-right" /></>}
          </button>
        </form>
      ) : (
        <form className="auth-form" noValidate onSubmit={submitReset} aria-label="Đặt lại mật khẩu" aria-busy={isSubmitting}>
          <AuthField
            name="otp" label="Mã OTP" icon="key" type="text"
            value={values.otp} error={errors.otp}
            placeholder="Nhập 6 chữ số" autoComplete="one-time-code"
            inputMode="numeric" maxLength={6}
            onChange={changeField} disabled={isSubmitting}
          />
          <AuthField
            name="newPassword" label="Mật khẩu mới" icon="lock" type="password"
            value={values.newPassword} error={errors.newPassword}
            placeholder="Ít nhất 6 ký tự" autoComplete="new-password" maxLength={72}
            hint="Sử dụng ít nhất 6 ký tự cho mật khẩu."
            onChange={changeField} disabled={isSubmitting}
          />
          <AuthField
            name="confirmNewPassword" label="Xác nhận mật khẩu mới" icon="lock" type="password"
            value={values.confirmNewPassword} error={errors.confirmNewPassword}
            placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" maxLength={72}
            onChange={changeField} disabled={isSubmitting}
          />
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? <><span className="button-spinner" aria-hidden="true" />Đang xử lý…</>
              : <>Đặt lại mật khẩu<Icon name="arrow-right" /></>}
          </button>
          <div className="forgot-otp-actions">
            <button type="button" className="text-button" onClick={resendOtp} disabled={isSubmitting}>
              <Icon name="refresh-cw" size={14} />Gửi lại mã OTP
            </button>
            <button type="button" className="text-button" onClick={backToStep1} disabled={isSubmitting}>
              Đổi email
            </button>
          </div>
        </form>
      )}

      <p className="auth-switch">
        <button className="text-button" type="button" onClick={onBack} disabled={isSubmitting}>
          <Icon name="arrow-left" size={14} />Quay lại đăng nhập
        </button>
      </p>
    </>
  )
}
