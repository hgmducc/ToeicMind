import { sanitizeHtml } from '../../../lib/sanitize.js'

// Khung trái: câu dẫn, âm thanh, gợi ý phím tắt, hình, đoạn văn. HTML đoạn văn luôn qua sanitize.
export function ContextPane({ instruction, audio, shortcuts, media, passageHtml, onMediaError, children }) {
  const images = (media || []).filter((m) => m.mediaType !== 'AUDIO')
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
      {passageHtml && <div className="passage study-passage" dangerouslySetInnerHTML={{ __html: sanitizeHtml(passageHtml) }} />}
      {children}
    </div>
  )
}
