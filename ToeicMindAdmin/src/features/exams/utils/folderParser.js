const normalizePath = (path = '') => String(path).replace(/\\/g, '/').toLowerCase().trim()
const basename = (path) => normalizePath(path).split('/').at(-1)
const groupKey = (value) => normalizePath(value).replace(/^grp-/, '')
const text = (value) => (value == null ? '' : String(value).trim())
// Bản dịch nhiều dòng: bỏ dòng trắng (Excel hay để trống giữa các đáp án) và khoảng trắng đầu/cuối mỗi dòng.
export const lines = (value) =>
  text(value)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
const nullableNumber = (value) => (value == null || value === '' ? null : Number(value))
const escapeHtml = (value) =>
  text(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

export function parseFolderFiles(fileList) {
  const files = Array.from(fileList || [])
  const excelFiles = files.filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name) && !f.name.startsWith('~$'))
  const mediaFiles = files
    .filter((f) => /\.(mp3|wav|png|jpe?g)$/i.test(f.name))
    .map((file) => {
      const path = normalizePath(file.webkitRelativePath || file.relativePath || file.name)
      return {
        file,
        name: file.name,
        path,
        pathWithoutRoot: path.includes('/') ? path.slice(path.indexOf('/') + 1) : path,
        type: /\.(mp3|wav)$/i.test(file.name) ? 'AUDIO' : 'IMAGE',
        isSplit: path.includes('audio_split/'),
        previewUrl: URL.createObjectURL(file),
      }
    })
  const mediaIndex = new Map()
  for (const item of mediaFiles) {
    mediaIndex.set(item.path, item)
    mediaIndex.set(item.pathWithoutRoot, item)
  }
  for (const item of mediaFiles) {
    const name = basename(item.path)
    if (mediaFiles.filter((m) => basename(m.path) === name).length === 1) {
      mediaIndex.set(name, item)
      if (item.type === 'AUDIO') mediaIndex.set(name.replace(/\.(mp3|wav)$/i, ''), item)
    }
  }
  return {
    rootFolderName:
      (files[0]?.webkitRelativePath || files[0]?.relativePath || '').split('/')[0] || 'Tệp đã chọn',
    totalFiles: files.length,
    excelFiles,
    excelFile: excelFiles[0] || null,
    mediaFiles,
    mediaIndex,
    audioFiles: mediaFiles.filter((m) => m.type === 'AUDIO' && !m.isSplit),
    audioMainFiles: mediaFiles.filter((m) => m.type === 'AUDIO' && !m.isSplit),
    audioSplitFiles: mediaFiles.filter((m) => m.type === 'AUDIO' && m.isSplit),
    imageFiles: mediaFiles.filter((m) => m.type === 'IMAGE'),
  }
}

export function releaseFolderFiles(folder) {
  for (const media of folder?.mediaFiles || []) URL.revokeObjectURL(media.previewUrl)
}

export async function readDroppedFiles(dataTransfer) {
  const entries = Array.from(dataTransfer.items || [])
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean)
  if (!entries.length) return Array.from(dataTransfer.files || [])
  async function walk(entry, prefix = '') {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject))
      Object.defineProperty(file, 'relativePath', { value: prefix + file.name })
      return [file]
    }
    const reader = entry.createReader(),
      children = []
    while (true) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject))
      if (!batch.length) break
      children.push(...batch)
    }
    return (await Promise.all(children.map((c) => walk(c, prefix + entry.name + '/')))).flat()
  }
  return (await Promise.all(entries.map((e) => walk(e)))).flat()
}

export async function parseExcelQuestions(file) {
  if (!file) throw new Error('Chưa chọn file Excel. Vui lòng chọn đúng file hoặc thư mục có Excel.')
  if (file.size > 20 * 1024 * 1024) throw new Error('File Excel vượt quá 20 MB.')
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sourceSheets = Object.fromEntries(
    workbook.SheetNames.map((name) => [
      name,
      XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null, raw: true }),
    ]),
  )
  const findSheet = (names) =>
    Object.entries(sourceSheets).find(([name]) => names.includes(name.trim().toLowerCase()))?.[1] || []
  const rows = findSheet(['questions'])
  if (!rows.length)
    throw new Error('Thiếu sheet Questions hoặc sheet không có dữ liệu. Không nạp dữ liệu mẫu thay thế.')
  return {
    rows,
    segments: findSheet(['audio_segments']),
    vocabRows: findSheet(['vocab', 'vocabulary', 'vocabularies']),
    sourceSheets,
    sheetSummary: Object.entries(sourceSheets).map(([name, data]) => ({ name, count: data.length })),
  }
}

