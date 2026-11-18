import assert from 'node:assert/strict'
import test from 'node:test'
import { formatClock, formatDue, formatSpan, isoDay, percent } from '../src/lib/format.js'
import { withQuery } from '../src/lib/learnerHttp.js'
import { LANDING_PATH, NAV_ITEMS, isFocusRoute, navKeyForPath, paths } from '../src/routes/learnerRoutes.js'

test('query strings drop empty values but keep zero', () => {
  assert.equal(withQuery('/vocab/words', { page: 1, pageSize: 30, search: '', status: undefined, mine: false, partNo: 0 }), '/vocab/words?page=1&pageSize=30&partNo=0')
  assert.equal(withQuery('/me/dashboard'), '/me/dashboard')
  assert.equal(withQuery('/x', { q: 'a b&c' }), '/x?q=a+b%26c')
  assert.equal(withQuery('/x', { mine: true }), '/x?mine=true')
})

test('navigation highlights the parent section for nested pages', () => {
  assert.equal(LANDING_PATH, '/')
  assert.equal(navKeyForPath('/'), 'home')
  assert.equal(navKeyForPath('/vocab/play'), 'vocab')
  assert.equal(navKeyForPath('/vocab/learn'), 'vocab')
  assert.equal(navKeyForPath('/dictation/item/5'), 'listen')
  assert.equal(navKeyForPath('/listen/dictation'), 'listen')
  assert.equal(navKeyForPath('/read/5'), 'read')
  assert.equal(navKeyForPath('/attempt/9'), 'tests')
  assert.equal(navKeyForPath('/result/9'), 'history')
  assert.equal(navKeyForPath('/review/9'), 'history')
  assert.equal(navKeyForPath('/account'), null)
  assert.equal(navKeyForPath('/vocabulary'), null)
  assert.ok(NAV_ITEMS.every((item) => item.path.startsWith('/') && item.label))
  assert.equal(paths.attempt(3), '/attempt/3')
})

test('only an attempt in progress hides the main navigation', () => {
  assert.equal(isFocusRoute('/attempt/12'), true)
  assert.equal(isFocusRoute('/result/12'), false)
  assert.equal(isFocusRoute('/review/12'), true)
  assert.equal(isFocusRoute('/attempt/abc'), false)
  assert.equal(isFocusRoute('/welcome'), true)
  assert.equal(isFocusRoute('/welcome/x'), false)
})

test('formatting helpers produce readable Vietnamese values', () => {
  assert.equal(formatClock(65), '01:05')
  assert.equal(formatClock(3725), '1:02:05')
  assert.equal(formatClock(-4), '00:00')
  assert.equal(formatSpan(0), '1 phút')
  assert.equal(formatSpan(10), '10 phút')
  assert.equal(formatSpan(180), '3 giờ')
  assert.equal(formatSpan(4320), '3 ngày')
  const now = Date.parse('2026-11-14T00:00:00Z')
  assert.equal(formatDue('2026-11-13T00:00:00Z', now), 'Đến hạn')
  assert.equal(formatDue('2026-11-17T00:00:00Z', now), 'Sau 3 ngày')
  assert.equal(formatDue('not a date', now), '')
  assert.equal(percent(1, 3), 33)
  assert.equal(percent(1, 0), 0)
  assert.equal(isoDay(new Date(2026, 10, 4)), '2026-11-04')
})

test('return paths after login stay inside the app and never loop back to authentication', async () => {
  const { safeReturnPath } = await import('../src/routes/learnerRoutes.js')
  assert.equal(safeReturnPath('/vocab/learn?src=NEW'), '/vocab/learn?src=NEW')
  assert.equal(safeReturnPath('/tests'), '/tests')
  assert.equal(safeReturnPath(undefined), '/')
  assert.equal(safeReturnPath('https://evil.example/path'), '/')
  assert.equal(safeReturnPath('//evil.example'), '/')
  assert.equal(safeReturnPath('/\\evil.example'), '/')
  assert.equal(safeReturnPath('/login'), '/')
  assert.equal(safeReturnPath('/login?x=1'), '/')
  assert.equal(safeReturnPath('/forgot-password'), '/')
  assert.equal(safeReturnPath('/loginfoo'), '/loginfoo')
})

test('legacy hash links of the old HTML UI open the matching route', async () => {
  const { legacyHashToPath } = await import('../src/routes/learnerRoutes.js')
  assert.equal(legacyHashToPath('#/vip/result?status=PAID&txnRef=TM1', '/'), '/vip/result?status=PAID&txnRef=TM1')
  assert.equal(legacyHashToPath('#/vocab/learn', '/'), '/vocab/learn')
  assert.equal(legacyHashToPath('#/', '/'), null)
  assert.equal(legacyHashToPath('', '/'), null)
  assert.equal(legacyHashToPath('#section', '/'), null)
  assert.equal(legacyHashToPath('#/vip', '/tests'), null, 'chỉ áp dụng ở gốc')
  assert.equal(legacyHashToPath('#//evil.example', '/'), null)
  assert.equal(legacyHashToPath('#/login', '/'), null)
})

test('operational 503 errors keep the backend message instead of the generic one', async () => {
  const { api } = await import('../src/lib/learnerHttp.js')
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'PAYMENT_NOT_CONFIGURED', message: 'Cổng thanh toán VNPay chưa được cấu hình. Vui lòng thử lại sau.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  try {
    await assert.rejects(() => api.post('/vip/orders', { planCode: 'VIP_1M' }), (error) => {
      assert.equal(error.status, 503)
      assert.equal(error.code, 'PAYMENT_NOT_CONFIGURED')
      assert.match(error.message, /VNPay chưa được cấu hình/)
      return true
    })
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'Đã xảy ra lỗi hệ thống' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    await assert.rejects(() => api.get('/vip/plans'), (error) => { assert.match(error.message, /Hệ thống đang gặp sự cố/); return true })
  } finally { globalThis.fetch = original }
})
