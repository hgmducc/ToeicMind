import { HighlightablePassage } from './HighlightablePassage.jsx'
import { StudyPanel } from './StudyLayout.jsx'

// Khung trái: câu dẫn, âm thanh, gợi ý phím tắt, hình, đoạn văn. HTML đoạn văn luôn qua sanitize.
export function ContextPane({ instruction, audio, shortcuts, media, passageHtml, passageTranslation, passageKey, panels, onMediaError, children }) {
  const images = (media || []).filter((m) => m.mediaType !== 'AUDIO')
  const translation = passageHtml && passageTranslation?.trim()
  return (
    <div className="study-context">
      {instruction && <p className="study-instruction">{instruction}</p>}
      {audio}
      {shortcuts?.length > 0 && (
        <ul className="study-keys" aria-label="Phím tắt">
          {shortcuts.map(([key, label]) => <li key={key}><kbd>{key}</kbd>{label}</li>)}
        </ul>
      )}
      {images.map((m, i) => <img key={`${m.url}-${i}`} className="study-image" alt={m.altText || 'Hình của nhóm câu'} src={m.url} loading="lazy" onError={onMediaError} />)}
      {passageHtml && <HighlightablePassage key={passageKey} html={passageHtml} storageKey={`toeicmind_fe_passage_highlights_${passageKey}`} />}
      {translation && panels && (
        <StudyPanel icon="languages" label="Bản dịch đoạn văn" open={panels.open.passageTranslation ?? false}
          onToggle={panels.toggle('passageTranslation')}>
          <p className="preserve-lines" lang="vi">{translation}</p>
        </StudyPanel>
      )}
      {children}
    </div>
  )
}
