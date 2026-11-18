import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from 'xlsx'
import {
  convertRowsToGroups,
  parseExcelQuestions,
  parseFolderFiles,
} from '../src/features/exams/utils/folderParser.js'
import {
  contentCounts,
  contentIssues,
  fromServerGroup,
  groupPayload,
  sourceIssues,
  validOptionExplanations,
} from '../src/features/exams/utils/examContent.js'

const catalog = {
  categories: [
    { categoryId: 90, partNo: 5, code: 'verb', isLeaf: false },
    { categoryId: 91, partNo: 5, code: 'tense', parentCategoryId: 90, isLeaf: true },
  ],
  specialTags: [],
}
const row = {
  question_no: 101,
  group_id: 'p5-q101',
  part: 5,
  cat: 'tense',
  cat_group: 'verb',
  difficulty: 4,
  correct_answer: 'B',
  option_a: 'A',
  option_b: 'B',
  option_c: 'C',
  option_d: 'D',
}
function workbook(sheets) {
  const book = XLSX.utils.book_new()
  for (const [name, data] of Object.entries(sheets))
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), name)
  return new File([XLSX.write(book, { type: 'array', bookType: 'xlsx' })], 'test.xlsx')
}

test('Excel requires Questions and never substitutes sample content', async () => {
  await assert.rejects(parseExcelQuestions(null), /Chưa chọn file/)
  await assert.rejects(
    parseExcelQuestions(workbook({ Other: [{ question_no: 1 }] })),
    /Thiếu sheet Questions/,
  )
})

test('all source sheets and columns are retained including Dict and Media', async () => {
  const parsed = await parseExcelQuestions(
    workbook({
      Questions: [row],
      Dict: [{ value: 'tense', field: 'cat' }],
      Media: [{ path: 'audio/test.mp3' }],
      Extra: [{ note: 'keep me' }],
    }),
  )
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.sourceSheets.Extra[0].note, 'keep me')
  assert.deepEqual(
    parsed.sheetSummary.map((s) => s.name),
    ['Questions', 'Dict', 'Media', 'Extra'],
  )
})

test('Test1 difficulty and meaning_vi map correctly without inventing levels or category IDs', () => {
  const [group] = convertRowsToGroups(
    [row],
    new Map(),
    [],
    [{ question_no: 101, term: 'working', base: 'work', pos: 'v', cefr: 'A1', meaning_vi: 'làm việc' }],
    catalog,
  )
  assert.equal(group.questions[0].levelNo, 4)
  assert.equal(group.categoryId, 91)
  assert.equal(group.groupLevelNo, null)
  assert.equal(group.questions[0].vocabularies[0].meaning_base, 'làm việc')
  assert.equal(group.questions[0].vocabularies[0].term_meaning_vi, 'làm việc')
  assert.equal(
    convertRowsToGroups([{ ...row, cat: 'unknown' }], new Map(), [], [], catalog)[0].categoryId,
    null,
  )
})

test('Test3 base meaning remains distinct and approved PoS normalization is applied', () => {
  const [group] = convertRowsToGroups(
    [row],
    new Map(),
    [],
    [
      {
        question_no: 101,
        term: 'opened up',
        base: 'open up',
        pos: 'v.phr',
        cefr: 'B1',
        meaning_base: 'mở ra',
        term_meaning_vi: 'đã mở cửa',
        definition_en: 'become open',
      },
    ],
    catalog,
  )
  const vocab = groupPayload(group).questions[0].vocabularies[0]
  assert.equal(vocab.pos, 'phr.v')
  assert.equal(vocab.meaningBase, 'mở ra')
  assert.equal(vocab.termMeaningVi, 'đã mở cửa')
  assert.equal(vocab.definitionEn, 'become open')
})