export function convertRowsToGroups(
  rows,
  mediaIndex = new Map(),
  segmentRows = [],
  vocabRows = [],
  catalog = {},
) {
  const groups = new Map(),
    vocabByQuestion = new Map()
  const match = (ref) => mediaIndex.get(normalizePath(ref)) || mediaIndex.get(basename(ref))
  for (const [rowIndex, row] of vocabRows.entries()) {
    const no = Number(row.question_no || row.QuestionNo)
    if (!vocabByQuestion.has(no)) vocabByQuestion.set(no, [])
    const pos = text(row.pos).toLowerCase()
    vocabByQuestion
      .get(no)
      .push({
        sourceRow: rowIndex + 2,
        term: text(row.term),
        base: text(row.base || row.term),
        pos: { 'v.phr': 'phr.v', 'n.phr': 'phr', 'adv.phr': 'phr' }[pos] || pos,
        ipa: text(row.ipa),
        cefr: text(row.cefr).toUpperCase(),
        meaning_base: text(row.meaning_base || row.meaning_vi || row.term_meaning_vi),
        term_meaning_vi: text(row.term_meaning_vi || row.meaning_vi),
        definition_en: text(row.definition_en),
        example_en: text(row.example_en),
        example_vi: text(row.example_vi),
      })
  }
  for (const [rowIndex, row] of rows.entries()) {
    const questionNo = Number(row.question_no || row.QuestionNo || row.qNo),
      partNo = Number(row.part || row.Part)
    const key = groupKey(row.group_id || row.GroupId || `p${partNo}-q${questionNo}`)
    if (!groups.has(key))
      groups.set(key, {
        tempId: `grp-${key}`,
        sourceGroupId: key,
        partNo,
        groupOrder: questionNo,
        categoryCode: text(row.cat),
        categoryParentCode: text(row.cat_group),
        categoryId: null,
        groupLevelNo: [3, 4, 6, 7].includes(partNo) ? nullableNumber(row.group_level) : null,
        passageHtml:
          text(row.passage_html) ||
          (row.passage_text ? `<p>${escapeHtml(row.passage_text).replace(/\n/g, '<br>')}</p>` : null),
        transcriptEn: text(row.script_en || row.transcript_en) || null,
        translationVi: lines(row.script_vi || row.translation_vi) || null,
        specialCodes: [],
        specialTagIds: [],
        audioRef: null,
        imageRefs: [],
        audioFile: null,
        audioPreviewUrl: null,
        imageFiles: [],
        imagePreviewUrls: [],
        audioSegments: [],
        questions: [],
      })
    const group = groups.get(key)
    if (!group.categoryCode && row.cat) {
      group.categoryCode = text(row.cat)
      group.categoryParentCode = text(row.cat_group)
    }
    for (const [field, value] of [
      ['passageHtml', row.passage_html],
      ['transcriptEn', row.script_en || row.transcript_en],
      ['translationVi', row.script_vi || row.translation_vi],
    ]) {
      if (!group[field] && value) group[field] = field === 'translationVi' ? lines(value) : text(value)
    }
    if (!group.audioRef && row.audio) group.audioRef = text(row.audio)
    group.imageRefs = [
      ...new Set([
        ...group.imageRefs,
        ...text(row.image)
          .split(/[;|\n]/)
          .filter(Boolean),
      ]),
    ]
    group.specialCodes = [
      ...new Set([
        ...group.specialCodes,
        ...text(row.special)
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean),
      ]),
    ]
    const answer = text(row.correct_answer || row.CorrectAnswer).toUpperCase()
    group.questions.push({
      sourceRow: rowIndex + 2,
      questionNo,
      levelNo: nullableNumber(row.level ?? row.difficulty),
      questionText: text(row.question) || null,
      explanation: text(row.explanation) || null,
      optionExplanations: text(row.option_explanations) || null,
      options: [...(partNo === 2 ? 'ABC' : 'ABCD')].map((label) => ({
        optionLabel: label,
        optionText: text(row[`option_${label.toLowerCase()}`]),
        isCorrect: label === answer,
      })),
      vocabularies: vocabByQuestion.get(questionNo) || [],
    })
  }
  for (const group of groups.values()) {
    const candidates = (catalog.categories || []).filter(
      (c) => c.partNo === group.partNo && c.isLeaf && c.code === group.categoryCode,
    )
    const category =
      candidates.find(
        (c) =>
          !group.categoryParentCode ||
          catalog.categories.find((p) => p.categoryId === c.parentCategoryId)?.code ===
            group.categoryParentCode,
      ) || (candidates.length === 1 ? candidates[0] : null)
    group.categoryId = category?.categoryId || null
    group.specialTagIds = (catalog.specialTags || [])
      .filter((t) => t.partNo === group.partNo && group.specialCodes.includes(t.code))
      .map((t) => t.specialTagId)
    const audio = match(group.audioRef)
    if (audio?.type === 'AUDIO' && !audio.isSplit) {
      group.audioFile = audio.file
      group.audioPreviewUrl = audio.previewUrl
    }
    for (const ref of group.imageRefs) {
      const image = match(ref)
      if (image?.type === 'IMAGE') {
        group.imageFiles.push(image.file)
        group.imagePreviewUrls.push(image.previewUrl)
      }
    }
    group.questions.sort((a, b) => a.questionNo - b.questionNo)
    group.groupOrder = group.questions[0]?.questionNo
  }
  for (const [rowIndex, row] of segmentRows.entries()) {
    const group = groups.get(groupKey(row.group_id))
    if (!group) continue
    const clip = match(row.clip_audio) || mediaIndex.get(normalizePath(row.clip_id))
    group.audioSegments.push({
      sourceRow: rowIndex + 2,
      seq: Number(row.seq),
      clip_id: text(row.clip_id),
      clip_audio: text(row.clip_audio),
      kind: text(row.kind),
      label: text(row.label),
      speaker: text(row.speaker),
      text: text(row.text),
      source_audio: text(row.source_audio),
      text_source: text(row.text_source),
      start_sec: nullableNumber(row.start_sec),
      end_sec: nullableNumber(row.end_sec),
      duration_sec: nullableNumber(row.duration_sec),
      audioFile: clip?.file || null,
      previewUrl: clip?.previewUrl || null,
    })
  }
  return [...groups.values()]
    .map((g) => ({ ...g, audioSegments: g.audioSegments.sort((a, b) => a.seq - b.seq) }))
    .sort((a, b) => a.partNo - b.partNo || a.groupOrder - b.groupOrder)
}

