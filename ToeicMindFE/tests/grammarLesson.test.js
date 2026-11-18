import test from 'node:test'
import assert from 'node:assert/strict'
import { lessonProgress } from '../src/features/grammar/grammarLesson.js'

const segments = [
  { type: 'html', html: '<h2 id="grammar-sec-1">A</h2>' },
  { type: 'quiz', key: 'q1', sectionId: 'grammar-sec-1', correctIndex: 2 },
  { type: 'quiz', key: 'q2', sectionId: 'grammar-sec-1', correctIndex: 0 },
  { type: 'html', html: '<h2 id="grammar-sec-2">B</h2>' },
  { type: 'quiz', key: 'q4', sectionId: 'grammar-sec-2', correctIndex: 1 },
]

test('tiến độ bài học: đếm câu đã làm, câu đúng', () => {
  assert.deepEqual(lessonProgress(segments, {}), { total: 3, answered: 0, correct: 0, doneSections: new Set() })
  const p = lessonProgress(segments, { q1: 2, q4: 3 })
  assert.equal(p.answered, 2)
  assert.equal(p.correct, 1)
})

test('phần chỉ "xong" khi mọi bài tập của phần đã trả lời (đúng hay sai)', () => {
  assert.deepEqual([...lessonProgress(segments, { q1: 0 }).doneSections], [])
  assert.deepEqual([...lessonProgress(segments, { q1: 0, q2: 1, q4: 1 }).doneSections], ['grammar-sec-1', 'grammar-sec-2'])
})
