import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pill, ProgressBar } from '../../components/ui/Badges.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDate, percent } from '../../lib/format.js'
import { sanitizeHtml } from '../../lib/sanitize.js'
import { useStartBank } from '../bank/useStartBank.js'
import { ReportDialog } from '../reports/ReportDialog.jsx'
import { lessonProgress, OPTION_LABELS, parseLesson } from './grammarLesson.js'
import { getGrammarTopicArticle } from './services/grammarApi.js'

const Html = ({ html, className }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />

// Một câu "Thử ngay": bấm chọn đáp án → báo đúng/sai, tô đáp án đúng, hiện giải thích; có thể làm lại.
function Quiz({ quiz, number, chosen, onChoose, onReset }) {
  const answered = chosen !== undefined
  const right = chosen === quiz.correctIndex
  return (
    <section className="grammar-quiz" data-state={answered ? (right ? 'right' : 'wrong') : 'open'} aria-label={`Bài tập ${number}`}>
      <p className="grammar-quiz-tag"><Icon name="target" size={14} />Thử ngay · Câu {number}</p>
      <Html className="grammar-quiz-question" html={quiz.questionHtml} />
      <div className="grammar-quiz-options" role="group" aria-label={`Các lựa chọn của câu ${number}`}>
        {quiz.options.map((option, i) => {
          const state = !answered ? undefined : i === quiz.correctIndex ? 'correct' : i === chosen ? 'wrong' : 'dim'
          return (
            <button key={i} type="button" className="grammar-quiz-option" data-state={state} disabled={answered} aria-pressed={chosen === i} onClick={() => onChoose(i)}>
              <span className="grammar-quiz-letter">{OPTION_LABELS[i]}</span>
              <span dangerouslySetInnerHTML={{ __html: option.html }} />
              {state === 'correct' && <Icon name="circle-check" size={16} />}
              {state === 'wrong' && <Icon name="x" size={16} />}
            </button>
          )
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <div className="grammar-quiz-feedback">
            <p className="grammar-quiz-result">{right ? 'Chính xác!' : `Chưa đúng. Đáp án đúng là (${OPTION_LABELS[quiz.correctIndex]}).`}</p>
            {quiz.explainHtml && <Html className="grammar-quiz-explain" html={quiz.explainHtml} />}
            <button type="button" className="text-link" onClick={onReset}><Icon name="refresh" size={13} /> Làm lại câu này</button>
          </div>
        )}
      </div>
    </section>
  )
}

function Article({ topic, article }) {
  const startBank = useStartBank()
  const body = useRef(null)
  const [reporting, setReporting] = useState(false)
  const [answers, setAnswers] = useState({})
  // Lọc HTML (chống XSS) trước khi tách đoạn; mỗi lần nội dung đổi mới tách lại.
  const lesson = useMemo(() => parseLesson(new DOMParser().parseFromString(sanitizeHtml(article.content), 'text/html')), [article.content])
  const progress = lessonProgress(lesson.segments, answers)
  const jump = (id) => body.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const setAnswer = (key, value) => setAnswers((current) => {
    const next = { ...current }
    if (value === undefined) delete next[key]
    else next[key] = value
    return next
  })
  const numbers = useMemo(() => new Map(lesson.segments.filter((s) => s.type === 'quiz').map((s, i) => [s.key, i + 1])), [lesson])

  return (
    <div className="grammar-layout">
      {lesson.sections.length > 1 && (
        <nav className="card grammar-toc" aria-label="Các phần của bài học">
          <span className="muted small grammar-toc-title">Nội dung bài</span>
          {lesson.sections.map((section) => (
            <button key={section.id} type="button" data-done={progress.doneSections.has(section.id) || undefined} onClick={() => jump(section.id)}>
              {progress.doneSections.has(section.id) && <Icon name="check" size={14} />}{section.title}
            </button>
          ))}
          {progress.total > 0 && (
            <div className="grammar-toc-progress">
              <ProgressBar value={percent(progress.answered, progress.total)} label={`Đã làm ${progress.answered}/${progress.total} câu`} />
              <span className="small">Đã làm {progress.answered}/{progress.total} · <span className="ok-text">đúng {progress.correct}</span></span>
            </div>
          )}
        </nav>
      )}
      <article className="card grammar-article" aria-labelledby="grammar-article-title">
        <header className="grammar-article-head">
          <div className="spacer">
            <h2 id="grammar-article-title">{article.title}</h2>
            <p className="muted small">Cập nhật {formatDate(article.updatedAt)}{progress.total ? ` · ${progress.total} câu thử ngay trong bài` : ''}</p>
          </div>
          <button type="button" className="icon-btn" title="Báo lỗi bài này" aria-label={`Báo lỗi bài ${article.title}`} onClick={() => setReporting(true)}><Icon name="flag" size={16} /></button>
        </header>
        <div ref={body} className="grammar-content">
          {lesson.segments.map((segment, i) => {
            if (segment.type === 'html') return <Html key={i} html={segment.html} />
            return <Quiz key={segment.key} quiz={segment} number={numbers.get(segment.key)} chosen={answers[segment.key]} onChoose={(choice) => setAnswer(segment.key, choice)} onReset={() => setAnswer(segment.key, undefined)} />
          })}
        </div>
        <footer className="grammar-article-foot">
          <p className="muted">
            {progress.total > 0 && progress.answered === progress.total
              ? <>Bạn làm đúng <b>{progress.correct}/{progress.total}</b> câu trong bài. Luyện tiếp các câu Part 5 của chủ điểm này nhé.</>
              : 'Đã nắm lý thuyết? Luyện ngay các câu Part 5 của chủ điểm này.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => startBank(5, `cat-${topic.categoryId}`, 'NEW')}><Icon name="play" size={14} />Luyện chủ điểm này</button>
        </footer>
        {reporting && <ReportDialog targetType="GRAMMAR_ARTICLE" targetId={article.articleId} subtitle={`Bài: ${article.title}`} onClose={() => setReporting(false)} />}
      </article>
    </div>
  )
}

// UC-18: bài học tương tác của một chủ điểm ngữ pháp (Part 5): học đến đâu có ví dụ và câu "Thử ngay" đến đó, cuối bài là mẹo TOEIC.
export default function GrammarTopicPage() {
  const { topicId } = useParams()
  const startBank = useStartBank()
  const { data, error, loading, reload } = useAsync(() => getGrammarTopicArticle(topicId), [topicId])
  useDocumentTitle(data?.topic.name ? `Ngữ pháp: ${data.topic.name}` : 'Bài ngữ pháp')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/read/grammar" />

  const { topic, article } = data
  return (
    <div className="stack">
      <div className="page-head">
        <Link className="btn btn-outline btn-sm" to="/read/grammar"><Icon name="chevron-left" size={14} />Ngữ pháp</Link>
        <h1 className="page-title">{topic.name}</h1>
        {topic.groupName && <Pill tone="muted">{topic.groupName}</Pill>}
      </div>
      {topic.summary && <p className="muted">{topic.summary}</p>}
      {article ? <Article key={article.articleId} topic={topic} article={article} /> : (
        <div className="card">
          <EmptyState title="Đang cập nhật" action={<button type="button" className="btn btn-primary" onClick={() => startBank(5, `cat-${topic.categoryId}`, 'NEW')}><Icon name="play" size={14} />Luyện chủ điểm này</button>}>
            Chủ điểm này chưa có bài học. Bạn vẫn có thể luyện câu hỏi của chủ điểm.
          </EmptyState>
        </div>
      )}
    </div>
  )
}
