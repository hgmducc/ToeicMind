// Mô hình thuần của màn làm bài dạng "không gian học" (Luyện tập và Luyện thi): thứ tự nhóm câu, đánh số,
// câu dẫn theo Part, trạng thái ô trong bảng câu hỏi, sóng âm trang trí. Không phụ thuộc React để kiểm thử được.

// Câu dẫn tiếng Anh ngắn đặt ở đầu khung nội dung (diễn đạt riêng, theo đúng dạng bài của từng Part).
export function groupInstruction(partNo, first, last) {
  const range = first === last ? `Question ${first} refers` : `Questions ${first}–${last} refer`
  switch (partNo) {
    case 1: return 'Select the one statement that best describes what you see in the picture.'
    case 2: return 'Listen to the question or statement, then select the best response.'
    case 3: return `${range} to the following conversation.`
    case 4: return `${range} to the following talk.`
    case 5: return 'Select the answer that best completes the sentence.'
    case 6: return `${range} to the following text. Select the best answer to complete it.`
    case 7: return `${range} to the following text.`
    default: return ''
  }
}

// Thứ tự nhóm câu của lượt làm.
// - Đề thi: theo Part rồi số câu.
// - Ngân hàng/kiểm tra đầu vào (contentOrder = danh sách groupId theo nội dung gửi kèm): giữ thứ tự đó, đánh số lại 1..N.
// Trả { groups: [{ groupId, partNo, questionIds }], numbers: Map(questionId → số hiển thị) }.
export function buildGroupOrder(questions, contentOrder = null) {
  const list = [...(questions || [])]
  const rank = contentOrder ? new Map(contentOrder.map((groupId, index) => [groupId, index])) : null
  list.sort(rank
    ? (a, b) => (rank.get(a.groupId) ?? 1e9) - (rank.get(b.groupId) ?? 1e9) || a.questionNo - b.questionNo
    : (a, b) => a.partNo - b.partNo || a.questionNo - b.questionNo)
  const groups = []
  const byId = new Map()
  const numbers = new Map()
  list.forEach((question, index) => {
    numbers.set(question.questionId, rank ? index + 1 : question.questionNo)
    let group = byId.get(question.groupId)
    if (!group) { group = { groupId: question.groupId, partNo: question.partNo, questionIds: [] }; byId.set(question.groupId, group); groups.push(group) }
    group.questionIds.push(question.questionId)
  })
  return { groups, numbers }
}

// Câu đã hiện đáp án (đã chấm) thì khóa; câu chỉ mới chọn vẫn đổi được.
export const isRevealed = (answer) => answer?.correct === true || answer?.correct === false

// Trạng thái một câu trong bảng câu hỏi: đúng/sai (đã chấm), đã chọn (chưa chấm), chưa làm.
export function answerStatus(answer) {
  if (answer?.correct === true) return 'correct'
  if (answer?.correct === false) return 'wrong'
  return answer?.selected ? 'selected' : 'todo'
}

export function statusCounts(answers, questionIds) {
  const counts = { correct: 0, wrong: 0, selected: 0, todo: 0 }
  for (const id of questionIds) counts[answerStatus(answers[id])] += 1
  return counts
}

// Sóng âm trang trí (không phải phổ thật): chiều cao cố định theo seed để không nhảy khi vẽ lại.
export function waveform(seed, count = 64) {
  let h = 2166136261
  for (const char of String(seed)) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  const bars = []
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ i
    const noise = ((h >>> 0) % 1000) / 1000
    bars.push(Math.round((0.3 + 0.7 * (0.55 * noise + 0.45 * Math.abs(Math.sin(i / 3.1)))) * 100) / 100)
  }
  return bars
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const RATES = [0.75, 1, 1.25, 1.5]
export const nextRate = (rate) => RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1

// Tỷ lệ chia khung trái/phải (kéo thanh giữa), giới hạn để không khung nào quá hẹp.
export const clampSplit = (value) => Math.min(0.68, Math.max(0.32, Number(value) || 0.5))
