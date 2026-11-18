import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChipLink, PageHero, SegTabs } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import DictationHub from '../dictation/DictationHub.jsx'
import { LearnCard } from './components/LearnCard.jsx'
import { getBankCards, getGrammarTopics, resetBankCard } from './services/bankApi.js'
import { useStartBank } from './useStartBank.js'

const KIND = {
  listen: {
    eyebrow: 'Luyện nghe TOEIC', title: <>Chinh phục TOEIC <em>Listening</em> từ dễ đến khó</>, icon: 'headphones',
    text: 'Nghe chép chính tả và luyện Part 1–4 theo từng level, từ dưới 300 tới trên 900 điểm.',
    tabs: [['dictation', 'Nghe chép'], [1, 'Part 1'], [2, 'Part 2'], [3, 'Part 3'], [4, 'Part 4']],
  },
  read: {
    eyebrow: 'Luyện đọc TOEIC', title: <>Chinh phục TOEIC <em>Reading</em> từ dễ đến khó</>, icon: 'book',
    text: 'Ôn ngữ pháp theo chủ điểm và luyện Part 5–7 theo từng level, từ dưới 300 tới trên 900 điểm.',
    tabs: [['grammar', 'Ngữ pháp'], [5, 'Part 5'], [6, 'Part 6'], [7, 'Part 7']],
  },
}
// [tên gọi cách chia thẻ, tiêu đề mục, mô tả mục]
const BY = {
  1: ['dạng tranh', 'Theo dạng tranh', 'Cùng bộ câu ở trên, chia theo bức tranh mô tả gì. Mỗi câu thuộc đúng một dạng.'],
  2: ['dạng câu hỏi', 'Theo dạng câu hỏi', 'Cùng bộ câu ở trên, chia theo dạng câu hỏi (Wh-, Yes/No, đề nghị…).'],
  3: ['chủ đề', 'Theo chủ đề hội thoại', 'Cùng bộ câu ở trên, chia theo chủ đề của đoạn hội thoại.'],
  4: ['dạng bài nói', 'Theo dạng bài nói', 'Cùng bộ câu ở trên, chia theo dạng bài nói (thông báo, quảng cáo, bản tin…).'],
  5: ['chủ điểm', 'Luyện theo chủ điểm', 'Cùng bộ câu ở trên, chia theo chủ điểm ngữ pháp. Mỗi câu thuộc đúng một chủ điểm.'],
  6: ['dạng bài', 'Theo dạng bài', 'Cùng bộ câu ở trên, chia theo dạng bài điền đoạn văn.'],
  7: ['dạng bài', 'Theo dạng bài', 'Cùng bộ câu ở trên, chia theo dạng bài đọc hiểu.'],
}

// Hộp xác nhận + gọi API xóa tiến độ một thẻ.
function useResetCard(reload) {
  const confirm = useConfirm()
  const toast = useToast()
  return async (partNo, card) => {
    if (!(await confirm({ title: 'Xóa tiến độ', message: 'Xóa tiến độ của mục này để học lại từ đầu?', danger: true, okLabel: 'Xóa tiến độ' }))) return
    try { await resetBankCard(partNo, card.cardKey); toast('Đã xóa tiến độ.', 'success'); reload() } catch (error) { toast(error.message, 'error') }
  }
}

function PartPanel({ partNo }) {
  const navigate = useNavigate()
  const startBank = useStartBank()
  const [params] = useSearchParams()
  const category = params.get('cat') ? Number(params.get('cat')) : ''
  const level = params.get('lv') ? Number(params.get('lv')) : ''
  const { data, error, loading, reload } = useAsync(() => getBankCards(partNo, { categoryId: category, levelNo: level }), [partNo, category, level])
  const reset = useResetCard(reload)
  const [by, sectionTitle, sectionText] = BY[partNo]
  const link = (cat, lv) => {
    const query = new URLSearchParams({ ...(cat && { cat }), ...(lv && { lv }) }).toString()
    return `/${partNo <= 4 ? 'listen' : 'read'}/${partNo}${query ? `?${query}` : ''}`
  }

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const levelNumber = (card) => Number(card.cardKey.replace('level-', ''))
  const startFrom = (extra) => (card, pick) => startBank(partNo, card.cardKey, pick, extra)

  return (
    <>
      <div className="toolbar">
        <select className="select" aria-label={`Lọc theo ${by}`} value={category} onChange={(event) => navigate(link(event.target.value, level))}>
          <option value="">Tất cả {by} ({data.totalQuestions})</option>
          {data.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{'  '.repeat(c.depth || 0)}{c.name} ({c.questionCount})</option>)}
        </select>
        <select className="select" aria-label="Lọc theo level" value={level} onChange={(event) => navigate(link(category, event.target.value))}>
          <option value="">Tất cả level</option>
          {data.levelCards.map((c) => <option key={c.cardKey} value={levelNumber(c)}>{c.name}</option>)}
        </select>
        <span className="spacer" />
        <button type="button" className="btn btn-primary" disabled={!data.totalQuestions} onClick={() => startBank(partNo, 'all', 'NEW', { categoryId: category || undefined, levelNo: level || undefined })}><Icon name="shuffle" size={16} />Luyện ngẫu nhiên</button>
      </div>
      {data.levelCards.length
        ? <div className="grid-cards">{data.levelCards.map((c) => <LearnCard key={c.cardKey} card={c} onStart={startFrom({ categoryId: category || undefined })} onReset={(card) => reset(partNo, card)} />)}</div>
        : <div className="card"><EmptyState>Chưa có câu hỏi nào cho Part này.</EmptyState></div>}
      {data.categoryCards.length > 0 && (
        <>
          <h2 className="section-title">{sectionTitle}</h2>
          <p className="section-sub">{sectionText}</p>
          <div className="grid-cards">{data.categoryCards.map((c) => <LearnCard key={c.cardKey} card={c} onStart={startFrom({ levelNo: level || undefined })} onReset={(card) => reset(partNo, card)} />)}</div>
        </>
      )}
    </>
  )
}

