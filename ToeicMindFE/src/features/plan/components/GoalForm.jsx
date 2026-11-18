import { useState } from 'react'
import { Chip } from '../../../components/ui/Controls.jsx'
import { DAILY_PRESETS, TARGET_PRESETS, todayIso, validateProfile } from '../planModel.js'
import { saveProfile } from '../services/planApi.js'

// Form mục tiêu học: điểm TOEIC mục tiêu, ngày thi dự kiến, số phút học mỗi ngày.
// required: thiết lập lần đầu (bắt buộc điểm mục tiêu + số phút); không thì ô để trống = không đặt.
// Dùng trong GoalDialog (trang Lộ trình) và trang thiết lập ban đầu (/welcome).
export function GoalForm({ profile, required = false, idPrefix = 'goal', submitLabel = 'Lưu mục tiêu', onSaved, onCancel, onBusyChange, actionsClassName = 'dialog-actions' }) {
  const [values, setValues] = useState({
    targetScore: profile?.targetScore ?? '',
    examDate: profile?.examDate ?? '',
    dailyMinutes: profile?.isSet ? profile.dailyMinutes ?? '' : profile?.dailyMinutes ?? 30,
  })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  const [busy, setBusyState] = useState(false)
  const setBusy = (value) => { setBusyState(value); onBusyChange?.(value) }
  const set = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })) }
  const id = (name) => `${idPrefix}-${name}`
  const mark = required ? <span className="required-mark" aria-hidden="true"> *</span> : null

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const { errors: found, body } = validateProfile(values, todayIso(), { required })
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(id(found.targetScore ? 'target' : found.examDate ? 'date' : 'daily'))?.focus()
      return
    }
    setBusy(true)
    setFailure('')
    try {
      const saved = await saveProfile(body)
      setBusy(false)
      onSaved(saved)
    } catch (error) {
      const fields = error.raw?.errors || {}
      const fieldError = (name) => fields[name]?.[0] || fields[name.charAt(0).toUpperCase() + name.slice(1)]?.[0]
      setErrors({ targetScore: fieldError('targetScore'), examDate: fieldError('examDate'), dailyMinutes: fieldError('dailyMinutes') })
      setFailure(error.message)
      setBusy(false)
    }
  }

  const describe = (key, name) => (errors[key] ? { 'aria-invalid': 'true', 'aria-describedby': id(`${name}-error`) } : {})
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor={id('target')}>Điểm TOEIC mục tiêu (10–990){mark}</label>
        <div className="chip-row" aria-label="Chọn nhanh điểm mục tiêu">
          {TARGET_PRESETS.map((score) => <Chip key={score} active={Number(values.targetScore) === score} onClick={() => set('targetScore', score)}>{score}</Chip>)}
        </div>
        <input id={id('target')} className="input" type="number" inputMode="numeric" min={10} max={990} step={5} placeholder="Ví dụ 650" value={values.targetScore}
          required={required} {...describe('targetScore', 'target')} onChange={(event) => set('targetScore', event.target.value)} />
        {errors.targetScore && <p className="form-error" id={id('target-error')}>{errors.targetScore}</p>}
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={id('date')}>Ngày thi dự kiến (không bắt buộc)</label>
        <input id={id('date')} className="input" type="date" min={todayIso()} value={values.examDate}
          {...describe('examDate', 'date')} onChange={(event) => set('examDate', event.target.value)} />
        {errors.examDate && <p className="form-error" id={id('date-error')}>{errors.examDate}</p>}
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={id('daily')}>Số phút học mỗi ngày{mark}</label>
        <div className="chip-row" aria-label="Chọn nhanh số phút">
          {DAILY_PRESETS.map((minutes) => <Chip key={minutes} active={Number(values.dailyMinutes) === minutes} onClick={() => set('dailyMinutes', minutes)}>{minutes} phút</Chip>)}
        </div>
        <input id={id('daily')} className="input" type="number" inputMode="numeric" min={5} max={600} value={values.dailyMinutes}
          required={required} {...describe('dailyMinutes', 'daily')} onChange={(event) => set('dailyMinutes', event.target.value)} />
        {errors.dailyMinutes && <p className="form-error" id={id('daily-error')}>{errors.dailyMinutes}</p>}
      </div>
      {failure && <p className="form-error" role="alert">{failure}</p>}
      <div className={actionsClassName}>
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Hủy</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : submitLabel}</button>
      </div>
    </form>
  )
}
