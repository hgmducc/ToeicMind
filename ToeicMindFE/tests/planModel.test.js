import assert from 'node:assert/strict'
import test from 'node:test'
import { daysLabel, kindMeta, minutesLabel, needsOnboarding, onboardingRedirect, recommendationTarget, skillProgress, validateProfile } from '../src/features/plan/planModel.js'

test('thiết lập ban đầu: chỉ chặn khi hồ sơ chưa từng lưu; mọi trang trừ /welcome chuyển về /welcome', () => {
  assert.equal(needsOnboarding({ isSet: false }), true)
  assert.equal(needsOnboarding({ isSet: true }), false)
  assert.equal(needsOnboarding(null), false, 'lỗi tải/dữ liệu lạ không chặn')
  assert.equal(onboardingRedirect('required', '/tests'), '/welcome')
  assert.equal(onboardingRedirect('required', '/login'), '/welcome')
  assert.equal(onboardingRedirect('required', '/welcome'), null)
  assert.equal(onboardingRedirect('ok', '/tests'), null)
  assert.equal(onboardingRedirect('loading', '/tests'), null)
})

test('form mục tiêu bắt buộc: thiếu điểm mục tiêu hoặc số phút thì báo lỗi, ngày thi vẫn tùy chọn', () => {
  const today = '2026-11-17'
  const empty = validateProfile({ targetScore: '', examDate: '', dailyMinutes: '' }, today, { required: true })
  assert.ok(empty.errors.targetScore)
  assert.ok(empty.errors.dailyMinutes)
  assert.equal(empty.errors.examDate, undefined)
  assert.deepEqual(validateProfile({ targetScore: 650, examDate: '', dailyMinutes: 30 }, today, { required: true }), { errors: {}, body: { targetScore: 650, examDate: null, dailyMinutes: 30 } })
  assert.match(validateProfile({ targetScore: '652', dailyMinutes: 30 }, today, { required: true }).errors.targetScore, /bội số của 5/)
})
import { navKeyForPath } from '../src/routes/learnerRoutes.js'

test('recommendation actions open the matching lesson', () => {
  assert.deepEqual(recommendationTarget({ type: 'BANK', partNo: 5, cardKey: 'cat-63', pick: 'WRONG' }), { kind: 'bank', partNo: 5, cardKey: 'cat-63', pick: 'WRONG' })
  assert.deepEqual(recommendationTarget({ type: 'BANK', partNo: 1 }), { kind: 'bank', partNo: 1, cardKey: 'all', pick: 'NEW' })
  assert.equal(recommendationTarget({ type: 'PLACEMENT' }).to, '/placement')
  assert.equal(recommendationTarget({ type: 'PLACEMENT', attemptId: 42 }).to, '/attempt/42')
  assert.equal(recommendationTarget({ type: 'VOCAB', vocabMode: 'REVIEW', count: 14 }).to, '/vocab/play?src=REVIEW&n=14')
  assert.equal(recommendationTarget({ type: 'VOCAB', vocabMode: 'NEW', count: 100 }).to, '/vocab/play?src=NEW&n=30')
  assert.equal(recommendationTarget({ type: 'DICTATION', dictationStatus: 'NEW', levelNo: 2 }).to, '/dictation/items?status=NEW&levelNo=2')
  assert.equal(recommendationTarget({ type: 'DICTATION' }).to, '/dictation/items')
  assert.equal(recommendationTarget({ type: 'EXAM' }).to, '/tests')
  assert.deepEqual(recommendationTarget({ type: 'PROFILE' }), { kind: 'profile' })
  assert.equal(recommendationTarget({ type: 'UNKNOWN' }).to, '/plan')
  assert.equal(kindMeta('NOPE').icon, 'sparkles')
})

test('profile validation mirrors the backend rules', () => {
  const today = '2026-11-17'
  assert.deepEqual(validateProfile({ targetScore: '650', examDate: '2026-12-20', dailyMinutes: '45' }, today), { errors: {}, body: { targetScore: 650, examDate: '2026-12-20', dailyMinutes: 45 } })
  assert.deepEqual(validateProfile({ targetScore: '', examDate: '', dailyMinutes: '' }, today).body, { targetScore: null, examDate: null, dailyMinutes: null })
  assert.ok(validateProfile({ targetScore: '652' }, today).errors.targetScore)
  assert.ok(validateProfile({ targetScore: '995' }, today).errors.targetScore)
  assert.ok(validateProfile({ targetScore: '5' }, today).errors.targetScore)
  assert.ok(validateProfile({ examDate: '2026-11-16' }, today).errors.examDate)
  assert.equal(validateProfile({ examDate: '2026-11-17' }, today).errors.examDate, undefined)
  assert.ok(validateProfile({ examDate: '17/11/2026' }, today).errors.examDate)
  assert.ok(validateProfile({ dailyMinutes: '4' }, today).errors.dailyMinutes)
  assert.ok(validateProfile({ dailyMinutes: '30.5' }, today).errors.dailyMinutes)
})

test('skill progress and labels', () => {
  assert.equal(skillProgress({ estimatedScaled: 200, targetScaled: 400 }), 50)
  assert.equal(skillProgress({ estimatedScaled: 450, targetScaled: 400 }), 100)
  assert.equal(skillProgress({ estimatedScaled: null, targetScaled: 400 }), null)
  assert.equal(skillProgress({ estimatedScaled: 300 }), null)
  assert.equal(daysLabel(null), '')
  assert.equal(daysLabel(-2), 'Ngày thi đã qua')
  assert.equal(daysLabel(0), 'Thi hôm nay')
  assert.equal(daysLabel(12), 'Còn 12 ngày')
  assert.equal(minutesLabel(45), '45 phút')
  assert.equal(minutesLabel(90), '1 giờ 30 phút')
  assert.equal(minutesLabel(120), '2 giờ')
  assert.equal(minutesLabel(0), '1 phút')
})

test('plan and placement pages highlight the Lộ trình menu', () => {
  assert.equal(navKeyForPath('/plan'), 'plan')
  assert.equal(navKeyForPath('/placement'), 'plan')
  assert.equal(navKeyForPath('/planet'), null)
})
