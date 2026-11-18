import assert from 'node:assert/strict'
import { test } from 'node:test'
import { explanationSteps, pairTranscript, parseOptionAnalysis, splitSpeaker } from '../src/features/exams/answerDetails.js'

test('giải thích: tách "Bước N" và mẹo nằm giữa dòng', () => {
  const text = 'Bước 1: Xác định dạng câu hỏi.\nBước 2: Phân tích câu.\n\nBước 3: Chọn đáp án B (cầm một chiếc ly). Mẹo: Tập trung quan sát hành động chính.'
  assert.deepEqual(explanationSteps(text), {
    steps: [
      { label: 'Bước 1', text: 'Xác định dạng câu hỏi.' },
      { label: 'Bước 2', text: 'Phân tích câu.' },
      { label: 'Bước 3', text: 'Chọn đáp án B (cầm một chiếc ly).' },
    ],
    tips: [{ label: 'Mẹo', text: 'Tập trung quan sát hành động chính.' }],
  })
})

test('giải thích không theo bước vẫn giữ nguyên chữ; dòng chỉ có mẹo; rỗng', () => {
  assert.deepEqual(explanationSteps('Câu hỏi về thì.\nDùng hiện tại hoàn thành.'), { steps: [{ label: null, text: 'Câu hỏi về thì.' }, { label: null, text: 'Dùng hiện tại hoàn thành.' }], tips: [] })
  assert.deepEqual(explanationSteps('Lưu ý: nghe kỹ động từ.'), { steps: [], tips: [{ label: 'Lưu ý', text: 'nghe kỹ động từ.' }] })
  assert.deepEqual(explanationSteps(null), { steps: [], tips: [] })
})

test('phân tích đáp án: nhãn, câu trích, Đúng/Sai, lý do', () => {
  const text = 'A: The woman is wiping off the dining table. - Sai: Người phụ nữ không lau bàn.\nB: The woman is holding a glass. - Đúng: Người phụ nữ đang cầm chiếc ly.\n(C) Rót đồ uống – Sai: không có hành động rót.\nD. Không liên quan đến tranh.'
  assert.deepEqual(parseOptionAnalysis(text), [
    { label: 'A', quote: 'The woman is wiping off the dining table.', verdict: 'wrong', reason: 'Người phụ nữ không lau bàn.' },
    { label: 'B', quote: 'The woman is holding a glass.', verdict: 'correct', reason: 'Người phụ nữ đang cầm chiếc ly.' },
    { label: 'C', quote: 'Rót đồ uống', verdict: 'wrong', reason: 'không có hành động rót.' },
    { label: 'D', quote: '', verdict: null, reason: 'Không liên quan đến tranh.' },
  ])
})

test('phân tích đáp án: chữ "đúng" giữa câu không bị hiểu là kết luận; dòng nối tiếp; không theo mẫu → null', () => {
  const [a] = parseOptionAnalysis('A: Cách dùng đúng với ngữ cảnh nhưng sai thì.')
  assert.equal(a.verdict, null)
  assert.equal(a.reason, 'Cách dùng đúng với ngữ cảnh nhưng sai thì.')
  const items = parseOptionAnalysis('A: x - Sai: lý do 1\nthêm ý phụ')
  assert.equal(items[0].reason, 'lý do 1 thêm ý phụ')
  assert.equal(parseOptionAnalysis('Phân tích chung cho cả câu'), null)
  assert.equal(parseOptionAnalysis(''), null)
})

test('script: ghép từng dòng với bản dịch (bỏ dòng trống, tách nhãn (A))', () => {
  const data = pairTranscript('The woman is wiping.\nThe woman is holding a glass.', '(A) Người phụ nữ đang lau.\n\n(B) Người phụ nữ đang cầm ly.')
  assert.deepEqual(data.pairs, [
    { label: 'A', en: 'The woman is wiping.', vi: 'Người phụ nữ đang lau.' },
    { label: 'B', en: 'The woman is holding a glass.', vi: 'Người phụ nữ đang cầm ly.' },
  ])
})

test('script: số dòng lệch → hai khối; không có bản dịch; không có script', () => {
  const uneven = pairTranscript('M: Hello.\nW: Hi.\nM: Bye.', 'Xin chào. Chào.')
  assert.equal(uneven.pairs, null)
  assert.equal(uneven.en.length, 3)
  assert.equal(pairTranscript('Only English', '').pairs, null)
  assert.equal(pairTranscript('', 'x'), null)
})

test('người nói đầu dòng hội thoại', () => {
  assert.deepEqual(splitSpeaker('W1: Where is it?'), { speaker: 'W1', text: 'Where is it?' })
  assert.deepEqual(splitSpeaker('Man: Sure.'), { speaker: 'Man', text: 'Sure.' })
  assert.deepEqual(splitSpeaker('Meeting at 3: room B'), { speaker: null, text: 'Meeting at 3: room B' })
})