function GrammarPanel() {
  const startBank = useStartBank()
  const [params] = useSearchParams()
  const groupId = params.get('g') ? Number(params.get('g')) : ''
  const { data, error, loading, reload } = useAsync(() => getGrammarTopics(), [])
  const reset = useResetCard(reload)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const groups = groupId ? data.groups.filter((g) => g.categoryId === groupId) : data.groups
  return (
    <>
      <div className="toolbar">
        <nav className="chip-row" aria-label="Nhóm ngữ pháp">
          <ChipLink to="/read/grammar" active={!groupId}>Tất cả</ChipLink>
          {data.groups.map((g) => <ChipLink key={g.categoryId} to={`/read/grammar?g=${g.categoryId}`} active={g.categoryId === groupId}>{g.name}</ChipLink>)}
        </nav>
        <span className="spacer" />
        <button type="button" className="btn btn-primary" disabled={!data.totalQuestions} onClick={() => startBank(5, 'grammar', 'NEW')}><Icon name="shuffle" size={16} />Luyện ngẫu nhiên</button>
      </div>
      <p className="muted small">{data.totalQuestions} câu ngữ pháp · đã luyện {data.practicedCount} · <span className="ok-text">✓ {data.correctCount}</span> · <span className="bad-text">✗ {data.wrongCount}</span></p>
      {groups.length ? groups.map((group) => (
        <section key={group.categoryId}>
          <h2 className="section-title">{group.name}</h2>
          <p className="section-sub">{group.topicCount} chủ điểm · {group.totalQuestions} câu</p>
          <div className="grid-cards">
            {group.topics.map((topic) => (
              <LearnCard key={topic.cardKey} card={{ ...topic, shortLabel: topic.summary, children: [] }} onStart={(card, pick) => startBank(5, card.cardKey, pick)} onReset={(card) => reset(5, card)}>
                <Link className="text-link grammar-topic-link" to={`/read/grammar/topics/${topic.grammarTopicId}`}>
                  <Icon name="book" size={14} />{topic.hasArticle ? 'Đọc bài học' : 'Bài học: đang cập nhật'}
                </Link>
              </LearnCard>
            ))}
          </div>
        </section>
      )) : <div className="card"><EmptyState>Chưa có chủ điểm ngữ pháp nào.</EmptyState></div>}
    </>
  )
}

// Trang Nghe (Nghe chép, Part 1–4) và Đọc (Ngữ pháp, Part 5–7) theo câu chuẩn của đề đã xuất bản.
export default function BankPage({ kind }) {
  const { tab } = useParams()
  const config = KIND[kind]
  useDocumentTitle(kind === 'listen' ? 'Luyện nghe' : 'Luyện đọc')
  if (!config.tabs.some(([key]) => String(key) === tab)) return <Navigate to={`/${kind}/${config.tabs[0][0]}`} replace />
  return (
    <div className="stack">
      <PageHero icon={config.icon} eyebrow={config.eyebrow} title={config.title}>{config.text}</PageHero>
      <SegTabs label={kind === 'listen' ? 'Luyện nghe' : 'Luyện đọc'} items={config.tabs.map(([key, label]) => ({ key, to: `/${kind}/${key}`, label, active: String(key) === tab }))} />
      {tab === 'dictation' ? <DictationHub /> : tab === 'grammar' ? <GrammarPanel /> : <PartPanel key={tab} partNo={Number(tab)} />}
    </div>
  )
}