export async function downloadExcelTemplate() {
  const XLSX = await import('xlsx'),
    workbook = XLSX.utils.book_new()
  for (const [name, columns] of Object.entries({
    Questions: [
      'question_no',
      'part',
      'group_id',
      'audio',
      'image',
      'passage_html',
      'question',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_answer',
      'explanation',
      'option_explanations',
      'script_en',
      'script_vi',
      'level',
      'group_level',
      'cat_group',
      'cat',
      'special',
    ],
    Vocab: [
      'question_no',
      'base',
      'pos',
      'meaning_base',
      'term',
      'term_meaning_vi',
      'ipa',
      'cefr',
      'definition_en',
      'example_en',
      'example_vi',
    ],
    Audio_Segments: [
      'group_id',
      'question_no',
      'part',
      'seq',
      'clip_id',
      'clip_audio',
      'source_audio',
      'kind',
      'label',
      'speaker',
      'text',
      'start_sec',
      'end_sec',
      'duration_sec',
      'text_source',
    ],
    Media: ['type', 'path', 'url'],
    Dict: ['part', 'field', 'cat_group', 'value', 'name', 'english'],
  }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([columns]), name)
  XLSX.writeFile(workbook, 'ToeicMind_Import_Template.xlsx')
}

export async function generateTest3ExamPackage(mediaIndex = new Map()) {
  const data = await import('../data/test3Data.js')
  const groups = convertRowsToGroups(
    data.test3RawQuestions,
    mediaIndex,
    data.test3RawAudioSegments,
    data.test3RawVocab,
  )
  return {
    examCode: 'ETS2024_TEST03',
    title: 'ETS TOEIC 2024 - Test 03',
    totalQuestions: data.test3RawQuestions.length,
    totalVocabularies: groups.flatMap((g) => g.questions).reduce((sum, q) => sum + q.vocabularies.length, 0),
    groups,
  }
}
