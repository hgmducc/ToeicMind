// Dựng bảng đáp án ở trang kết quả từ result.questions (đã nộp): nhóm theo Part, trạng thái từng câu và số đếm.
// renumber: bài ngân hàng/kiểm tra đầu vào gộp câu nhiều đề nên đánh số lại 1..N theo thứ tự backend trả về.

export function questionState(question) {
  if (!question.selectedOptionId) return 'skipped'
  return question.isCorrect ? 'correct' : 'wrong'
}

export function answerSheet(questions, renumber = false) {
  const list = renumber ? [...(questions || [])] : [...(questions || [])].sort((a, b) => a.partNo - b.partNo || a.questionNo - b.questionNo)
  const counts = { all: list.length, correct: 0, wrong: 0, skipped: 0 }
  const parts = []
  list.forEach((question, index) => {
    const state = questionState(question)
    counts[state] += 1
    let part = parts[parts.length - 1]
    if (!part || part.partNo !== question.partNo) { part = { partNo: question.partNo, items: [] }; parts.push(part) }
    part.items.push({
      questionId: question.questionId,
      no: renumber ? index + 1 : question.questionNo,
      state,
      correctLabel: question.correctLabel || null,
      selectedLabel: question.selectedLabel || null,
    })
  })
  return { parts, counts }
}

// Lọc ở trang xem lại: 'wrong' = chọn sai, 'skipped' = bỏ trống, 'right' = đúng.
export function matchesFilter(question, filter) {
  if (filter === 'all') return true
  const state = questionState(question)
  return filter === 'right' ? state === 'correct' : state === filter
}

// Trang Đáp án chi tiết dạng không gian học: mỗi lần một nhóm câu.
// Trả { groups: [{ groupId, partNo, questionIds }], numbers: Map(questionId → số hiển thị), answers }.
// answers[questionId] có dạng của màn Luyện tập ({ selected, correct, feedback }) để dùng lại QuestionCard/RevealPanels,
// kèm review = 'correct' | 'wrong' | 'skipped'. Câu bỏ trống cũng có feedback để tô đáp án đúng và hiện giải thích.
export function reviewModel(data) {
  const bank = data.scope === 'BANK' || data.scope === 'PLACEMENT'
  let n = 0
  const numbers = new Map()
  const answers = {}
  const groups = (data.groups || []).map((group) => {
    for (const q of group.questions) {
      numbers.set(q.questionId, bank ? ++n : q.questionNo)
      const review = questionState(q)
      answers[q.questionId] = {
        selected: q.selectedOptionId ?? null,
        correct: review === 'correct',
        review,
        feedback: {
          isCorrect: review === 'correct',
          correctOptionId: q.options.find((o) => o.isCorrect)?.optionId ?? null,
          explanation: q.explanation,
          optionExplanations: q.optionExplanations,
          vocabularies: q.vocabularies || [],
          transcriptEn: group.transcriptEn,
          translationVi: group.translationVi,
        },
      }
    }
    return { groupId: group.groupId, partNo: group.partNo, questionIds: group.questions.map((q) => q.questionId) }
  })
  return { groups, numbers, answers }
}

// Lọc ở thanh dưới: all | wrong | right | skipped | marked. Một nhóm khớp khi có ít nhất một câu khớp.
const REVIEW_OF = { wrong: 'wrong', right: 'correct', skipped: 'skipped' }
export function questionMatches(answer, questionId, filter, marks) {
  if (filter === 'all') return true
  if (filter === 'marked') return marks.has(questionId)
  return answer?.review === REVIEW_OF[filter]
}
export const groupMatches = (group, answers, filter, marks) => group.questionIds.some((id) => questionMatches(answers[id], id, filter, marks))

export function reviewCounts(answers, marks) {
  const list = Object.entries(answers)
  return {
    all: list.length,
    wrong: list.filter(([, a]) => a.review === 'wrong').length,
    right: list.filter(([, a]) => a.review === 'correct').length,
    skipped: list.filter(([, a]) => a.review === 'skipped').length,
    marked: list.filter(([id]) => marks.has(Number(id))).length,
  }
}

// Nhóm kế tiếp/trước (dir = 1 | -1) khớp bộ lọc tính từ vị trí from; không có thì trả -1.
export function nextGroupIndex(groups, from, dir, matches) {
  for (let i = from + dir; i >= 0 && i < groups.length; i += dir) if (matches(groups[i])) return i
  return -1
}
