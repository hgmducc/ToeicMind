import { useEffect, useRef, useState } from 'react'
import {
  checkPublishExam,
  createAdminExamSet,
  getAdminExam,
  getAdminExamGroups,
  getAllExamSets,
  getExamCatalog,
  getImportSource,
  publishExam,
  saveExamContent,
  updateAdminExam,
  uploadGroupMedia,
  uploadSegmentMedia,
} from '../services/examService.js'
import {
  convertRowsToGroups,
  downloadExcelTemplate,
  parseExcelQuestions,
  parseFolderFiles,
  readDroppedFiles,
  releaseFolderFiles,
} from '../utils/folderParser.js'
import {
  contentCounts,
  contentIssues,
  fromServerGroup,
  groupPayload,
  PART_COUNTS,
  PART_GROUP_LIMITS,
  PART_STARTS,
  sourceIssues,
} from '../utils/examContent.js'
import { ACCESS_LABEL, SetAccessBadges } from './AccessControls.jsx'
import { ApiNotice } from './ApiNotice.jsx'
import { errorNotice } from '../utils/apiErrors.js'
import { ExamQuestionEditor } from './ExamQuestionEditor.jsx'
import { ExamPreviewView } from './ExamPreviewView.jsx'
import { PublishCheckModal } from './PublishCheckModal.jsx'
import { SheetPreview } from './SheetPreview.jsx'
import { DirectionsEditor } from './DirectionsEditor.jsx'


  // Khóa ghép nhóm: tập số câu của nhóm (duy nhất trong đề)
const questionKey = (group) =>
  (group.questions || [])
    .map((q) => Number(q.questionNo))
    .sort((a, b) => a - b)
    .join(',')

// Nhóm có file chọn trên máy nhưng chưa được tải lên
const hasPendingMedia = (group) =>
  !!group.audioFile ||
  (group.imageFiles?.length || 0) > 0 ||
  (group.audioSegments || []).some((s) => s.audioFile)

// Ghép nhóm đọc từ máy chủ với nhóm đang biên soạn (giữ file chọn trên máy)
function mergeLocalMedia(serverGroups, localGroups) {
  const byKey = new Map(localGroups.map((l) => [questionKey(l), l]))
  return serverGroups.map((s) =>
    fromServerGroup(s, byKey.get(questionKey(s)) || localGroups.find((l) => l.groupOrder === s.groupOrder)),
  )
}

// Danh sách tác vụ upload media cho các nhóm đã có groupId trên máy chủ
function buildMediaJobs(token, examId, groups) {
  const jobs = []
  for (const g of groups) {
    const label = `nhóm câu ${g.groupOrder}`
    if (g.audioFile)
      jobs.push({
        label: `Audio ${label}`,
        run: () => uploadGroupMedia(token, examId, g.groupId, g.audioFile),
        done: () => {
          g.audioFile = null
        },
      })
    for (const s of g.audioSegments || [])
      if (s.audioFile)
        jobs.push({
          label: `Clip ${s.clip_id} (${label})`,
          run: () => uploadSegmentMedia(token, examId, g.groupId, s.clipId, s.audioFile),
          done: () => {
            s.audioFile = null
          },
        })
    for (const [i, file] of (g.imageFiles || []).entries())
      jobs.push({
        label: `Ảnh ${file.name} (${label})`,
        run: () => uploadGroupMedia(token, examId, g.groupId, file, { sortOrder: Math.min(i + 1, 255) }),
        done: () => {
          const index = g.imageFiles.indexOf(file)
          if (index >= 0) {
            g.imageFiles = g.imageFiles.filter((_, j) => j !== index)
            g.imagePreviewUrls = (g.imagePreviewUrls || []).filter((_, j) => j !== index)
          }
        },
      })
  }
  return jobs
}

