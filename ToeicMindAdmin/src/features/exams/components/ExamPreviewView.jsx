import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { getAdminDirections, getAdminExam, getAdminExamGroups } from '../services/examService.js'
import { errorNotice } from '../utils/apiErrors.js'
import { PART_COUNTS } from '../utils/examContent.js'
import { ApiNotice } from './ApiNotice.jsx'
import { MediaPreview } from './MediaPreview.jsx'
import '../../../styles/exam-preview.css'

const PART_TITLES = [
  'Photographs',
  'Question-Response',
  'Conversations',
  'Talks',
  'Incomplete Sentences',
  'Text Completion',
  'Reading Comprehension',
]

// Trang xem trước: sắp xếp như bài thi thật, chỉ đọc dữ liệu đã lưu.
// Part 1–2 chỉ hiện chữ cái đáp án; chữ, transcript và đáp án chỉ hiện khi bật "Hiện đáp án".
export function ExamPreviewView({ accessToken, examId, onBack }) {
  const tokenRef = useRef(accessToken)
  const [exam, setExam] = useState(null)
  const [groups, setGroups] = useState([])
  const [directions, setDirections] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [nextExam, nextGroups, nextDirections] = await Promise.all([
          getAdminExam(tokenRef.current, examId),
          getAdminExamGroups(tokenRef.current, examId),
          getAdminDirections(tokenRef.current, { examId, effective: true }),
        ])
        if (!active) return
        setExam(nextExam)
        setGroups([...nextGroups].sort((a, b) => a.groupOrder - b.groupOrder))
        setDirections(nextDirections)
        setNotice(null)
      } catch (err) {
        if (active) setNotice(errorNotice(err))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [examId])

  const sectionDirection = (skill) =>
    directions.find((d) => d.directionKind === 'SECTION' && d.skill === skill)
  const partDirection = (partNo) => directions.find((d) => d.directionKind === 'PART' && d.partNo === partNo)
  const totalQuestions = groups.reduce((n, g) => n + g.questions.length, 0)
  const common = { accessToken, groups, showAnswers, showTranslation }

  if (loading) return <p role="status">Đang tải đề để xem trước…</p>

  return (
    <div className="exam-preview">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">XEM TRƯỚC · ĐỀ #{examId}{exam ? ` · ${exam.status}` : ''}</p>
          <h2>{exam?.title || 'Đề thi'}</h2>
          <p className="muted">
            {exam?.examCode ? `Mã đề ${exam.examCode} · ` : ''}
            {totalQuestions} câu. Trang này chỉ đọc dữ liệu đã lưu, không thay đổi đề.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Quay lại biên soạn
        </button>
      </div>
      <ApiNotice notice={notice} />
      {!notice && groups.length === 0 && <p className="admin-empty">Đề chưa có nhóm câu hỏi.</p>}

      <div className="ep-toolbar">
        <label>
          <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Hiện
          đáp án, transcript và giải thích
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
          />{' '}
          Hiện bản dịch tiếng Việt
        </label>
      </div>

      <nav className="ep-nav" aria-label="Mục lục đề thi">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <a key={n} href={`#ep-part-${n}`}>
            Part {n}
          </a>
        ))}
      </nav>

      <section id="ep-listening" className="ep-section">
        <h3>LISTENING TEST</h3>
        <DirectionBlock
          direction={sectionDirection('LISTENING')}
          accessToken={accessToken}
          showTranslation={showTranslation}
        />
        {[1, 2, 3, 4].map((n) => (
          <PartBlock key={n} partNo={n} direction={partDirection(n)} {...common} />
        ))}
      </section>

      <section id="ep-reading" className="ep-section">
        <h3>READING TEST</h3>
        <DirectionBlock
          direction={sectionDirection('READING')}
          accessToken={accessToken}
          showTranslation={showTranslation}
        />
        {[5, 6, 7].map((n) => (
          <PartBlock key={n} partNo={n} direction={partDirection(n)} {...common} />
        ))}
      </section>
    </div>
  )
}

