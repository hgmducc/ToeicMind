import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readPracticeOptions, writePracticeOptions } from '../src/features/exams/examOptions.js'

const memory = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) } }

test('Luyện tập: mặc định hiện đáp án ngay, lưu được lựa chọn tắt/bật', () => {
  const storage = memory()
  assert.deepEqual(readPracticeOptions(storage), { instantAnswer: true })
  writePracticeOptions({ instantAnswer: false }, storage)
  assert.deepEqual(readPracticeOptions(storage), { instantAnswer: false })
  writePracticeOptions({ instantAnswer: true }, storage)
  assert.deepEqual(readPracticeOptions(storage), { instantAnswer: true })
})

test('Luyện tập: storage hỏng hoặc bị chặn vẫn dùng mặc định', () => {
  const broken = { getItem: () => '{not json', setItem: () => { throw new Error('blocked') } }
  assert.deepEqual(readPracticeOptions(broken), { instantAnswer: true })
  assert.doesNotThrow(() => writePracticeOptions({ instantAnswer: false }, broken))
})
