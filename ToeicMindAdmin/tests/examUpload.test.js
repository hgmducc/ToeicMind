import assert from 'node:assert/strict'
import test from 'node:test'
import { convertRowsToGroups, generateTest3ExamPackage, parseFolderFiles } from '../src/features/exams/utils/folderParser.js'

test('generateTest3ExamPackage creates full 200 questions across 103 groups matching Test 3 structure and links 1812 vocab items', async () => {
  const pkg = await generateTest3ExamPackage()
  assert.equal(pkg.examCode, 'ETS2024_TEST03')
  assert.equal(pkg.title, 'ETS TOEIC 2024 - Test 03')
  assert.equal(pkg.totalQuestions, 200)
  assert.equal(pkg.totalVocabularies, 1812)
  assert.equal(pkg.groups.length, 103)

  // Đếm số câu từng Part và tổng số từ vựng
  const countsByPart = {}
  let totalCalculated = 0
  let totalVocabsCalculated = 0

  for (const grp of pkg.groups) {
    countsByPart[grp.partNo] = (countsByPart[grp.partNo] || 0) + grp.questions.length
    totalCalculated += grp.questions.length

    // Part 1-4 có transcript
    if (grp.partNo <= 4) {
      assert.ok(grp.transcriptEn, `Part ${grp.partNo} (Q${grp.groupOrder}) must have transcript`)
    }
    // Part 6-7 có passageHtml
    if (grp.partNo >= 6) {
      assert.ok(grp.passageHtml, `Part ${grp.partNo} (Q${grp.groupOrder}) must have passageHtml`)
    }
    // Mỗi câu hỏi có đúng 1 đáp án đúng và danh sách vocab
    for (const q of grp.questions) {
      const correctOpts = q.options.filter((o) => o.isCorrect)
      assert.equal(correctOpts.length, 1, `Question ${q.questionNo} must have exactly one correct option`)
      if (grp.partNo === 2) {
        assert.equal(q.options.length, 3, `Question ${q.questionNo} (Part 2) must have 3 options`)
      } else {
        assert.equal(q.options.length, 4, `Question ${q.questionNo} must have 4 options`)
      }
      assert.ok(q.explanation, `Question ${q.questionNo} must have explanation`)
      assert.ok(q.optionExplanations, `Question ${q.questionNo} must have optionExplanations`)
      assert.ok(Array.isArray(q.vocabularies), `Question ${q.questionNo} must have vocabularies array`)
      totalVocabsCalculated += q.vocabularies.length
    }
  }

  assert.equal(totalCalculated, 200)
  assert.equal(totalVocabsCalculated, 1812)
  assert.equal(countsByPart[1], 6)
  assert.equal(countsByPart[2], 25)
  assert.equal(countsByPart[3], 39)
  assert.equal(countsByPart[4], 30)
  assert.equal(countsByPart[5], 30)
  assert.equal(countsByPart[6], 16)
  assert.equal(countsByPart[7], 54)

  // Kiểm tra câu 1 có các từ vựng đặc trưng
  const q1 = pkg.groups[0].questions[0]
  assert.equal(q1.questionNo, 1)
  const q1Terms = q1.vocabularies.map((v) => v.term)
  assert.ok(q1Terms.includes('opening'), 'Q1 should contain "opening"')
})

test('parseFolderFiles indexes media by relative path and basename', () => {
  const fakeFiles = [
    { name: 'Test_3_split.xlsx', webkitRelativePath: 'Test_3/Test_3_split.xlsx', size: 1024 },
    { name: '1785050690589-1.png', webkitRelativePath: 'Test_3/image/1785050690589-1.png', size: 2048 },
    { name: 'preview-1791232027252.mp3', webkitRelativePath: 'Test_3/audio/preview-1791232027252.mp3', size: 4096 },
  ]

  globalThis.URL.createObjectURL = () => 'blob:mock-url'

  const parsed = parseFolderFiles(fakeFiles)
  assert.equal(parsed.rootFolderName, 'Test_3')
  assert.equal(parsed.totalFiles, 3)
  assert.equal(parsed.excelFile.name, 'Test_3_split.xlsx')
  assert.equal(parsed.audioFiles.length, 1)
  assert.equal(parsed.imageFiles.length, 1)

  // Tra cứu qua mediaIndex
  const audioFromIndex = parsed.mediaIndex.get('preview-1791232027252.mp3')
  assert.ok(audioFromIndex)
  assert.equal(audioFromIndex.name, 'preview-1791232027252.mp3')

  const imgFromIndex = parsed.mediaIndex.get('image/1785050690589-1.png')
  assert.ok(imgFromIndex)
  assert.equal(imgFromIndex.name, '1785050690589-1.png')
})

