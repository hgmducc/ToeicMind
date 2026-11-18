import assert from 'node:assert/strict'
import test from 'node:test'
import { readLastBank, saveLastBank } from '../src/features/bank/bankSession.js'
import { MODE_OF, alignWords, flipAccuracy, normWord, pickHidden, sentenceAccuracy, wordsOf } from '../src/features/dictation/dictationText.js'
import { positionKey, readExamOptions, readPosition, writeExamOptions, writePosition } from '../src/features/exams/examOptions.js'

const fakeStorage = () => {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), values }
}

test('dictation words are compared without case, punctuation or curly quotes', () => {
  assert.equal(normWord('Hello,'), 'hello')
  assert.equal(normWord('don’t'), "don't")
  assert.deepEqual(wordsOf('  When is   the next  meeting? '), ['When', 'is', 'the', 'next', 'meeting?'])
  assert.deepEqual(wordsOf(''), [])
})

test('alignment marks the reference words found in order and tolerates insertions and omissions', () => {
  const reference = 'the next meeting is on monday'.split(' ')
  assert.deepEqual(alignWords(reference, reference), [true, true, true, true, true, true])
  assert.deepEqual(alignWords(reference, 'the meeting is monday'.split(' ')), [true, false, true, true, false, true])
  assert.deepEqual(alignWords(reference, 'wrong words only'.split(' ')), [false, false, false, false, false, false])
  assert.deepEqual(alignWords(reference, ['extra', ...reference]), [true, true, true, true, true, true])
})

test('sentence accuracy is the share of reference words typed in order', () => {
  const words = wordsOf('It is scheduled for Monday morning.')
  assert.equal(sentenceAccuracy(words, wordsOf('it is scheduled for monday morning')).accuracy, 100)
  assert.equal(sentenceAccuracy(words, wordsOf('it is for monday')).accuracy, (4 * 100) / 6)
  assert.equal(sentenceAccuracy(words, []).accuracy, 0)
  assert.equal(sentenceAccuracy(words, ['', '  ']).accuracy, 0)
})

test('hidden words are stable per clip, respect the percentage and prefer words of three or more letters', () => {
  const words = wordsOf('When is the next meeting scheduled for Monday morning')
  const first = pickHidden(words, 11, 50)
  assert.deepEqual([...first].sort(), [...pickHidden(words, 11, 50)].sort(), 'cùng clip cho cùng kết quả')
  assert.notDeepEqual([...first].sort(), [...pickHidden(words, 12, 50)].sort())
  assert.equal(pickHidden(words, 11, 100).size, words.length)
  for (const percent of [30, 50, 70]) {
    const hidden = pickHidden(words, 5, percent)
    assert.ok(hidden.size >= 1)
    for (const index of hidden) assert.ok(normWord(words[index]).length >= 3, `${words[index]} quá ngắn để ẩn`)
  }
  assert.equal(pickHidden(['a', 'b'], 1, 30).size, 1, 'luôn ẩn ít nhất một từ')
})

test('dictation modes map to what the backend stores, and flip mode scores by words revealed', () => {
  assert.equal(MODE_OF.DICT(50), 'HIDE_SOME')
  assert.equal(MODE_OF.DICT(100), 'HIDE_ALL')
  assert.equal(MODE_OF.CHECK(50), 'FLIP')
  assert.equal(MODE_OF.FULL(50), 'SHADOW')
  assert.equal(flipAccuracy(4, 0), 100)
  assert.equal(flipAccuracy(4, 1), 75)
  assert.equal(flipAccuracy(4, 9), 0)
  assert.equal(flipAccuracy(0, 0), 0)
})

test('exam options default to on, persist, and survive broken storage', () => {
  const storage = fakeStorage()
  assert.deepEqual(readExamOptions(storage), { autoDirections: true, autoNext: true })
  writeExamOptions({ autoDirections: false, autoNext: true }, storage)
  assert.deepEqual(readExamOptions(storage), { autoDirections: false, autoNext: true })
  storage.setItem('toeicmind_fe_exam_options', '{broken')
  assert.deepEqual(readExamOptions(storage), { autoDirections: true, autoNext: true })
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  assert.deepEqual(readExamOptions(blocked), { autoDirections: true, autoNext: true })
  assert.doesNotThrow(() => writeExamOptions({ autoDirections: true, autoNext: true }, blocked))
})

test('the exam position is remembered per attempt and cleared after submitting', () => {
  const storage = fakeStorage()
  assert.equal(readPosition(7, storage), 0)
  writePosition(7, 12, storage)
  assert.equal(readPosition(7, storage), 12)
  assert.equal(readPosition(8, storage), 0, 'mỗi lượt có vị trí riêng')
  writePosition(7, null, storage)
  assert.equal(readPosition(7, storage), 0)
  storage.setItem(positionKey(9), 'abc')
  assert.equal(readPosition(9, storage), 0)
})

test('the last bank session is remembered for the "study more" button', () => {
  const storage = fakeStorage()
  assert.equal(readLastBank(storage), null)
  saveLastBank({ partNo: 5, cardKey: 'level-2', pick: 'NEW' }, storage)
  assert.deepEqual(readLastBank(storage), { partNo: 5, cardKey: 'level-2', pick: 'NEW' })
  storage.setItem('toeicmind_fe_last_bank', '{broken')
  assert.equal(readLastBank(storage), null)
})
