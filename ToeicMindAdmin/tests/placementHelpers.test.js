import test from 'node:test'
import assert from 'node:assert/strict'
import { insertByPart, moveWithinPart, partSummary, suggestedMinutes } from '../src/features/admin/placementHelpers.js'
import { pathForView, viewForPath } from '../src/routes/adminRoutes.js'

const g = (groupId, partNo, questionCount = 1, isAvailable = true) => ({ groupId, partNo, questionCount, isAvailable })

test('new groups go to the end of their Part block', () => {
  const list = [g(1, 1), g(2, 3, 3), g(3, 5)]
  assert.deepEqual(insertByPart(list, g(9, 3, 3)).map((x) => x.groupId), [1, 2, 9, 3])
  assert.deepEqual(insertByPart(list, g(9, 7, 4)).map((x) => x.groupId), [1, 2, 3, 9])
  assert.deepEqual(insertByPart([], g(9, 2)).map((x) => x.groupId), [9])
})

test('groups only move within the same Part', () => {
  const list = [g(1, 5), g(2, 5), g(3, 6, 4)]
  assert.deepEqual(moveWithinPart(list, 1, -1).map((x) => x.groupId), [2, 1, 3])
  assert.equal(moveWithinPart(list, 1, 1), list)
  assert.equal(moveWithinPart(list, 0, -1), list)
})

test('suggested time and Part summary match the backend rules', () => {
  // 6 câu nghe × 27 giây + 10 câu đọc × 45 giây = 612 giây → 11 phút.
  assert.equal(suggestedMinutes([g(1, 3, 3), g(2, 4, 3), g(3, 5, 10)]), 11)
  assert.equal(suggestedMinutes([g(1, 2)]), 5)
  assert.deepEqual(partSummary([g(1, 3, 3), g(2, 3, 3), g(3, 5, 1, false)]), [{ partNo: 3, groups: 2, questions: 6 }])
})

test('placement page has its own admin URL', () => {
  assert.equal(pathForView('placement'), '/placement-tests')
  assert.equal(viewForPath('/placement-tests'), 'placement')
})
