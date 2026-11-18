// Backend GIẢ cho kiểm thử giao diện người học (không phải backend thật, không có SQL Server).
// Hợp đồng bám DTO trong ../ToeicMind (Controllers/DTOs). Chạy: node scripts/mock-learner-api.mjs [cổng, mặc định 5078]
// Mọi dữ liệu là dữ liệu kiểm thử tự tạo; không có tài khoản hay bí mật thật.
import http from 'node:http'

export const VOCAB = [
  ['interview', 'n', 'cuộc phỏng vấn', 'a formal meeting to assess someone for a job', 'She prepared carefully for the interview.', 'Cô ấy chuẩn bị kỹ cho buổi phỏng vấn.'],
  ['schedule', 'n', 'lịch trình', 'a plan of times when things will happen', 'Please check the schedule before the meeting.', 'Hãy kiểm tra lịch trình trước cuộc họp.'],
  ['manager', 'n', 'quản lý', 'a person who controls a team or department', 'The manager approved the budget yesterday.', 'Quản lý đã duyệt ngân sách hôm qua.'],
  ['invoice', 'n', 'hóa đơn', 'a list of goods or services with prices', 'We will send the invoice by email.', 'Chúng tôi sẽ gửi hóa đơn qua email.'],
  ['deadline', 'n', 'hạn chót', 'the time by which something must be finished', 'The deadline is next Friday.', 'Hạn chót là thứ Sáu tuần sau.'],
  ['colleague', 'n', 'đồng nghiệp', 'a person you work with', 'My colleague helped me with the report.', 'Đồng nghiệp đã giúp tôi làm báo cáo.'],
  ['budget', 'n', 'ngân sách', 'the money available for a purpose', 'The budget for training was increased.', 'Ngân sách đào tạo đã được tăng.'],
  ['proposal', 'n', 'đề xuất', 'a formal suggestion or plan', 'They accepted our proposal immediately.', 'Họ chấp nhận đề xuất của chúng tôi ngay.'],
  ['review', 'v', 'xem xét', 'to examine something carefully', 'We review every contract twice.', 'Chúng tôi xem xét mọi hợp đồng hai lần.'],
  ['contract', 'n', 'hợp đồng', 'a legal agreement between two parties', 'Both sides signed the contract.', 'Hai bên đã ký hợp đồng.'],
  ['supplier', 'n', 'nhà cung cấp', 'a company that provides goods', 'Our supplier delivers every Monday.', 'Nhà cung cấp giao hàng mỗi thứ Hai.'],
  ['warehouse', 'n', 'nhà kho', 'a large building for storing goods', 'The warehouse is near the harbor.', 'Nhà kho nằm gần bến cảng.'],
  ['negotiate', 'v', 'đàm phán', 'to discuss something to reach an agreement', 'They negotiate prices every year.', 'Họ đàm phán giá mỗi năm.'],
  ['confirm', 'v', 'xác nhận', 'to say that something is true or certain', 'Please confirm your reservation.', 'Vui lòng xác nhận đặt chỗ của bạn.'],
  ['postpone', 'v', 'hoãn lại', 'to delay something until a later time', 'The meeting was postponed until Monday.', 'Cuộc họp bị hoãn đến thứ Hai.'],
  ['reimburse', 'v', 'hoàn tiền', 'to pay back money that was spent', 'The company will reimburse travel costs.', 'Công ty sẽ hoàn lại chi phí đi lại.'],
  ['attend', 'v', 'tham dự', 'to be present at an event', 'Over fifty people attended the seminar.', 'Hơn năm mươi người tham dự hội thảo.'],
  ['recipient', 'n', 'người nhận', 'a person who receives something', 'The recipient must sign for the package.', 'Người nhận phải ký nhận gói hàng.'],
  ['inventory', 'n', 'hàng tồn kho', 'a complete list of goods in stock', 'We count the inventory every month.', 'Chúng tôi kiểm kê hàng tồn kho mỗi tháng.'],
  ['revenue', 'n', 'doanh thu', 'income that a company receives', 'Revenue grew by ten percent.', 'Doanh thu tăng mười phần trăm.'],
  ['qualified', 'adj', 'đủ tiêu chuẩn', 'having the skills needed for a job', 'She is highly qualified for the position.', 'Cô ấy rất đủ tiêu chuẩn cho vị trí này.'],
  ['available', 'adj', 'có sẵn', 'able to be used or obtained', 'Tickets are available online.', 'Vé có sẵn trực tuyến.'],
  ['mandatory', 'adj', 'bắt buộc', 'required by a rule or law', 'Safety training is mandatory.', 'Huấn luyện an toàn là bắt buộc.'],
  ['subsequent', 'adj', 'tiếp theo', 'coming after something else', 'Subsequent orders receive a discount.', 'Các đơn tiếp theo được giảm giá.'],
].map(([lemma, posCode, meaningVi, definitionEn, exampleEn, exampleVi], i) => ({
  vocabId: i + 1, lemma, posCode, meaningVi, definitionEn, exampleEn, exampleVi, ipaUs: lemma.slice(0, 3) + 'ə', cefrLevel: i % 3 === 0 ? 'B1' : i % 3 === 1 ? 'B2' : 'A2',
}))