test('convertRowsToGroups links audio and image references from Excel columns', () => {
  const mockRows = [
    {
      question_no: 1,
      part: 1,
      group_id: 'p1-q1',
      audio: 'audio/preview-1791232027252.mp3',
      image: 'image/1785050690589-1.png',
      option_a: 'A text',
      option_b: 'B text',
      option_c: 'C text',
      option_d: 'D text',
      correct_answer: 'D',
      explanation: 'Explanation text',
      option_explanations: 'A: Sai\nB: Sai\nC: Sai\nD: Đúng',
      script_en: 'Transcript text',
      script_vi: 'Translation text',
    },
    {
      question_no: 62,
      part: 3,
      group_id: 'grp-p3-62',
      audio: 'audio/job-0684220d.mp3',
      image: 'image/upload-1786196363013.jpg',
      option_a: 'A text',
      option_b: 'B text',
      option_c: 'C text',
      option_d: 'D text',
      correct_answer: 'A',
      explanation: 'Explanation text',
      option_explanations: 'A: Đúng\nB: Sai\nC: Sai\nD: Đúng',
    },
    {
      question_no: 63,
      part: 3,
      group_id: 'grp-p3-62',
      audio: null, // Dòng 63 cùng nhóm với 62
      image: null,
      option_a: 'A text',
      option_b: 'B text',
      option_c: 'C text',
      option_d: 'D text',
      correct_answer: 'B',
      explanation: 'Explanation text',
      option_explanations: 'A: Sai\nB: Đúng\nC: Sai\nD: Sai',
    },
  ]

  const mediaIndex = new Map([
    ['audio/preview-1791232027252.mp3', { file: { name: 'preview-1791232027252.mp3' }, type: 'AUDIO', previewUrl: 'blob:audio-q1' }],
    ['image/1785050690589-1.png', { file: { name: '1785050690589-1.png' }, type: 'IMAGE', previewUrl: 'blob:img-q1' }],
    ['audio/job-0684220d.mp3', { file: { name: 'job-0684220d.mp3' }, type: 'AUDIO', previewUrl: 'blob:audio-q62' }],
    ['image/upload-1786196363013.jpg', { file: { name: 'upload-1786196363013.jpg' }, type: 'IMAGE', previewUrl: 'blob:img-q62' }],
  ])

  const groups = convertRowsToGroups(mockRows, mediaIndex)
  assert.equal(groups.length, 2)

  // Nhóm 1: Part 1 Q1
  const g1 = groups[0]
  assert.equal(g1.partNo, 1)
  assert.equal(g1.audioPreviewUrl, 'blob:audio-q1')
  assert.equal(g1.imagePreviewUrls[0], 'blob:img-q1')

  // Nhóm 2: Part 3 Q62-63
  const g2 = groups[1]
  assert.equal(g2.partNo, 3)
  assert.equal(g2.questions.length, 2)
  assert.equal(g2.audioPreviewUrl, 'blob:audio-q62')
  assert.equal(g2.imagePreviewUrls[0], 'blob:img-q62')
})

test('convertRowsToGroups removes blank lines from the Vietnamese translation', () => {
  const row = {
    question_no: 1,
    part: 1,
    group_id: 'p1-q1',
    option_a: 'A text',
    option_b: 'B text',
    option_c: 'C text',
    option_d: 'D text',
    correct_answer: 'A',
    script_en: '(A) He is putting on a coat.\r\n\r\n(B) He is holding an umbrella.',
    script_vi: '\r\n(A) Một người đàn ông đang khoác áo.\r\n\r\n  \r\n(B) Một người đàn ông đang cầm ô.  \r\n\r\n',
  }

  const [group] = convertRowsToGroups([row], new Map())
  assert.equal(group.translationVi, '(A) Một người đàn ông đang khoác áo.\n(B) Một người đàn ông đang cầm ô.')
  // Chỉ bản dịch được làm sạch; transcript giữ nguyên như file nguồn.
  assert.equal(group.transcriptEn, row.script_en)
})

