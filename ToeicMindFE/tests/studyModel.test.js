import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerStatus, buildGroupOrder, clampSplit, formatTime, groupInstruction, nextRate, statusCounts, waveform } from '../src/features/exams/workspace/studyModel.js'

const q = (questionId, groupId, partNo, questionNo) => ({ questionId, groupId, partNo, questionNo })

test('đề thi: nhóm theo Part rồi số câu, giữ số câu gốc', () => {
  const { groups, numbers } = buildGroupOrder([q(9, 70, 7, 147), q(1, 10, 1, 1), q(10, 70, 7, 148), q(5, 50, 5, 101)])
  assert.deepEqual(groups.map((g) => [g.groupId, g.partNo, g.questionIds]), [[10, 1, [1]], [50, 5, [5]], [70, 7, [9, 10]]])
  assert.equal(numbers.get(9), 147)
})

test('ngân hàng: giữ thứ tự nội dung, đánh số lại 1..N', () => {
  const { groups, numbers } = buildGroupOrder([q(1, 10, 5, 130), q(2, 20, 5, 101), q(3, 20, 5, 102)], [20, 10])
  assert.deepEqual(groups.map((g) => g.groupId), [20, 10])
  assert.deepEqual([numbers.get(2), numbers.get(3), numbers.get(1)], [1, 2, 3])
})

test('câu dẫn theo Part, một câu hay nhiều câu', () => {
  assert.match(groupInstruction(1, 1, 1), /picture/)
  assert.equal(groupInstruction(7, 147, 148), 'Questions 147–148 refer to the following text.')
  assert.equal(groupInstruction(3, 32, 32), 'Question 32 refers to the following conversation.')
  assert.equal(groupInstruction(9, 1, 1), '')
})

test('trạng thái và đếm trong bảng câu hỏi', () => {
  assert.equal(answerStatus({ selected: 3, correct: true }), 'correct')
  assert.equal(answerStatus({ selected: 3, correct: false }), 'wrong')
  assert.equal(answerStatus({ selected: 3, correct: null }), 'selected')
  assert.equal(answerStatus(undefined), 'todo')
  assert.deepEqual(statusCounts({ 1: { selected: 1, correct: true }, 2: { selected: 2, correct: null } }, [1, 2, 3]), { correct: 1, wrong: 0, selected: 1, todo: 1 })
})

test('sóng âm ổn định theo seed, tốc độ phát xoay vòng, thời gian, tỷ lệ chia khung', () => {
  const a = waveform('group-1'), b = waveform('group-1')
  assert.deepEqual(a, b)
  assert.equal(a.length, 64)
  assert.ok(a.every((h) => h >= 0.3 && h <= 1))
  assert.notDeepEqual(a, waveform('group-2'))
  assert.equal(nextRate(1), 1.25)
  assert.equal(nextRate(1.5), 0.75)
  assert.equal(formatTime(71.9), '01:11')
  assert.equal(clampSplit(0.9), 0.68)
  assert.equal(clampSplit('x'), 0.5)
})