const DAY = 86400000
const iso = (ms) => new Date(ms).toISOString()

export function createState() {
  const now = Date.now()
  const progress = new Map()
  const set = (id, p) => progress.set(id, { status: 'LEARNING', repetitions: 2, intervalDays: 3, lapses: 0, lastReviewedAt: iso(now - 4 * DAY), nextReviewAt: iso(now - DAY), ...p })
  ;[1, 2, 3, 4].forEach((id) => set(id))                                                         // đến hạn ôn
  set(5, { status: 'MASTERED', repetitions: 6, intervalDays: 40, nextReviewAt: iso(now + 20 * DAY) })    // đã thuộc, chưa đến hạn
  set(6, { status: 'LEARNING', repetitions: 0, intervalDays: 0, lapses: 2, nextReviewAt: iso(now + 3600000) })
  return {
    user: { userId: 7, username: 'Học viên thử', email: 'learner@example.com', role: 'LEARNER', status: 'ACTIVE', hasPassword: true, createdAt: '2026-10-29T08:00:00Z' },
    progress, reviews: [], mine: [{ userVocabId: 1, vocabId: null, word: 'sample', meaning: 'mẫu', example: 'A sample sentence.', pos: 'n', cefr: null, ipa: null, createdAt: iso(now) }], nextMineId: 2,
  }
}

const wordDto = (state, w) => {
  const p = state.progress.get(w.vocabId)
  const due = p ? Date.parse(p.nextReviewAt) <= Date.now() : false
  return {
    vocabId: w.vocabId, lemma: w.lemma, posCode: w.posCode, ipaUs: w.ipaUs, ipaUk: null, cefrLevel: w.cefrLevel, meaningVi: w.meaningVi, definitionEn: w.definitionEn,
    status: p?.status ?? 'NEW', isDue: due, intervalDays: p?.intervalDays ?? 0, repetitions: p?.repetitions ?? 0, lapses: p?.lapses ?? 0,
    nextReviewAt: p?.nextReviewAt ?? null, lastReviewedAt: p?.lastReviewedAt ?? null,
  }
}
const cardDto = (state, w) => ({
  word: wordDto(state, w), kind: state.progress.has(w.vocabId) ? 'REVIEW' : 'NEW', previewMinutes: [10, 1440, 4320, 10080],
  contexts: [{ surfaceForm: w.lemma, meaningVi: null, exampleEn: w.exampleEn, exampleVi: w.exampleVi }],
})

function nextProgress(old, grade) {
  const reps = old?.repetitions ?? 0
  const interval = grade === 0 ? 0 : grade === 1 ? 1 : grade === 2 ? (reps === 0 ? 1 : reps === 1 ? 3 : Math.max(old.intervalDays + 1, Math.round(old.intervalDays * 2.5))) : (reps === 0 ? 4 : 7)
  return {
    status: interval >= 21 ? 'MASTERED' : 'LEARNING', repetitions: grade === 0 ? 0 : reps + 1, intervalDays: interval, lapses: (old?.lapses ?? 0) + (grade === 0 ? 1 : 0),
    lastReviewedAt: iso(Date.now()), nextReviewAt: iso(Date.now() + (grade === 0 ? 600000 : interval * DAY)),
  }
}