test('group payload preserves question and clip IDs and excludes preview URLs and File objects', () => {
  const [group] = convertRowsToGroups([{ ...row, question_no: 7, part: 2, group_id: 'p2-q7' }], new Map(), [
    {
      group_id: 'p2-q7',
      seq: 1,
      clip_id: 'clip',
      kind: 'question',
      text: 'Where?',
      start_sec: 0,
      end_sec: 2,
      duration_sec: 2,
    },
  ])
  group.groupId = 10
  group.questions[0].questionId = 20
  group.audioSegments[0].clipId = 30
  group.audioFile = new File(['bytes'], 'audio.mp3')
  group.audioPreviewUrl = 'blob:private'
  const payload = groupPayload(group)
  assert.equal(payload.groupId, 10)
  assert.equal(payload.questions[0].questionId, 20)
  assert.equal(payload.audioSegments[0].clipId, 30)
  assert.equal(payload.audioSegments[0].role, 'QUESTION')
  assert.ok(!JSON.stringify(payload).includes('blob:private'))
  assert.equal(payload.audioFile, undefined)
})

test('orphan vocab and segments produce sheet and row errors instead of silent omissions', () => {
  const groups = convertRowsToGroups([row])
  const issues = sourceIssues(
    { rows: [row], vocabRows: [{ question_no: 999 }], segments: [{ group_id: 'missing' }] },
    groups,
  )
  assert.deepEqual(
    issues.map((i) => [i.sheet, i.row]),
    [
      ['Vocab', 2],
      ['Audio_Segments', 2],
    ],
  )
})

test('conflicting option explanations are detected without rewriting answers', () => {
  const [group] = convertRowsToGroups([row], new Map(), [], [], catalog)
  const q = group.questions[0]
  q.optionExplanations = 'A: A — Sai\nB: B — Đúng\nC: C — Sai\nD: D — Sai'
  assert.ok(validOptionExplanations(q, 5))
  q.optionExplanations = 'A: A — Đúng\nB: B — Đúng\nC: C — Sai\nD: D — Sai'
  assert.equal(validOptionExplanations(q, 5), false)
  assert.equal(contentIssues([group], catalog).length, 1)
  assert.equal(q.options.find((o) => o.isCorrect).optionLabel, 'B')
})

test('ambiguous basenames do not bind the wrong media and split audio is not counted as main audio', () => {
  const files = ['A/a.mp3', 'B/a.mp3'].map((p) => {
    const f = new File(['ID3'], 'a.mp3')
    Object.defineProperty(f, 'webkitRelativePath', { value: `Root/${p}` })
    return f
  })
  const folder = parseFolderFiles(files)
  assert.equal(folder.mediaIndex.has('a.mp3'), false)
  assert.ok(folder.mediaIndex.has('a/a.mp3'))
  for (const m of folder.mediaFiles) URL.revokeObjectURL(m.previewUrl)
})

test('server groups reconstruct all vocab fields, segment timing and pending local files', () => {
  const source = {
    groupId: 1,
    partNo: 2,
    groupOrder: 7,
    media: [],
    questions: [
      {
        questionId: 2,
        questionNo: 7,
        options: [],
        vocabularies: [
          { term: 'opened', base: 'open', pos: 'v', cefr: 'A1', meaningBase: 'mở', termMeaningVi: 'đã mở' },
        ],
      },
    ],
    audioSegments: [
      {
        clipId: 3,
        clipKey: 'clip',
        seq: 1,
        role: 'QUESTION',
        text: 'Where?',
        startSec: 0,
        endSec: 1,
        durationSec: 1,
        media: [],
      },
    ],
  }
  const file = new File(['ID3'], 'clip.mp3')
  const group = fromServerGroup(source, {
    sourceGroupId: 'p2-q7',
    questions: [{ questionNo: 7, sourceRow: 2 }],
    audioSegments: [{ clip_id: 'clip', audioFile: file }],
  })
  assert.equal(group.questions[0].vocabularies[0].term_meaning_vi, 'đã mở')
  assert.equal(group.audioSegments[0].audioFile, file)
  assert.equal(group.audioSegments[0].start_sec, 0)
  assert.equal(group.questions[0].sourceRow, 2)
  assert.deepEqual(
    sourceIssues(
      {
        rows: [{ question_no: 7, part: 2 }],
        vocabRows: [{ question_no: 7 }],
        segments: [{ group_id: 'p2-q7' }],
      },
      [group],
    ),
    [],
  )
  assert.deepEqual(contentCounts([group]), {
    groups: 1,
    questions: 1,
    vocab: 1,
    segments: 1,
    clips: 1,
    audio: 0,
    images: 0,
  })
})
