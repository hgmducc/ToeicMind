import { Pill, VipPill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'

// Thẻ học của ngân hàng câu hỏi: trạng thái, Học ngay, làm lại câu sai/toàn bộ, xóa tiến độ.
export function LearnCard({ card, onStart, onReset, children }) {
  const practiced = card.practicedCount > 0
  return (
    <article className="study-card" data-done={card.status === 'DONE'}>
      <h3>{card.name}</h3>
      {card.shortLabel && <p className="muted small">{card.shortLabel}</p>}
      {card.children?.length > 0 && <div className="tag-row">{card.children.slice(0, 6).map((child) => <Pill key={child}>{child}</Pill>)}</div>}
      <p className="study-card-status">
        {practiced
          ? <><b>{card.practicedCount}/{card.totalQuestions}</b> <span className="ok-text">✓ {card.correctCount}</span> <span className="bad-text">✗ {card.wrongCount}</span></>
          : `Chưa luyện tập · ${card.totalQuestions} câu`}
        {card.lockedCount > 0 && <span className="small"> <VipPill /> {card.lockedCount} câu cần VIP</span>}
      </p>
      {children}
      <div className="study-card-actions">
        <button type="button" className="icon-btn" title="Làm lại các câu sai" aria-label={`Làm lại các câu sai: ${card.name}`} disabled={!card.wrongCount} onClick={() => onStart(card, 'WRONG')}><Icon name="refresh" size={17} /></button>
        <button type="button" className="icon-btn" title="Làm lại toàn bộ" aria-label={`Làm lại toàn bộ: ${card.name}`} disabled={!card.totalQuestions} onClick={() => onStart(card, 'ALL')}><Icon name="shuffle" size={17} /></button>
        <button type="button" className="icon-btn" data-tone="danger" title="Xóa tiến độ" aria-label={`Xóa tiến độ: ${card.name}`} disabled={!practiced} onClick={() => onReset(card)}><Icon name="trash" size={17} /></button>
        <span className="spacer" />
        <button type="button" className="btn btn-secondary btn-sm" disabled={!card.totalQuestions} onClick={() => onStart(card, 'NEW')}>Học ngay</button>
      </div>
    </article>
  )
}
