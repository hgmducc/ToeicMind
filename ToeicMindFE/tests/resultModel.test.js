import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerSheet, groupMatches, matchesFilter, nextGroupIndex, questionState, reviewCounts, reviewModel } from '../src/features/exams/resultModel.js'

const q = (questionId, partNo, questionNo, selectedOptionId, isCorrect, selectedLabel, correctLabel = 'B') =>
  ({ questionId, partNo, questionNo, selectedOptionId, isCorrect, selectedLabel, correctLabel })

test('trạng thái câu: đúng, sai, bỏ trống', () => {
  assert.equal(questionState(q(1, 1, 1, 11, true, 'B')), 'correct')
  assert.equal(questionState(q(2, 1, 2, 21, false, 'A')), 'wrong')
  assert.equal(questionState(q(3, 1, 3, null, false, null)), 'skipped')
})

test('bảng đáp án Luyện thi: sắp theo Part rồi số câu, giữ số câu gốc, đếm đúng/sai/bỏ trống', () => {
  const sheet = answerSheet([q(7, 5, 101, 71, true, 'B'), q(2, 1, 2, 21, false, 'A', 'C'), q(1, 1, 1, null, false, null)])
  assert.deepEqual(sheet.parts.map((p) => p.partNo), [1, 5])
  assert.deepEqual(sheet.parts[0].items.map((i) => [i.no, i.state, i.correctLabel, i.selectedLabel]), [[1, 'skipped', 'B', null], [2, 'wrong', 'C', 'A']])
  assert.equal(sheet.parts[1].items[0].no, 101)
  assert.deepEqual(sheet.counts, { all: 3, correct: 1, wrong: 1, skipped: 1 })
})

test('bảng đáp án ngân hàng/kiểm tra đầu vào: giữ thứ tự backend, đánh số lại 1..N', () => {
  const sheet = answerSheet([q(9, 5, 130, 91, true, 'B'), q(4, 5, 105, 41, false, 'D'), q(3, 7, 150, null, false, null)], true)
  assert.deepEqual(sheet.parts.flatMap((p) => p.items.map((i) => [i.questionId, i.no])), [[9, 1], [4, 2], [3, 3]])
})

test('thiếu nhãn đáp án (backend cũ) vẫn dựng được bảng', () => {
  const sheet = answerSheet([{ questionId: 1, partNo: 1, questionNo: 1, selectedOptionId: 5, isCorrect: false }])
  assert.equal(sheet.parts[0].items[0].correctLabel, null)
  assert.deepEqual(answerSheet(null), { parts: [], counts: { all: 0, correct: 0, wrong: 0, skipped: 0 } })
})

test('lọc ở trang đáp án chi tiết', () => {
  const right = q(1, 1, 1, 11, true, 'B'), wrong = q(2, 1, 2, 21, false, 'A'), blank = q(3, 1, 3, null, false, null)
  const pick = (filter) => [right, wrong, blank].filter((x) => matchesFilter(x, filter)).map((x) => x.questionId)
  assert.deepEqual(pick('all'), [1, 2, 3])
  assert.deepEqual(pick('wrong'), [2])
  assert.deepEqual(pick('skipped'), [3])
  assert.deepEqual(pick('right'), [1])
})


const reviewData = (scope = 'FULL') => ({
  scope,
  groups: [
    { groupId: 1, partNo: 1, transcriptEn: 'A', translationVi: 'a', questions: [{ questionId: 11, questionNo: 1, selectedOptionId: 102, isCorrect: false, options: [{ optionId: 101, isCorrect: true }, { optionId: 102, isCorrect: false }] }] },
    { groupId: 2, partNo: 3, questions: [
      { questionId: 21, questionNo: 32, selectedOptionId: 201, isCorrect: true, explanation: 'x', options: [{ optionId: 201, isCorrect: true }] },
      { questionId: 22, questionNo: 33, selectedOptionId: null, isCorrect: false, options: [{ optionId: 211, isCorrect: false }, { optionId: 212, isCorrect: true }] },
    ] },
  ],
})

test('reviewModel: trạng thái, số câu, đáp án đúng cả khi bỏ trống, script của nhóm', () => {
  const { groups, numbers, answers } = reviewModel(reviewData())
  assert.deepEqual(groups, [{ groupId: 1, partNo: 1, questionIds: [11] }, { groupId: 2, partNo: 3, questionIds: [21, 22] }])
  assert.deepEqual([...numbers], [[11, 1], [21, 32], [22, 33]])
  assert.deepEqual([answers[11].review, answers[21].review, answers[22].review], ['wrong', 'correct', 'skipped'])
  assert.equal(answers[22].selected, null)
  assert.equal(answers[22].feedback.correctOptionId, 212)
  assert.equal(answers[11].feedback.transcriptEn, 'A')
  assert.equal(answers[22].correct, false)
})

test('reviewModel: ngân hàng đánh số lại 1..N', () => {
  assert.deepEqual([...reviewModel(reviewData('BANK')).numbers.values()], [1, 2, 3])
})

test('lọc nhóm, đếm và chuyển nhóm theo bộ lọc', () => {
  const { groups, answers } = reviewModel(reviewData())
  const marks = new Set([21])
  assert.deepEqual(reviewCounts(answers, marks), { all: 3, wrong: 1, right: 1, skipped: 1, marked: 1 })
  const only = (filter) => groups.filter((g) => groupMatches(g, answers, filter, marks)).map((g) => g.groupId)
  assert.deepEqual([only('all'), only('wrong'), only('right'), only('skipped'), only('marked')], [[1, 2], [1], [2], [2], [2]])
  const wrong = (g) => groupMatches(g, answers, 'wrong', marks)
  assert.equal(nextGroupIndex(groups, 0, 1, wrong), -1)
  assert.equal(nextGroupIndex(groups, 1, -1, wrong), 0)
  assert.equal(nextGroupIndex(groups, -1, 1, (g) => groupMatches(g, answers, 'skipped', marks)), 1)
})