test('parseFolderFiles and convertRowsToGroups correctly link audio_split segments', () => {
  const fakeFiles = [
    { name: 'Test_3_split.xlsx', webkitRelativePath: 'Test_3/Test_3_split.xlsx', size: 1024 },
    { name: 'preview-1791232224359.mp3', webkitRelativePath: 'Test_3/audio/preview-1791232224359.mp3', size: 5000 },
    { name: 'preview-1791232224359_s01.mp3', webkitRelativePath: 'Test_3/audio_split/preview-1791232224359/preview-1791232224359_s01.mp3', size: 1200 },
    { name: 'preview-1791232224359_s02.mp3', webkitRelativePath: 'Test_3/audio_split/preview-1791232224359/preview-1791232224359_s02.mp3', size: 1400 },
  ]

  const parsed = parseFolderFiles(fakeFiles)
  assert.equal(parsed.audioMainFiles.length, 1)
  assert.equal(parsed.audioSplitFiles.length, 2)

  // Kiểm tra tra cứu qua mediaIndex
  const clip1 = parsed.mediaIndex.get('preview-1791232224359_s01')
  assert.ok(clip1)
  assert.equal(clip1.name, 'preview-1791232224359_s01.mp3')
  assert.equal(clip1.isSplit, true)

  const mockRows = [
    {
      question_no: 29,
      part: 2,
      group_id: 'p2-q29',
      audio: 'audio/preview-1791232224359.mp3',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      correct_answer: 'B',
      explanation: 'Grammar exp',
      option_explanations: 'A: Sai\nB: Đúng\nC: Sai',
    },
  ]

  const mockSegments = [
    {
      group_id: 'p2-q29',
      seq: 1,
      clip_id: 'preview-1791232224359_s01',
      clip_audio: 'audio_split/preview-1791232224359/preview-1791232224359_s01.mp3',
      kind: 'question',
      label: null,
      text: 'Where can I find the training manuals?',
    },
    {
      group_id: 'p2-q29',
      seq: 2,
      clip_id: 'preview-1791232224359_s02',
      clip_audio: 'audio_split/preview-1791232224359/preview-1791232224359_s02.mp3',
      kind: 'option',
      label: 'A',
      text: "Yes, I'd like to see the new office.",
    },
  ]

  const groups = convertRowsToGroups(mockRows, parsed.mediaIndex, mockSegments)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].audioSegments.length, 2)
  assert.equal(groups[0].audioSegments[0].clip_id, 'preview-1791232224359_s01')
  assert.ok(groups[0].audioSegments[0].previewUrl)
  assert.equal(groups[0].audioSegments[1].clip_id, 'preview-1791232224359_s02')
  assert.ok(groups[0].audioSegments[1].previewUrl)
})

test('convertRowsToGroups links vocabularies to questions by question_no', () => {
  const mockRows = [
    { question_no: 1, part: 1, group_id: 'p1-q1', correct_answer: 'A', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D' },
    { question_no: 2, part: 1, group_id: 'p1-q2', correct_answer: 'B', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D' },
  ]
  const mockVocabs = [
    { question_no: 1, term: 'opening', base: 'open', pos: 'v', cefr: 'A1', term_meaning_vi: 'mở', ipa: 'ˈoʊpən', example_en: 'He is opening', example_vi: 'Anh ấy đang mở' },
    { question_no: 1, term: 'drawer', base: 'drawer', pos: 'n', cefr: 'A2', term_meaning_vi: 'ngăn kéo', ipa: 'drɔːr', example_en: 'a desk drawer', example_vi: 'ngăn kéo bàn' },
    { question_no: 2, term: 'laptop', base: 'laptop', pos: 'n', cefr: 'A1', term_meaning_vi: 'máy tính xách tay', ipa: 'ˈlæptɑːp', example_en: 'using a laptop', example_vi: 'dùng máy tính' },
  ]

  const groups = convertRowsToGroups(mockRows, new Map(), [], mockVocabs)
  assert.equal(groups.length, 2)
  assert.equal(groups[0].questions[0].vocabularies.length, 2)
  assert.equal(groups[0].questions[0].vocabularies[0].term, 'opening')
  assert.equal(groups[0].questions[0].vocabularies[1].term, 'drawer')
  assert.equal(groups[1].questions[0].vocabularies.length, 1)
  assert.equal(groups[1].questions[0].vocabularies[0].term, 'laptop')
})