export function ExamUploadView({ session, examId, onDirtyChange, onNavigateToExams }) {
  const { accessToken } = session
  const tokenRef = useRef(accessToken),
    folderRef = useRef(null),
    fileRef = useRef(null),
    resources = useRef(new Set()),
    busyRef = useRef(false)
  const contentDirty = useRef(false)
  const [catalog, setCatalog] = useState({}),
    [sets, setSets] = useState([]),
    [groups, setGroups] = useState([])
  const [meta, setMeta] = useState({ examSetId: '', examCode: '', title: '', description: '', accessLevel: '' })
  const currentSet = sets.find((s) => String(s.examSetId) === String(meta.examSetId))
  const [savedExam, setSavedExam] = useState(null),
    [sourceErrors, setSourceErrors] = useState([]),
    [folder, setFolder] = useState(null)
  const [activePart, setActivePart] = useState(1),
    [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [retry, setRetry] = useState(0)
  const [notice, setNotice] = useState(null),
    [issuesVisible, setIssuesVisible] = useState(false),
    [progress, setProgress] = useState('')
  const [newSet, setNewSet] = useState(''),
    [modal, setModal] = useState(null),
    [sourceSheets, setSourceSheets] = useState(null),
    [previewing, setPreviewing] = useState(false)
  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [nextCatalog, nextSets, exam, storedGroups, source] = await Promise.all([
          getExamCatalog(tokenRef.current),
          getAllExamSets(tokenRef.current),
          examId ? getAdminExam(tokenRef.current, examId) : null,
          examId ? getAdminExamGroups(tokenRef.current, examId) : [],
          examId ? getImportSource(tokenRef.current, examId) : null,
        ])
        if (!active) return
        setCatalog(nextCatalog)
        setSets(nextSets)
        if (exam) {
          setSavedExam(exam)
          setMeta(exam)
          setGroups(storedGroups.map((g) => fromServerGroup(g)))
          setSourceSheets(source)
        } else setMeta((m) => ({ ...m, examSetId: nextSets[0]?.examSetId || '' }))
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
  }, [examId, retry])
  useEffect(() => {
    for (const g of groups)
      for (const url of [
        g.audioPreviewUrl,
        ...(g.imagePreviewUrls || []),
        ...(g.audioSegments || []).map((s) => s.previewUrl),
      ])
        if (url?.startsWith('blob:')) resources.current.add(url)
  }, [groups])
  useEffect(() => {
    const urls = resources.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])
  useEffect(() => {
    const warn = (e) => {
      if (dirty || busy) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])

  function markDirty(value = true) {
    setDirty(value)
    onDirtyChange?.(value)
  }
  function updateMeta(field, value) {
    setMeta((m) => ({ ...m, [field]: value }))
    markDirty()
  }
  const counts = contentCounts(groups)
  const inputIssues = [...sourceErrors, ...contentIssues(groups, catalog)]
  const readOnly = savedExam?.status === 'PUBLISHED'
  const filtered = groups.filter((g) => g.partNo === activePart)
  const linkedFiles = new Set(
    groups
      .flatMap((g) => [
        g.audioFile,
        ...(g.imageFiles || []),
        ...(g.audioSegments || []).map((s) => s.audioFile),
      ])
      .filter(Boolean),
  )
  const unusedFiles = savedExam ? [] : (folder?.mediaFiles || []).filter((m) => !linkedFiles.has(m.file))
  const lastPage = Math.max(1, Math.ceil(filtered.length / 5)),
    currentPage = Math.min(page, lastPage)

  async function selectFiles(files) {
    if (!files?.length || busyRef.current || readOnly) return
    if (dirty && !window.confirm('Thay nội dung đang biên soạn bằng file Excel vừa chọn?')) return
    busyRef.current = true
    setBusy(true)
    setNotice(null)
    let nextFolder
    try {
      nextFolder = parseFolderFiles(files)
      if (nextFolder.excelFiles.length > 1)
        throw new Error(
          'Thư mục có nhiều file Excel. Hãy giữ một file chính hoặc dùng “Chọn Excel và media”.',
        )
      const nextWorkbook = await parseExcelQuestions(nextFolder.excelFile)
      const nextGroups = convertRowsToGroups(
        nextWorkbook.rows,
        nextFolder.mediaIndex,
        nextWorkbook.segments,
        nextWorkbook.vocabRows,
        catalog,
      )
      if (nextGroups.length === 0) throw new Error('Không đọc được nhóm câu hỏi từ Questions.')
      setFolder(nextFolder)
      setSourceErrors(sourceIssues(nextWorkbook, nextGroups))
      setSourceSheets(nextWorkbook.sourceSheets)
      setGroups(nextGroups)
      setActivePart(1)
      setPage(1)
      setIssuesVisible(true)
      contentDirty.current = true
      markDirty()
      setMeta((m) => ({ ...m, title: m.title || nextFolder.excelFile.name.replace(/\.[^.]+$/, '') }))
      setNotice({
        kind: 'info',
        text: `Đã đọc ${nextWorkbook.rows.length} câu và ${Object.keys(nextWorkbook.sourceSheets).length} sheet. Dữ liệu đang ở bước xem trước, chưa lưu lên hệ thống.`,
      })
    } catch (err) {
      releaseFolderFiles(nextFolder)
      setNotice(errorNotice(err))
    } finally {
      busyRef.current = false
      setBusy(false)
      if (folderRef.current) folderRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function updateGroup(group) {
    setGroups((all) =>
      all.map((g) =>
        g.tempId === group.tempId
          ? { ...group, groupOrder: Math.min(...group.questions.map((q) => q.questionNo)) }
          : g,
      ),
    )
    contentDirty.current = true
    markDirty()
  }
  function addGroup() {
    const used = new Set(groups.flatMap((g) => g.questions.map((q) => q.questionNo)))
    const first = PART_STARTS[activePart - 1],
      end = first + PART_COUNTS[activePart - 1]
    const questionNo = Array.from({ length: end - first }, (_, i) => i + first).find((n) => !used.has(n))
    if (!questionNo) {
      setNotice({ kind: 'error', text: 'Part này đã đủ số câu. Hãy sửa nhóm đang có.' })
      return
    }
    setGroups((all) => [
      ...all,
      {
        tempId: crypto.randomUUID(),
        partNo: activePart,
        groupOrder: questionNo,
        categoryId: null,
        groupLevelNo: null,
        specialTagIds: [],
        audioSegments: [],
        questions: [
          {
            questionNo,
            levelNo: null,
            questionText: '',
            explanation: '',
            optionExplanations: '',
            vocabularies: [],
            options: [...(activePart === 2 ? 'ABC' : 'ABCD')].map((optionLabel) => ({
              optionLabel,
              optionText: '',
              isCorrect: false,
            })),
          },
        ],
      },
    ])
    setPage(lastPage)
    contentDirty.current = true
    markDirty()
  }

  async function createSet() {
    if (!newSet.trim() || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const created = await createAdminExamSet(tokenRef.current, { name: newSet.trim(), description: null })
      setSets((all) => [...all, created])
      updateMeta('examSetId', created.examSetId)
      setNewSet('')
    } catch (err) {
      setNotice(errorNotice(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function save() {
    if (busyRef.current) return
    setIssuesVisible(true)
    if (!meta.examSetId || !meta.title.trim() || !groups.length || inputIssues.length) {
      setNotice({
        kind: 'error',
        text: 'Chọn bộ đề, nhập tên đề và sửa các lỗi dữ liệu trước khi lưu. Chưa gửi nội dung lên hệ thống.',
      })
      return
    }
    if (meta.examCode && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/.test(meta.examCode)) {
      setNotice({
        kind: 'error',
        text: 'Mã đề tối đa 30 ký tự, chỉ gồm chữ, số, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ/số.',
      })
      return
    }
    busyRef.current = true
    setBusy(true)
    setNotice(null)
    setProgress('Đang lưu nội dung trong một giao dịch…')
    const token = tokenRef.current
    try {
      const exam = await saveExamContent(token, savedExam?.examId, {
        examSetId: Number(meta.examSetId),
        examCode: meta.examCode.trim() || null,
        title: meta.title.trim(),
        description: meta.description?.trim() || null,
        accessLevel: meta.accessLevel || null,
        groups: groups.map(groupPayload),
        sourceSheets,
      })
      setSavedExam(exam)
      setMeta(exam)

      // Nội dung đã lưu; media luôn được thử tải lên, kể cả khi số liệu đọc lại lệch
      let stored = mergeLocalMedia(await getAdminExamGroups(token, exam.examId), groups)
      const expected = contentCounts(groups),
        actual = contentCounts(stored)
      const countMismatch = ['groups', 'questions', 'vocab', 'segments'].some(
        (key) => expected[key] !== actual[key],
      )
      const storedKeys = new Set(stored.map(questionKey))
      const unmatched = groups.filter((l) => hasPendingMedia(l) && !storedKeys.has(questionKey(l)))

      const jobs = buildMediaJobs(token, exam.examId, stored)
      const failures = []
      for (const [index, job] of jobs.entries()) {
        setProgress(`Đang tải media ${index + 1}/${jobs.length}: ${job.label}`)
        try {
          await job.run()
          job.done()
        } catch (err) {
          failures.push({
            message: `${job.label}: ${err.message}${err.code ? ` (${err.code})` : ''}`,
          })
          if (err?.status === 401 || err?.code === 'UNAUTHORIZED' || err?.code === 'INVALID_REFRESH_TOKEN') {
            break
          }
        }
      }

      // Đọc lại để hiển thị đúng trạng thái media trên máy chủ
      stored = mergeLocalMedia(await getAdminExamGroups(token, exam.examId), stored)
      const listening = stored.filter((g) => g.partNo <= 4)
      const missingAudio = listening.filter((g) => !g.media?.some((m) => m.mediaType === 'AUDIO'))
      const missingImage = stored.filter((g) => g.partNo === 1 && !g.media?.some((m) => m.mediaType === 'IMAGE'))
      const problems = [
        ...(countMismatch
          ? [{ message: 'Số liệu đọc lại từ máy chủ lệch bản xem trước. Nội dung đã lưu; hãy kiểm tra lại nhóm câu.' }]
          : []),
        ...failures,
        ...unmatched.map((l) => ({
          message: `Nhóm câu ${l.groupOrder}: file đã chọn không khớp nhóm đã lưu, hãy chọn lại.`,
        })),
        ...missingAudio.map((g) => ({
          message: `Part ${g.partNo} · câu ${g.groupOrder}: chưa có audio chính trên máy chủ (bắt buộc để xuất bản).`,
        })),
        ...missingImage.map((g) => ({
          message: `Part 1 · câu ${g.groupOrder}: chưa có hình trên máy chủ.`,
        })),
      ]
      const needRetry = failures.length > 0 || unmatched.length > 0
      contentDirty.current = needRetry
      markDirty(needRetry)
      setGroups(stored)
      setNotice({
        kind: problems.length ? 'error' : 'success',
        text:
          `Đề #${exam.examId}: đã lưu nội dung, ${listening.length - missingAudio.length}/${listening.length} nhóm Listening có audio chính trên máy chủ.` +
          (failures.length ? ` ${failures.length} tệp chưa tải được; bấm Lưu để thử lại.` : '') +
          (problems.length ? ' Xem danh sách bên dưới.' : ' Đã đủ media.'),
        details: problems,
      })
    } catch (err) {
      setNotice(errorNotice(err))
      markDirty()
    } finally {
      busyRef.current = false
      setBusy(false)
      setProgress('')
    }
  }

  async function saveMetadata() {
    if (busyRef.current || !savedExam || !meta.title.trim()) return
    busyRef.current = true
    setBusy(true)
    try {
      const exam = await updateAdminExam(tokenRef.current, savedExam.examId, meta)
      setSavedExam(exam)
      setMeta(exam)
      markDirty(contentDirty.current)
      setNotice({ kind: 'success', text: 'Đã lưu thông tin đề thi.' })
    } catch (err) {
      setNotice(errorNotice(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function checkPublish() {
    if (!savedExam || dirty) {
      setNotice({ kind: 'error', text: 'Lưu toàn bộ thay đổi trước khi kiểm tra xuất bản.' })
      return
    }
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      setModal(await checkPublishExam(tokenRef.current, savedExam.examId))
    } catch (err) {
      setNotice(errorNotice(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  async function confirmPublish() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await publishExam(tokenRef.current, savedExam.examId)
      setSavedExam((e) => ({ ...e, status: 'PUBLISHED' }))
      setModal(null)
      setNotice({ kind: 'success', text: 'Backend đã xác nhận xuất bản đề thi.' })
    } catch (err) {
      setNotice(errorNotice(err))
      if (err.raw?.issues) setModal({ isValid: false, issues: err.raw.issues })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  function jump(issue) {
    const group = groups.find(
      (g) =>
        g.groupId === issue.groupId ||
        g.questions.some(
          (q) => (q.questionId === issue.questionId && issue.questionId) || q.questionNo === issue.questionNo,
        ),
    )
    const part = issue.partNo || group?.partNo
    if (!part) return
    setActivePart(part)
    const index = groups.filter((g) => g.partNo === part).findIndex((g) => g.tempId === group?.tempId)
    setPage(index < 0 ? 1 : Math.floor(index / 5) + 1)
    setTimeout(
      () =>
        document
          .getElementById(`group-p${part}-q${group?.groupOrder || issue.questionNo}`)
          ?.scrollIntoView({ block: 'start' }),
      0,
    )
  }

  if (loading) return <p role="status">Đang tải danh mục và nội dung đề…</p>
  if (!catalog.parts)
    return (
      <>
        <ApiNotice notice={notice} />
        <button className="btn btn-outline" onClick={() => setRetry((n) => n + 1)}>
          Thử tải lại
        </button>
      </>
    )
  // Trang xem trước dùng dữ liệu đã lưu, nên chỉ mở khi không còn thay đổi chưa lưu
  if (previewing && savedExam)
    return <ExamPreviewView accessToken={accessToken} examId={savedExam.examId} onBack={() => setPreviewing(false)} />
  return (
    <div className="exam-upload-page">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">
            {savedExam ? `ĐỀ #${savedExam.examId} · ${savedExam.status}` : 'NHẬP ĐỀ MỚI'}
          </p>
          <h2>Biên soạn đề thi</h2>
          <p className="muted">Xem trước dữ liệu, sửa lỗi và đối soát trước khi xuất bản.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || !savedExam || dirty}
            title={!savedExam || dirty ? 'Lưu nội dung trước khi xem trước' : 'Xem đề như bài thi thật'}
            onClick={() => setPreviewing(true)}
          >
            Xem trước đề
          </button>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onNavigateToExams}>
            Danh sách đề
          </button>
        </div>
      </div>
      <ApiNotice notice={notice} />
      {!!savedExam?.importWarnings?.length && (
        <ApiNotice
          notice={{
            kind: 'info',
            text: `Đã giữ nghĩa gốc đang lưu cho ${savedExam.importWarnings.length} dòng từ vựng. Nghĩa theo ngữ cảnh được lưu riêng.`,
            details: savedExam.importWarnings,
          }}
        />
      )}
      {readOnly && (
        <ApiNotice
          notice={{
            kind: 'info',
            text: 'Đề đã xuất bản. Chuyển về nháp trong danh sách đề để chỉnh sửa. Đề có lịch sử làm bài vẫn bị khóa.',
          }}
        />
      )}
      <fieldset disabled={busy || readOnly} className="editor-fieldset">
        <section className="admin-card">
          <div className="admin-card-header">
            <h3>1. Chọn dữ liệu</h3>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => downloadExcelTemplate().catch((e) => setNotice(errorNotice(e)))}
            >
              Tải mẫu Excel
            </button>
          </div>
          <div
            className="folder-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              if (!busy && !readOnly) {
                try {
                  await selectFiles(await readDroppedFiles(e.dataTransfer))
                } catch (err) {
                  setNotice(errorNotice(err))
                }
              }
            }}
          >
            <h3>Thả thư mục chứa Excel, audio và ảnh vào đây</h3>
            <p>
              Đọc Questions, Vocab, Audio_Segments và giữ đủ các sheet nguồn. Có thể chọn riêng Excel để kiểm
              tra nội dung trước.
            </p>
            <div className="admin-actions">
              <button type="button" className="btn btn-primary" onClick={() => folderRef.current.click()}>
                Chọn thư mục bộ đề
              </button>
              <button type="button" className="btn btn-outline" onClick={() => fileRef.current.click()}>
                Chọn Excel và media
              </button>
            </div>
            <input
              ref={folderRef}
              type="file"
              webkitdirectory="true"
              multiple
              hidden
              aria-label="Thư mục bộ đề"
              onChange={(e) => selectFiles(e.target.files)}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.mp3,.wav,.png,.jpg,.jpeg"
              multiple
              hidden
              aria-label="Excel và media"
              onChange={(e) => selectFiles(e.target.files)}
            />
          </div>
          {folder && (
            <p className="muted">
              {folder.excelFile.name} · {folder.totalFiles} tệp đã chọn
            </p>
          )}
          <div className="intake-summary-bar">
            {[
              ['Câu hỏi', counts.questions],
              ['Nhóm', counts.groups],
              ['Vocab', counts.vocab],
              ['Audio cắt', `${counts.clips}/${counts.segments} tệp`],
              ['Audio chính', `${counts.audio}/${groups.filter((g) => g.partNo <= 4).length}`],
              ['Ảnh', counts.images],
            ].map(([label, value]) => (
              <div className="intake-stat-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {counts.clips < counts.segments && (
            <p className="field-error">
              Còn {counts.segments - counts.clips} phân đoạn chưa có tệp. Mở Audio cắt của nhóm để chọn tệp
              còn thiếu.
            </p>
          )}
          {!!unusedFiles.length && (
            <details>
              <summary>{unusedFiles.length} tệp chưa gắn vào nhóm, sẽ chưa được tải lên</summary>
              <ul>
                {unusedFiles.map((m) => (
                  <li key={m.path}>{m.path}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </fieldset>
      <fieldset disabled={busy} className="editor-fieldset">
        <section className="admin-card">
          <h3>2. Thông tin đề</h3>
          <div className="admin-form-grid">
            <label>
              Bộ đề *
              <select
                disabled={readOnly}
                value={meta.examSetId}
                onChange={(e) => updateMeta('examSetId', e.target.value)}
              >
                <option value="">Chọn bộ đề</option>
                {sets.map((s) => (
                  <option value={s.examSetId} key={s.examSetId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mã đề
              <input
                readOnly={readOnly}
                value={meta.examCode}
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                placeholder="Để trống để tự tạo mã"
                onChange={(e) => updateMeta('examCode', e.target.value)}
              />
            </label>
            <label>
              Tên đề *
              <input
                value={meta.title}
                maxLength={200}
                onChange={(e) => updateMeta('title', e.target.value)}
              />
            </label>
            <label>
              Quyền truy cập đề
              <select value={meta.accessLevel || ''} onChange={(e) => updateMeta('accessLevel', e.target.value)}>
                <option value="">Theo bộ đề{currentSet ? ` (${ACCESS_LABEL[currentSet.examAccess] || ''})` : ''}</option>
                <option value="FREE">Miễn phí — mọi tài khoản đã đăng nhập</option>
                <option value="VIP">VIP — trả phí để mở khóa</option>
              </select>
            </label>
            <label>
              Mô tả
              <textarea
                value={meta.description || ''}
                maxLength={1000}
                onChange={(e) => updateMeta('description', e.target.value)}
              />
            </label>
          </div>
          {currentSet && <SetAccessBadges set={currentSet} />}
          <div className="admin-actions">
            {!readOnly && (
              <>
                <label>
                  Tạo bộ đề mới
                  <input value={newSet} maxLength={200} onChange={(e) => setNewSet(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!newSet.trim()}
                  onClick={createSet}
                >
                  Tạo bộ đề
                </button>
              </>
            )}
            {savedExam && (
              <button type="button" className="btn btn-outline" onClick={saveMetadata}>
                Lưu thông tin đề
              </button>
            )}
          </div>
        </section>
      </fieldset>
      <SheetPreview sheets={sourceSheets} />
      {!!inputIssues.length && (
        <section className="admin-card">
          <button type="button" className="text-button" onClick={() => setIssuesVisible(!issuesVisible)}>
            {inputIssues.length} lỗi dữ liệu cần sửa {issuesVisible ? '▲' : '▼'}
          </button>
          {issuesVisible && (
            <div className="import-issues">
              {inputIssues.map((issue, i) => (
                <div className="issue-item" key={i}>
                  <span>
                    <strong>
                      {issue.sheet}
                      {issue.row ? ` · Dòng ${issue.row}` : ''}
                      {issue.questionNo ? ` · Câu ${issue.questionNo}` : ''}
                    </strong>
                    : {issue.message}
                  </span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => jump(issue)}>
                    Đến lỗi
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="admin-card">
        <h3>3. Câu hỏi và nội dung</h3>
        <div className="parts-nav-tabs" aria-label="Chọn Part">
          {PART_COUNTS.map((standard, i) => (
            <button
              type="button"
              className="part-tab-btn"
              data-active={activePart === i + 1}
              aria-pressed={activePart === i + 1}
              key={i}
              onClick={() => {
                setActivePart(i + 1)
                setPage(1)
              }}
            >
              Part {i + 1}
              <span>
                {groups.filter((g) => g.partNo === i + 1).reduce((n, g) => n + g.questions.length, 0)}/
                {standard}
              </span>
            </button>
          ))}
        </div>
        <fieldset className="editor-fieldset" disabled={busy || readOnly}>
          {filtered.slice((currentPage - 1) * 5, currentPage * 5).map((group) => (
            <ExamQuestionEditor
              key={group.tempId}
              group={group}
              catalog={catalog}
              accessToken={accessToken}
              isReadOnly={readOnly || busy}
              onUpdateGroup={updateGroup}
              onDeleteGroup={(g) => {
                if (window.confirm('Xóa nhóm và các câu trong nhóm khỏi đề?')) {
                  setGroups((all) => all.filter((x) => x.tempId !== g.tempId))
                  contentDirty.current = true
                  markDirty()
                }
              }}
              maxQuestions={PART_GROUP_LIMITS[activePart - 1]}
            />
          ))}
          {!filtered.length && <p className="admin-empty">Chưa có nhóm câu hỏi trong Part này.</p>}
          <button type="button" className="btn btn-outline" onClick={addGroup}>
            Thêm nhóm vào Part {activePart}
          </button>
        </fieldset>
        <div className="pagination">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Trước
          </button>
          <span>
            Trang {currentPage}/{lastPage} · {filtered.length} nhóm
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Sau
          </button>
        </div>
      </section>
      {savedExam && (
        <DirectionsEditor accessToken={accessToken} examId={savedExam.examId} readOnly={readOnly || busy} />
      )}
      <div className="editor-sticky-bar">
        <span role="status">
          {progress ||
            (dirty
              ? 'Có thay đổi chưa lưu'
              : savedExam
                ? 'Đang xem dữ liệu đã lưu'
                : 'Chưa lưu lên hệ thống')}
        </span>
        <div className="sticky-buttons">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || readOnly || !groups.length}
            onClick={save}
          >
            {busy ? 'Đang xử lý…' : 'Lưu nội dung và media'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || !savedExam || dirty}
            onClick={() => setPreviewing(true)}
          >
            Xem trước đề
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || !savedExam || dirty || readOnly}
            onClick={checkPublish}
          >
            Kiểm tra xuất bản
          </button>
        </div>
      </div>
      <PublishCheckModal
        isOpen={!!modal}
        isValid={modal?.isValid}
        issues={modal?.issues || []}
        isPublishing={busy}
        onClose={() => {
          if (!busy) setModal(null)
        }}
        onJumpToIssue={(partNo, questionNo, issue) => jump(issue || { partNo, questionNo })}
        onConfirmPublish={confirmPublish}
      />
    </div>
  )
}
