import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'

export default function AuthField({ name, label, icon, type = 'text', error, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputId = `auth-${name}`
  const descriptionIds = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ')

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={inputId}>{label}</label>
      <div className="field-control" data-invalid={Boolean(error)}>
        <span className="field-icon"><Icon name={icon} /></span>
        <input
          {...inputProps}
          className="field-input"
          id={inputId}
          name={name}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds || undefined}
          required
        />
        {isPassword && (
          <button
            type="button"
            className="field-toggle"
            onClick={() => setVisible((value) => !value)}
            aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
            aria-pressed={visible}
            aria-controls={inputId}
            disabled={inputProps.disabled}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} />
          </button>
        )}
      </div>
      {error && <p className="field-error" id={`${inputId}-error`}>{error}</p>}
      {hint && <p className="field-hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  )
}