export function handle(state, method, url, body, auth) {
  const path = url.pathname.replace(/^\/api/, '').toLowerCase()
  const q = url.searchParams
  const ok = (data, status = 200) => ({ status, data })
  const fail = (status, code, message) => ({ status, data: { code, message, traceId: 'mock' } })
  const session = () => ({ accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z', refreshExpiresAt: '2099-02-01T00:00:00Z', user: state.user })

  if (path === '/__mock/state') return ok({ reviews: state.reviews, progress: [...state.progress.entries()] })
  if (path === '/auth/login') return body?.password === 'wrong' ? fail(400, 'INVALID_CREDENTIALS', 'Sai thông tin') : ok(session())
  if (path === '/auth/refresh') return ok(session())
  if (path === '/auth/logout') return { status: 204, data: null }
  // Người dùng tự sửa hồ sơ (chỉ tên hiển thị; trường lạ → 400 như backend) và đổi mật khẩu (mật khẩu hiện tại của mock: 'secret123', khớp lần đăng nhập).
  state.accountBodies ||= []
  if (path === '/__mock/account-bodies') return ok(state.accountBodies)
  if (path === '/auth/me' && method === 'PUT') {
    if (!auth) return fail(401, 'UNAUTHORIZED', 'Cần đăng nhập')
    state.accountBodies.push({ path, body })
    if (Object.keys(body || {}).some((k) => k !== 'username')) return fail(400, 'VALIDATION_ERROR', 'Trường không hợp lệ')
    const username = String(body?.username ?? '').trim()
    if (!username) return fail(400, 'USERNAME_REQUIRED', 'Tên hiển thị không được để trống')
    state.user = { ...state.user, username }
    return ok(state.user)
  }
  if (path === '/auth/change-password' && method === 'PUT') {
    if (!auth) return fail(401, 'UNAUTHORIZED', 'Cần đăng nhập')
    state.accountBodies.push({ path, body })
    if (body?.oldPassword !== (state.password || 'secret123')) return fail(401, 'INVALID_OLD_PASSWORD', 'Mật khẩu cũ không chính xác')
    state.password = body.newPassword
    return ok({ message: 'Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được đăng xuất.' })
  }
  if (path === '/auth/me') return auth ? ok(state.user) : fail(401, 'UNAUTHORIZED', 'Cần đăng nhập')
  if (!auth) return fail(401, 'UNAUTHORIZED', 'Cần access token hợp lệ để truy cập')

  if (path === '/me/dashboard') {
    return ok({
      totalAttempts: 3, submittedAttempts: 2, answeredQuestions: 120, correctAnswers: 90, accuracyPercent: 75, currentStreak: 4, longestStreak: 9, studiedToday: false,
      bestTotalScaled: 640, lastTotalScaled: 610, savedWordCount: state.mine.length,
      parts: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ partNo: n, partName: `Part ${n}`, totalQuestions: 50, practicedCount: n * 5, correctCount: n * 4, wrongCount: n })),
      studyDays: [0, 1, 2, 5, 9].map((d) => ({ date: iso(Date.now() - d * DAY).slice(0, 10), attemptCount: (d % 3) + 1 })),
      scoreHistory: [{ totalScaled: 520, examTitle: 'Test 1', submittedAt: iso(Date.now() - 9 * DAY) }, { totalScaled: 580, examTitle: 'Test 2', submittedAt: iso(Date.now() - 5 * DAY) }, { totalScaled: 640, examTitle: 'Test 3', submittedAt: iso(Date.now() - DAY) }],
      recentAttempts: [{ attemptId: 11, examId: 1, examTitle: 'Test 3', mode: 'EXAM', scope: 'FULL', status: 'IN_PROGRESS', startedAt: iso(Date.now() - 3600000), totalQuestions: 200 },
        { attemptId: 10, examId: 1, examTitle: 'Test 2', mode: 'PRACTICE', scope: 'PART', status: 'SUBMITTED', startedAt: iso(Date.now() - 2 * DAY), submittedAt: iso(Date.now() - 2 * DAY), totalQuestions: 30, correctCount: 24 }],
    })
  }

  if (path === '/vocab/overview') {
    const all = [...state.progress.values()]
    return ok({
      totalWords: VOCAB.length, newWords: VOCAB.length - all.length, learningWords: all.filter((p) => p.status !== 'MASTERED').length, masteredWords: all.filter((p) => p.status === 'MASTERED').length,
      dueNow: all.filter((p) => Date.parse(p.nextReviewAt) <= Date.now()).length, newToday: 0, reviewedToday: state.reviews.length, newPerDay: 10, lockedWords: 0,
      sets: [{ examSetId: 1, name: 'ETS 2026', examCount: 1, wordCount: VOCAB.length, learnedCount: all.length, masteredCount: 1, dueCount: 4, access: 'FREE', isLocked: false }],
    })
  }
  if (path === '/vocab/sets/1/exams') {
    return ok([{ examId: 1, examCode: 'T1', title: 'Test 1', wordCount: VOCAB.length, learnedCount: state.progress.size, masteredCount: 1, dueCount: 4, isLocked: false,
      parts: [5, 6, 7].map((n) => ({ partNo: n, partName: `Part ${n}`, wordCount: 8, learnedCount: 2, masteredCount: 0, dueCount: 1 })) }])
  }
  if (path === '/vocab/words') {
    const page = Number(q.get('page')) || 1, size = Number(q.get('pageSize')) || 30, status = q.get('status'), search = (q.get('search') || '').toLowerCase(), cefr = q.get('cefrLevel')
    let list = VOCAB.map((w) => wordDto(state, w))
    if (status === 'NEW') list = list.filter((w) => w.status === 'NEW')
    if (status === 'DUE') list = list.filter((w) => w.isDue)
    if (status === 'LEARNING') list = list.filter((w) => w.status === 'LEARNING')
    if (status === 'MASTERED') list = list.filter((w) => w.status === 'MASTERED')
    if (cefr) list = list.filter((w) => w.cefrLevel === cefr)
    if (search) list = list.filter((w) => w.lemma.includes(search) || w.meaningVi.toLowerCase().includes(search))
    return ok({ items: list.slice((page - 1) * size, page * size), total: list.length, page, pageSize: size })
  }
  if (path === '/vocab/study') {
    const mode = q.get('mode') || 'MIXED', limit = Number(q.get('limit')) || 20
    const dto = VOCAB.map((w) => wordDto(state, w))
    const due = dto.filter((w) => w.isDue), fresh = dto.filter((w) => w.status === 'NEW')
    let picked
    if (mode === 'PRACTICE') picked = dto.slice().sort(() => Math.random() - 0.5).slice(0, limit)
    else if (mode === 'REVIEW') picked = due.slice(0, limit)
    else if (mode === 'NEW') picked = fresh.slice(0, Math.min(limit, 10))
    else { picked = due.slice(0, limit); picked = picked.concat(fresh.slice(0, Math.min(10, limit - picked.length))) }
    const ids = new Set(picked.map((w) => w.vocabId))
    return ok({
      dueTotal: due.length, newTotal: fresh.length,
      cards: picked.map((w) => cardDto(state, VOCAB[w.vocabId - 1])),
      pool: VOCAB.filter((w) => !ids.has(w.vocabId)).slice(0, 40).map((w) => ({ vocabId: w.vocabId, lemma: w.lemma, posCode: w.posCode, meaningVi: w.meaningVi })),
    })
  }
  const review = path.match(/^\/vocab\/(\d+)\/review$/)
  if (review && method === 'POST') {
    const id = Number(review[1]), grade = body?.grade
    if (!Number.isInteger(grade) || grade < 0 || grade > 3) return fail(400, 'VALIDATION_ERROR', 'Grade không hợp lệ')
    const next = nextProgress(state.progress.get(id), grade)
    state.progress.set(id, next)
    state.reviews.push({ vocabId: id, grade })
    return ok({ vocabId: id, status: next.status, intervalDays: next.intervalDays, repetitions: next.repetitions, lapses: next.lapses, easeFactor: 2.5, nextReviewAt: next.nextReviewAt })
  }

  if (path === '/me/vocabulary' && method === 'GET') return ok({ items: state.mine, totalCount: state.mine.length, page: 1, pageSize: 30 })
  if (path === '/me/vocabulary' && method === 'POST') {
    if (body?.vocabId && state.mine.some((m) => m.vocabId === body.vocabId)) return fail(409, 'VOCAB_EXISTS', 'Từ này đã có trong bộ từ của bạn')
    const w = body?.vocabId ? VOCAB[body.vocabId - 1] : null
    state.mine.push({ userVocabId: state.nextMineId++, vocabId: body?.vocabId ?? null, word: w?.lemma ?? body?.customWord, meaning: w?.meaningVi ?? body?.customMeaning, example: body?.customExample ?? null, pos: w?.posCode ?? null, cefr: w?.cefrLevel ?? null, ipa: null, createdAt: iso(Date.now()) })
    return ok(state.mine.at(-1), 201)
  }
  const mine = path.match(/^\/me\/vocabulary\/(\d+)$/)
  if (mine && method === 'DELETE') { state.mine = state.mine.filter((m) => m.userVocabId !== Number(mine[1])); return { status: 204, data: null } }

  return fail(404, 'NOT_FOUND', `Mock chưa hỗ trợ ${method} ${path}`)
}

export function start(port = Number(process.env.PORT) || 5078, extraHandlers = []) {
  const state = createState()
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const url = new URL(req.url, `http://localhost:${port}`)
      let body = null
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null } catch { body = null }
      const auth = /^Bearer mock-access$/.test(req.headers.authorization || '')
      let result = null
      for (const extra of extraHandlers) { result = extra(state, req.method, url, body, auth); if (result) break }
      result ||= handle(state, req.method, url, body, auth)
      if (result.headers) { res.writeHead(result.status, result.headers); res.end(); return }
      if (result.raw) { res.writeHead(result.status, { 'Content-Type': result.contentType }); res.end(result.raw); return }
      res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(result.data === null ? '' : JSON.stringify(result.data))
    })
  })
  return new Promise((resolve, reject) => {
    server.once('error', (error) => reject(error.code === 'EADDRINUSE' ? new Error(`Cổng ${port} đang bận (có backend hoặc mock khác đang chạy). Hãy tắt nó rồi chạy lại.`) : error))
    server.listen(port, () => resolve({ server, state, port }))
  })
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  start().then(({ port }) => console.log(`Mock learner API (dữ liệu thử) tại http://localhost:${port}`))
}