function DirectionBlock({ direction, accessToken, showTranslation }) {
  if (!direction) return null
  return (
    <div className="ep-direction">
      {direction.directionsEn && <p>{direction.directionsEn}</p>}
      {showTranslation && direction.directionsVi && <p className="ep-vi">{direction.directionsVi}</p>}
      {direction.exampleEn && (
        <p>
          <strong>Ví dụ:</strong> {direction.exampleEn}
        </p>
      )}
      {showTranslation && direction.exampleVi && <p className="ep-vi">{direction.exampleVi}</p>}
      {(direction.media || []).map((m) => (
        <div className="ep-media" key={m.mediaId}>
          <MediaPreview
            media={m}
            accessToken={accessToken}
            label={m.mediaType === 'AUDIO' ? 'audio hướng dẫn' : 'ảnh hướng dẫn'}
          />
        </div>
      ))}
    </div>
  )
}

function PartBlock({ partNo, direction, groups, accessToken, showAnswers, showTranslation }) {
  const partGroups = groups.filter((g) => g.partNo === partNo)
  const count = partGroups.reduce((n, g) => n + g.questions.length, 0)
  return (
    <section id={`ep-part-${partNo}`} className="ep-part">
      <h4>
        Part {partNo} · {PART_TITLES[partNo - 1]}{' '}
        <span className="muted">
          ({count}/{PART_COUNTS[partNo - 1]} câu)
        </span>
      </h4>
      <DirectionBlock direction={direction} accessToken={accessToken} showTranslation={showTranslation} />
      {partGroups.length === 0 && <p className="field-error">Part này chưa có nội dung.</p>}
      {partGroups.map((g) => (
        <GroupView
          key={g.groupId}
          group={g}
          accessToken={accessToken}
          showAnswers={showAnswers}
          showTranslation={showTranslation}
        />
      ))}
    </section>
  )
}

function GroupView({ group, accessToken, showAnswers, showTranslation }) {
  const questions = [...group.questions].sort((a, b) => a.questionNo - b.questionNo)
  if (!questions.length) return null
  const first = questions[0].questionNo
  const last = questions[questions.length - 1].questionNo
  const listening = group.partNo <= 4
  const audio = (group.media || []).find((m) => m.mediaType === 'AUDIO')
  const images = (group.media || []).filter((m) => m.mediaType === 'IMAGE')

  return (
    <article className="ep-group">
      <p className="ep-group-range">
        <strong>{first === last ? `Câu ${first}` : `Câu ${first}–${last}`}</strong>
      </p>
      {listening && audio && (
        <div className="ep-media">
          <MediaPreview
            media={audio}
            accessToken={accessToken}
            label={`audio Part ${group.partNo} câu ${first}`}
          />
        </div>
      )}
      {images.map((m) => (
        <div className="ep-media ep-image" key={m.mediaId}>
          <MediaPreview media={m} accessToken={accessToken} label={`hình Part ${group.partNo} câu ${first}`} />
        </div>
      ))}
      {showTranslation && group.translationVi && <p className="ep-vi">{group.translationVi}</p>}
      {group.partNo >= 6 && group.passageHtml && (
        <div
          className="ep-passage"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(group.passageHtml) }}
        />
      )}
      {listening && showAnswers && group.transcriptEn && (
        <details className="ep-transcript-box" open>
          <summary>Transcript</summary>
          <p className="ep-transcript">{group.transcriptEn}</p>
        </details>
      )}
      {questions.map((q) => (
        <QuestionView key={q.questionId} question={q} partNo={group.partNo} showAnswers={showAnswers} />
      ))}
    </article>
  )
}

function QuestionView({ question, partNo, showAnswers }) {
  const textVisible = partNo >= 3 || showAnswers
  const options = [...question.options].sort((a, b) => a.optionLabel.localeCompare(b.optionLabel))
  const correct = options.find((o) => o.isCorrect)
  return (
    <div className="ep-question">
      <p className="ep-question-head">
        <span className="ep-qno">{question.questionNo}.</span>
        {textVisible && question.questionText ? <span> {question.questionText}</span> : null}
      </p>
      <ul className="ep-options">
        {options.map((o) => (
          <li key={o.optionLabel} className={`ep-option${showAnswers && o.isCorrect ? ' is-correct' : ''}`}>
            <span className="ep-option-label">({o.optionLabel})</span>
            {textVisible && <span>{o.optionText}</span>}
          </li>
        ))}
      </ul>
      {showAnswers && (
        <>
          <p className="ep-answer">Đáp án đúng: {correct?.optionLabel || '—'}</p>
          {question.explanation && (
            <p className="ep-explain">
              <strong>Giải thích:</strong> {question.explanation}
            </p>
          )}
          {question.optionExplanations && <pre className="ep-explain-options">{question.optionExplanations}</pre>}
        </>
      )}
    </div>
  )
}