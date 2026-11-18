import { Link, useSearchParams } from 'react-router-dom'
import { Pill, ProgressBar, VipPill } from '../../components/ui/Badges.jsx'
import { ChipLink } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { percent } from '../../lib/format.js'
import { ItemList } from './components/ItemList.jsx'
import { getDictationExams, getDictationSets, getDictationTopics } from './services/dictationApi.js'

function PartCard({ setId, exam, part }) {
  const done = percent(part.practicedItems, part.itemCount)
  const to = `/dictation/items?examSetId=${setId}&examId=${exam.examId}&partNo=${part.partNo}`
  return (
    <article className="dcard">
      <div className="dcard-top"><Pill>Part {part.partNo}</Pill>{part.needsPracticeItems > 0 && <Pill tone="warning">{part.needsPracticeItems} cần luyện</Pill>}</div>
      <b className="dcard-title">{part.partName}</b>
      <p className="dcard-count"><Icon name="headphones" size={20} /> {part.itemCount} <small>bộ</small> <small>·</small> {part.clipCount} <small>clip</small></p>
      <ProgressBar value={done} label={`${part.practicedItems}/${part.itemCount} bộ đã luyện`} />
      <div className="dcard-foot">
        <span>{part.itemCount ? (part.practicedItems ? `Đã luyện ${part.practicedItems}/${part.itemCount} bộ` : 'Chưa bắt đầu') : 'Chưa có clip'}</span>
        {part.itemCount ? <Link className="btn btn-primary btn-sm" to={to}>Luyện tập<Icon name="chevron-right" size={13} /></Link> : <span className="btn btn-primary btn-sm" aria-disabled="true">Luyện tập</span>}
      </div>
    </article>
  )
}

function SetExams({ setId }) {
  const { data, error, loading, reload } = useAsync(() => getDictationExams(setId), [setId])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.length) return <div className="card"><EmptyState>Bộ đề này chưa có clip nghe chép.</EmptyState></div>
  return data.map((exam) => (
    <section key={exam.examId}>
      <h2 className="testh">{exam.title} <VipPill locked={exam.isLocked} /></h2>
      <div className="grid-cards">{exam.parts.map((part) => <PartCard key={part.partNo} setId={setId} exam={exam} part={part} />)}</div>
    </section>
  ))
}

// "Theo chủ đề": loại bài, level và dạng đặc biệt của một Part (1–4).
function Topics({ part }) {
  const { data, error, loading, reload } = useAsync(() => getDictationTopics(part), [part])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const link = (extra) => `/dictation/items?${new URLSearchParams({ partNo: part, ...extra })}`
  const roots = data.categories.filter((c) => !c.parentCategoryId || !data.categories.some((p) => p.categoryId === c.parentCategoryId))
  const children = (id) => data.categories.filter((c) => c.parentCategoryId === id)
  const flat = roots.filter((r) => !children(r.categoryId).length)
  const grouped = roots.filter((r) => children(r.categoryId).length)
  const topic = (key, to, name, count, practiced, total) => (
    <Link key={key} to={to} className="study-card study-card--compact">
      <h3>{name}</h3><p className="muted small">{count}</p>
      {total > 0 && <><ProgressBar value={percent(practiced, total)} label={`Đã luyện ${practiced}/${total}`} /><p className={`small ${practiced ? 'ok-text' : 'muted'}`}>Đã luyện {practiced}/{total}</p></>}
    </Link>
  )
  const category = (c) => topic(c.categoryId, link({ categoryId: c.categoryId }), c.name, `${c.itemCount} bộ · ${c.clipCount} clip`, c.practicedItems, c.itemCount)
  return (
    <div className="stack">
      <nav className="chip-row" aria-label="Chọn Part">{[1, 2, 3, 4].map((p) => <ChipLink key={p} to={`/listen/dictation?view=topics&part=${p}`} active={part === p}>Part {p}</ChipLink>)}</nav>
      {data.categories.length > 0 && (
        <section>
          <h2 className="section-title">Theo loại bài</h2><p className="section-sub">Chọn loại bài bạn muốn nghe chép.</p>
          {flat.length > 0 && <div className="grid-cards">{flat.map(category)}</div>}
          {grouped.map((root) => (
            <div key={root.categoryId}><h3 className="topic-group">{root.name} <span className="small">({root.itemCount} bộ)</span></h3><div className="grid-cards">{children(root.categoryId).map(category)}</div></div>
          ))}
        </section>
      )}
      {data.levels.length > 0 && <section><h2 className="section-title">Theo level</h2><p className="section-sub">Từ dễ đến khó.</p><div className="grid-cards">{data.levels.map((l) => topic(`l${l.levelNo}`, link({ levelNo: l.levelNo }), l.name, `${l.itemCount} bộ · ${l.clipCount} clip`, 0, 0))}</div></section>}
      {data.specialTags.length > 0 && <section><h2 className="section-title">Dạng đặc biệt</h2><p className="section-sub">Các dạng câu hay gặp, đáng luyện riêng.</p><div className="grid-cards">{data.specialTags.map((t) => topic(`t${t.specialTagId}`, link({ specialTagId: t.specialTagId }), t.name, `${t.itemCount} bộ · ${t.clipCount} clip`, 0, 0))}</div></section>}
      {!data.categories.length && !data.levels.length && !data.specialTags.length && <div className="card"><EmptyState>Chưa có dữ liệu để lọc theo chủ đề.</EmptyState></div>}
    </div>
  )
}

// Tab "Nghe chép" của trang Nghe: chọn bộ đề, chủ đề hoặc câu cần luyện.
export default function DictationHub() {
  const [params] = useSearchParams()
  const view = params.get('view') || ''
  const { data, error, loading, reload } = useAsync(getDictationSets, [])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const setId = view ? 0 : params.get('set') ? Number(params.get('set')) : data.sets[0]?.examSetId || 0
  const part = [1, 2, 3, 4].includes(Number(params.get('part'))) ? Number(params.get('part')) : 1
  return (
    <div className="stack">
      <nav className="chip-row" aria-label="Bộ đề nghe chép">
        {data.sets.map((set) => <ChipLink key={set.examSetId} to={`/listen/dictation?set=${set.examSetId}`} active={set.examSetId === setId}>{set.name}{set.isLocked && <VipPill />}</ChipLink>)}
        <ChipLink to="/listen/dictation?view=topics" active={view === 'topics'}>Theo chủ đề</ChipLink>
        {data.standaloneItems > 0 && <ChipLink to="/listen/dictation?view=standalone" active={view === 'standalone'}>Clip sưu tầm ({data.standaloneItems})</ChipLink>}
        <ChipLink to="/listen/dictation?view=needs" active={view === 'needs'} tone="warning"><Icon name="flag" size={13} />Câu cần luyện{data.needsPracticeItems ? ` (${data.needsPracticeItems})` : ''}</ChipLink>
      </nav>
      {view === 'needs' ? <ItemList fixed={{ status: 'NEEDS_PRACTICE' }} hideStatus />
        : view === 'standalone' ? <ItemList fixed={{ source: 'STANDALONE' }} />
        : view === 'topics' ? <Topics part={part} />
          : !data.sets.length ? <div className="card"><EmptyState>{data.standaloneItems ? 'Chưa có đề nào có clip; hãy luyện ở mục Clip sưu tầm.' : 'Chưa có bài nghe chép nào.'}</EmptyState></div>
            : <SetExams setId={setId} />}
    </div>
  )
}
