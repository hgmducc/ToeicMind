import { useRef } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useStoredState } from '../../../hooks/useStoredState.js'
import { clampSplit } from './studyModel.js'

// Khung màn làm bài (Luyện tập và Luyện thi): thanh trên (Thoát, tên đề, hành động) → vùng nội dung → thanh dưới.
export function StudyLayout({ title, badge, onExit, actions, children, mode, exitLabel = 'Thoát' }) {
  return (
    <div className="study" data-mode={mode}>
      <header className="study-top">
        <button type="button" className="study-exit" onClick={onExit}><Icon name="arrow-left" size={16} />{exitLabel}</button>
        <div className="study-title"><b>{title}</b>{badge}</div>
        <div className="study-actions">{actions}</div>
      </header>
      {children}
    </div>
  )
}

// Hai khung: trái là ngữ cảnh (âm thanh, hình, đoạn văn), phải là câu hỏi. Kéo thanh giữa hoặc dùng phím mũi tên để đổi tỷ lệ; tỷ lệ được nhớ.
export function StudySplit({ left, right }) {
  const [split, setSplit] = useStoredState('toeicmind_fe_study_split', 0.5)
  const box = useRef(null)
  const ratio = clampSplit(split)

  function onPointerDown(event) {
    event.preventDefault()
    const rect = box.current.getBoundingClientRect()
    const move = (e) => setSplit(clampSplit((e.clientX - rect.left) / rect.width))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  function onKeyDown(event) {
    const step = { ArrowLeft: -0.04, ArrowRight: 0.04, Home: -1, End: 1 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    event.stopPropagation()
    setSplit(clampSplit(ratio + step))
  }

  return (
    <div className="study-split" ref={box} style={{ '--study-split': `${ratio * 100}%` }}>
      <section className="study-pane study-pane--context" aria-label="Nội dung câu hỏi">{left}</section>
      <div className="study-divider" role="separator" aria-orientation="vertical" aria-label="Kéo để đổi độ rộng hai khung"
        aria-valuemin={32} aria-valuemax={68} aria-valuenow={Math.round(ratio * 100)} tabIndex={0} onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
        <Icon name="grip-vertical" size={14} />
      </div>
      <section className="study-pane study-pane--questions" aria-label="Câu hỏi và đáp án">{right}</section>
    </div>
  )
}

// Màn chỉ có một khung (hướng dẫn, màn kết thúc của Luyện thi).
export function StudySolo({ children }) {
  return <div className="study-solo"><div className="study-solo-card">{children}</div></div>
}

export function StudyBottom({ tools, children }) {
  return (
    <footer className="study-bottom">
      <div className="study-tools">{tools}</div>
      <div className="study-nav">{children}</div>
    </footer>
  )
}

// Công tắc bật/tắt dạng switch (role="switch") có nhãn chữ.
export function Switch({ checked, onChange, label, icon, disabled = false }) {
  return (
    <button type="button" className="study-switch" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}>
      {icon && <Icon name={icon} size={16} />}
      <span>{label}</span>
      <span className="study-switch-track" aria-hidden="true"><i /></span>
    </button>
  )
}
