import { readFileSync } from 'node:fs'
// Phần nội dung của backend GIẢ: đề thi, làm bài, ngân hàng câu hỏi, nghe chép, VIP, báo lỗi (dữ liệu kiểm thử tự tạo).
const DAY = 86400000
const iso = (ms) => new Date(ms).toISOString()
const AUDIO = '/api/__mock/audio.wav'

// Âm thanh WAV im lặng ~0,4 giây (PCM 8 kHz, 8-bit) để thử luồng phát/tự chuyển câu.
function silentWav(seconds = 0.4) {
  const rate = 8000, size = Math.round(rate * seconds), buffer = Buffer.alloc(44 + size, 128)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + size, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate, 28); buffer.writeUInt16LE(1, 32); buffer.writeUInt16LE(8, 34); buffer.write('data', 36); buffer.writeUInt32LE(size, 40)
  return buffer
}

const option = (qid, label, text, correct) => ({ optionId: qid * 10 + label.charCodeAt(0) - 64, optionLabel: label, optionText: text, isCorrect: correct })
const question = (qid, no, text, correctLabel = 'B') => ({ questionId: qid, questionNo: no, questionText: text, options: ['A', 'B', 'C', 'D'].map((l) => option(qid, l, `Phương án ${l} của câu ${no}`, l === correctLabel)) })

// Mỗi Part: nhóm câu hỏi (groupId, passageHtml, câu hỏi). Part 7 có HTML độc hại để kiểm tra lọc.
export const EXAM_PARTS = {
  1: [{ groupId: 101, partNo: 1, questions: [question(1001, 1, null)] }, { groupId: 102, partNo: 1, questions: [question(1002, 2, null)] }],
  2: [{ groupId: 103, partNo: 2, questions: [question(1003, 3, 'When is the meeting?')] }],
  5: [{ groupId: 105, partNo: 5, questions: [question(1005, 4, 'The manager ____ the schedule.')] }, { groupId: 106, partNo: 5, questions: [question(1006, 5, 'Please ____ the invoice.')] }],
  7: [{ groupId: 107, partNo: 7, passageHtml: '<p>Notice to all staff: the office closes early.</p><script>window.__xss = 1</script><img src=x onerror="window.__xss = 2">', questions: [question(1008, 6, 'What is the notice about?'), question(1009, 7, 'When does the office close?')] }],
}
const PART_NAMES = { 1: 'Mô tả tranh', 2: 'Hỏi – đáp', 5: 'Điền câu', 7: 'Đọc hiểu' }
const SKILL = (p) => (p <= 4 ? 'LISTENING' : 'READING')
const ALL_QUESTIONS = Object.values(EXAM_PARTS).flat().flatMap((g) => g.questions.map((q) => ({ ...q, partNo: g.partNo, groupId: g.groupId })))
const mediaOf = (g) => (g.partNo <= 4 ? [{ mediaType: 'AUDIO', url: AUDIO }, ...(g.partNo === 1 ? [{ mediaType: 'IMAGE', url: AUDIO.replace('audio.wav', 'image.svg'), altText: 'Hình thử' }] : [])] : [])
const playGroup = (g, withMedia) => ({ groupId: g.groupId, partNo: g.partNo, passageHtml: g.passageHtml || null, media: withMedia ? mediaOf(g) : [], questions: g.questions.map((q) => ({ questionId: q.questionId, questionText: q.questionText, options: q.options.map(({ optionId, optionLabel, optionText }) => ({ optionId, optionLabel, optionText })) })) })

const modes = (id) => ({
  examId: id, examCode: `T${id}`, title: `Test ${id}`, examSetId: 1, access: id === 2 ? 'VIP' : 'FREE', totalQuestions: ALL_QUESTIONS.length, minTimeLimitSeconds: 60, maxTimeLimitSeconds: 14400,
  parts: Object.keys(EXAM_PARTS).map(Number).map((p) => ({ partNo: p, partName: PART_NAMES[p], skill: SKILL(p), questionCount: EXAM_PARTS[p].flatMap((g) => g.questions).length, suggestedSeconds: 120, groups: [] })),
  examOptions: [
    { scope: 'FULL', name: 'Full Test', partNos: [1, 2, 5, 7], questionCount: ALL_QUESTIONS.length, timeLimitSeconds: 900 },
    { scope: 'LISTENING', name: 'Listening', partNos: [1, 2], questionCount: 3, timeLimitSeconds: 300 },
    { scope: 'READING', name: 'Reading', partNos: [5, 7], questionCount: 4, timeLimitSeconds: 600 },
  ],
  practiceOptions: [],
})

const directions = () => [
  { directionKind: 'SECTION', skill: 'LISTENING', partNo: null, directionsEn: 'In the Listening test you will hear several recordings.', directionsVi: 'Phần Nghe.', media: [{ mediaType: 'AUDIO', url: AUDIO }] },
  { directionKind: 'PART', skill: null, partNo: 1, directionsEn: 'Directions for Part 1.', directionsVi: 'Hướng dẫn Part 1.', media: [] },
  { directionKind: 'SECTION', skill: 'READING', partNo: null, directionsEn: 'In the Reading test you will read passages.', directionsVi: null, media: [] },
]

// Giải thích giả theo đúng định dạng dữ liệu thật: các bước "Bước N:", "Mẹo:", phân tích từng phương án "A: … - Sai: …".
const explanationFor = (q) => `Bước 1: Xác định dạng câu hỏi ${q.questionNo}.\nBước 2: Loại các phương án không phù hợp.\nBước 3: Chọn đáp án ${q.options.find((o) => o.isCorrect).optionLabel}. Mẹo: Tập trung vào từ khóa chính.`
const analysisFor = (q) => q.options.map((o) => `${o.optionLabel}: ${o.optionText}. - ${o.isCorrect ? 'Đúng' : 'Sai'}: Lý do cho phương án ${o.optionLabel}.`).join('\n')
export const TRANSCRIPT = { en: 'The woman is wiping off the table.\nThe woman is holding a glass.\nThe woman is pouring a drink.\nThe woman is paying the bill.', vi: '(A) Người phụ nữ đang lau bàn.\n\n(B) Người phụ nữ đang cầm một chiếc ly.\n\n(C) Người phụ nữ đang rót đồ uống.\n\n(D) Người phụ nữ đang thanh toán hóa đơn.' }
const VOCABS = [
  { vocabId: 3, term: 'manager', pos: 'n', ipa: 'mæn', cefr: 'B1', meaningBase: 'quản lý', termMeaningVi: 'quản lý', exampleEn: 'The manager agreed.', exampleVi: 'Quản lý đồng ý.' },
  { vocabId: 4, term: 'holding', base: 'hold', pos: 'v', ipa: 'hoʊld', cefr: 'A2', meaningBase: 'cầm, nắm, giữ', termMeaningVi: 'cầm', exampleEn: 'The woman is holding a glass.', exampleVi: 'Người phụ nữ đang cầm một chiếc ly.' },
  { vocabId: 5, term: 'beverage', pos: 'n', ipa: 'ˈbevərɪdʒ', cefr: 'B2', meaningBase: 'đồ uống', exampleEn: 'The woman is pouring a beverage.', exampleVi: 'Người phụ nữ đang rót đồ uống.' },
]
const feedbackFor = (q, optionId) => {
  const correct = q.options.find((o) => o.isCorrect)
  return {
    isCorrect: optionId === correct.optionId, correctOptionId: correct.optionId, explanation: explanationFor(q), optionExplanations: analysisFor(q),
    transcriptEn: TRANSCRIPT.en, translationVi: TRANSCRIPT.vi,
    vocabularies: VOCABS,
  }
}

const attemptDto = (a, withContent) => ({
  attemptId: a.attemptId, examId: a.examId, mode: a.mode, scope: a.scope, status: a.status, timeLimitSeconds: a.mode === 'EXAM' ? 900 : null, remainingSeconds: a.mode === 'EXAM' ? 880 : null,
  startedAt: a.startedAt, submittedAt: a.submittedAt ?? null, directionSeconds: 0, totalQuestions: a.questions.length, answeredCount: a.questions.filter((q) => q.selectedOptionId).length,
  partNos: a.partNos, questions: a.questions.map(({ questionId, partNo, questionNo, groupId, selectedOptionId, isCorrect }) => ({ questionId, partNo, questionNo, groupId, selectedOptionId: selectedOptionId ?? null, isCorrect: a.mode === 'PRACTICE' && a.status === 'IN_PROGRESS' ? (a.revealed?.has(questionId) ? isCorrect ?? null : null) : a.mode === 'PRACTICE' ? isCorrect ?? null : null })),
  content: withContent ? a.content : null,
})

const STANDALONE_ITEM = { itemId: 90, sourceKind: 'STANDALONE', sourceNote: 'Hội thoại văn phòng (sưu tầm)', examId: null, examTitle: null, partNo: 3, categoryName: 'Văn phòng', groupOrder: null, firstQuestionNo: null, status: 'NEW', clipCount: 2, durationSeconds: 30, practiceCount: 0, lastAccuracy: null, levelName: 'Level 2', isLocked: false }
const DICT_ITEM = (id) => ({
  item: { itemId: id, examId: 1, examTitle: 'Test 1', partNo: 2, categoryName: 'Wh-question', firstQuestionNo: 3, groupOrder: 1, status: 'NEW', practiceCount: 0 },
  groupTranslationVi: 'Bản dịch cả nhóm.',
  clips: [
    { clipId: 11, speaker: 'Man', transcriptEn: 'When is the next meeting scheduled?', translationVi: 'Cuộc họp tiếp theo khi nào?', audio: [{ url: AUDIO }] },
    { clipId: 12, speaker: 'Woman', transcriptEn: 'It is scheduled for Monday morning.', translationVi: 'Sáng thứ Hai.', audio: [{ url: AUDIO }] },
  ],
})
const dictItems = () => ({ items: [1, 2, 3].map((n) => ({ itemId: n, examId: 1, examTitle: 'Test 1', partNo: 2, categoryName: 'Wh-question', firstQuestionNo: n * 3, groupOrder: n, status: n === 2 ? 'NEEDS_PRACTICE' : 'NEW', clipCount: 2, durationSeconds: 45, practiceCount: n === 2 ? 3 : 0, lastAccuracy: n === 2 ? 60 : null, levelName: 'Level 2', isLocked: false })), totalCount: 3, page: 1, pageSize: 18 })

// Lộ trình cá nhân (LearningPlanDto): đã làm kiểm tra đầu vào, 2 gợi ý hôm nay + 3 gợi ý thêm, 1 chủ điểm yếu.
const LEVEL1 = { levelNo: 1, name: 'Level 1 · Dưới 200', shortLabel: 'Dưới 200' }
const PART_LABELS = { 1: 'Mô tả tranh', 2: 'Hỏi – đáp', 3: 'Hội thoại', 4: 'Bài nói ngắn', 5: 'Điền câu', 6: 'Điền đoạn văn', 7: 'Đọc hiểu' }
const rec = (key, kind, title, reason, minutes, isToday, action) => ({ key, kind, priority: 1, title, reason, estimatedMinutes: minutes, isToday, action })
const learningPlan = (profile) => ({
  profile,
  placement: { available: true, test: null, inProgressAttemptId: null, lastResult: { attemptId: 9001, placementTestId: 1, title: 'Kiểm tra đầu vào', submittedAt: iso(Date.now() - 3600e3), totalQuestions: 40, correctCount: 9, listeningScaled: 20, readingScaled: 5, totalScaled: 25, listeningLevel: LEVEL1, readingLevel: LEVEL1 } },
  current: { listeningScaled: 20, listeningSource: 'PLACEMENT', readingScaled: 5, readingSource: 'PLACEMENT', totalScaled: 25, measuredAt: iso(Date.now() - 3600e3) },
  skills: [
    { skill: 'LISTENING', name: 'Nghe', estimatedScaled: 20, source: 'PLACEMENT', targetScaled: 325, gap: 305, level: LEVEL1, practiceLevel: LEVEL1, answered: 5, correct: 4, accuracyPercent: 80, isFocus: false },
    { skill: 'READING', name: 'Đọc', estimatedScaled: 5, source: 'PLACEMENT', targetScaled: 325, gap: 320, level: LEVEL1, practiceLevel: LEVEL1, answered: 0, correct: 0, accuracyPercent: null, isFocus: true },
  ],
  parts: [1, 2, 3, 4, 5, 6, 7].map((partNo) => ({ partNo, partName: PART_LABELS[partNo], skill: partNo <= 4 ? 'LISTENING' : 'READING', totalQuestions: 20, answered: partNo === 1 ? 5 : partNo === 5 ? 6 : 0, correct: partNo === 1 ? 4 : partNo === 5 ? 2 : 0, accuracyPercent: partNo === 1 ? 80 : partNo === 5 ? 33.3 : null, status: partNo === 1 ? 'STRONG' : partNo === 5 ? 'WEAK' : 'UNTESTED' })),
  weakTopics: [{ partNo: 5, categoryId: 51, cardKey: 'c51', name: 'Từ loại', totalQuestions: 12, answered: 6, correct: 2, wrong: 4, accuracyPercent: 33.3 }],
  strongTopics: [],
  recommendations: [
    rec('lv7', 'LEVEL_PRACTICE', 'Luyện Part 7 · Level 2 · 200–300', 'Đọc ước tính 5 điểm (Dưới 200); luyện đúng Level để tiến bộ chắc. Còn thiếu 320 điểm Đọc so với mục tiêu.', 23, true, { type: 'BANK', partNo: 7, cardKey: 'all', pick: 'NEW' }),
    rec('lv1', 'LEVEL_PRACTICE', 'Luyện Part 1 · Level 1 · Dưới 200', 'Nghe ước tính 20 điểm (Dưới 200); luyện đúng Level để tiến bộ chắc.', 5, true, { type: 'BANK', partNo: 1, cardKey: 'all', pick: 'NEW' }),
    rec('p2', 'NEW_PART', 'Làm quen Part 2 · Hỏi – đáp', 'Bạn chưa luyện đủ câu ở Part này; làm một lượt để lộ trình đánh giá chính xác hơn.', 14, false, { type: 'BANK', partNo: 2, cardKey: 'all', pick: 'NEW' }),
    rec('p3', 'NEW_PART', 'Làm quen Part 3 · Hội thoại', 'Bạn chưa luyện đủ câu ở Part này; làm một lượt để lộ trình đánh giá chính xác hơn.', 14, false, { type: 'BANK', partNo: 3, cardKey: 'all', pick: 'NEW' }),
    rec('vn', 'VOCAB_NEW', 'Học 10 từ mới', 'Mục tiêu 10 từ mới mỗi ngày, hôm nay đã học 0 từ.', 8, false, { type: 'VOCAB', vocabMode: 'NEW', count: 10 }),
  ],
  todayMinutes: 28,
  answeredQuestions: 11,
  generatedAt: iso(Date.now()),
})

export function contentHandler(state, method, url, body, auth) {
  const path = url.pathname.replace(/^\/api/, '').toLowerCase()
  const q = url.searchParams
  const ok = (data, status = 200) => ({ status, data })
  const fail = (status, code, message) => ({ status, data: { code, message, traceId: 'mock' } })
  state.attempts ||= new Map(); state.nextAttempt ||= 21; state.reports ||= []; state.dictProgress ||= []; state.orders ||= []; state.requests ||= []; state.answerBodies ||= []

  // Cổng thanh toán GIẢ: trình duyệt tới đây như tới VNPay/vnpay-return của backend, đơn được chốt rồi chuyển hướng 302 về trang kết quả của FE.
  if (path === '/__mock/gateway') {
    const outcome = q.get('outcome') || 'PAID', txn = q.get('txnRef')
    const order = state.orders.find((o) => o.txnRef === txn)
    if (order && order.status === 'PENDING') { order.status = outcome === 'PAID' ? 'PAID' : 'FAILED'; if (outcome === 'PAID') { order.paidAt = iso(Date.now()); state.vip = true; (state.vipHistory ||= []).unshift({ historyId: state.vipHistory.length + 1, kind: 'PURCHASE', days: 30, previousExpiresAt: null, newExpiresAt: iso(Date.now() + 30 * DAY), createdAt: iso(Date.now()), planName: order.planName, amount: order.amount, txnRef: order.txnRef }) } }
    return { status: 302, headers: { Location: `http://localhost:${Number(process.env.UI_WEB_PORT) || 5173}/vip/result?status=${order ? outcome : 'NOT_FOUND'}${txn ? `&txnRef=${txn}` : ''}` } }
  }
  // Giả lập quản trị viên tặng VIP (backend ghi VipHistory ADMIN_GRANT, không tạo đơn thanh toán).
  if (path === '/__mock/vip-grant') { state.vip = true; (state.vipHistory ||= []).unshift({ historyId: state.vipHistory.length + 1, kind: 'ADMIN_GRANT', days: 15, previousExpiresAt: iso(Date.now() + 30 * DAY), newExpiresAt: iso(Date.now() + 45 * DAY), createdAt: iso(Date.now()), planName: null, amount: null, txnRef: null }); return ok({ ok: true }) }
  if (path === '/__mock/outcome') { state.nextOutcome = q.get('value') || 'PAID'; return ok({ nextOutcome: state.nextOutcome }) }
  if (path === '/__mock/audio.wav') return { status: 200, raw: silentWav(), contentType: 'audio/wav' }
  if (path === '/__mock/image.svg') return { status: 200, raw: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"/>'), contentType: 'image/svg+xml' }
  if (path === '/__mock/content') return ok({ attempts: [...state.attempts.values()], reports: state.reports, dictProgress: state.dictProgress, orders: state.orders, requests: state.requests, answerBodies: state.answerBodies })
  // Hồ sơ mục tiêu (CHG-007): mặc định đã thiết lập để các kịch bản khác không bị chặn; /__mock/profile-reset giả lập tài khoản mới.
  state.profile ||= { isSet: true, targetScore: 650, examDate: null, daysToExam: null, dailyMinutes: 30, updatedAt: iso(Date.now()) }
  state.profileBodies ||= []
  if (path === '/__mock/profile-reset') { state.profile = { isSet: false, targetScore: null, examDate: null, daysToExam: null, dailyMinutes: 30, updatedAt: null }; state.profileBodies = []; return ok(state.profile) }
  if (path === '/__mock/profile-bodies') return ok(state.profileBodies)
  if (!auth && path !== '/exam-sets') return null
  if (method !== 'GET') state.requests.push(`${method} ${path}`)
  if (path === '/me/profile' && method === 'GET') return ok(state.profile)
  if (path === '/me/profile' && method === 'PUT') {
    state.profileBodies.push(body)
    state.profile = { isSet: true, targetScore: body.targetScore ?? null, examDate: body.examDate ?? null, daysToExam: null, dailyMinutes: body.dailyMinutes ?? 30, updatedAt: iso(Date.now()) }
    return ok(state.profile)
  }
  if (path === '/me/learning-plan' && method === 'GET') return ok(learningPlan(state.profile))
  if (path === '/placement' && method === 'GET') return ok({ available: true, inProgressAttemptId: null, lastResult: null, test: { placementTestId: 1, title: 'Kiểm tra đầu vào', description: null, totalQuestions: 40, timeLimitSeconds: 1800, parts: [1, 2, 5, 7].map((partNo) => ({ partNo, questionCount: 10 })) } })

  if (path === '/exam-sets') return ok({ items: [{ examSetId: 1, name: 'ETS 2026', publishedExamCount: 2, description: 'Bộ đề thử' }, { examSetId: 2, name: 'Bộ trống', publishedExamCount: 0 }], totalCount: 2 })
  if (path === '/exams') return q.get('examSetId') === '1' ? ok({ items: [{ examId: 1, title: 'Test 1', examCode: 'T1', description: 'Đề thử', effectiveAccess: 'FREE', isLocked: false }, { examId: 2, title: 'Test 2', examCode: 'T2', effectiveAccess: 'VIP', isLocked: true }] }) : ok({ items: [] })
  const exam = path.match(/^\/exams\/(\d+)\/(modes|directions|parts\/(\d+)(\/media)?)$/)
  if (exam) {
    const id = Number(exam[1])
    if (exam[2] === 'modes') return ok(modes(id))
    if (id === 2) return fail(402, 'VIP_REQUIRED', 'Nội dung này dành cho tài khoản VIP.')
    if (exam[2] === 'directions') return ok(directions())
    const groups = EXAM_PARTS[Number(exam[3])]
    if (!groups) return fail(404, 'EXAM_NOT_FOUND', 'Không có Part')
    return exam[4] ? ok({ groups: groups.map((g) => ({ groupId: g.groupId, media: mediaOf(g) })) }) : ok({ groups: groups.map((g) => playGroup(g, q.get('media') !== 'false')) })
  }

  if (path === '/attempts' && method === 'POST') {
    if (body.examId === 2) return fail(402, 'VIP_REQUIRED', 'Nội dung này dành cho tài khoản VIP.')
    const partNos = body.scope === 'FULL' ? [1, 2, 5, 7] : body.scope === 'LISTENING' ? [1, 2] : body.scope === 'READING' ? [5, 7] : body.partNos
    const attempt = { attemptId: state.nextAttempt++, examId: body.examId, mode: body.mode, scope: body.scope, status: 'IN_PROGRESS', startedAt: iso(Date.now()), partNos, questions: ALL_QUESTIONS.filter((x) => partNos.includes(x.partNo)).map((x) => ({ questionId: x.questionId, partNo: x.partNo, questionNo: x.questionNo, groupId: x.groupId, selectedOptionId: null, isCorrect: null })) }
    state.attempts.set(attempt.attemptId, attempt)
    return ok(attemptDto(attempt), 201)
  }
  if (path === '/attempts' && method === 'GET') {
    const list = [...state.attempts.values()].reverse().map((a) => ({ attemptId: a.attemptId, examId: a.examId, examTitle: 'Test 1', mode: a.mode, scope: a.scope, status: a.status, startedAt: a.startedAt, submittedAt: a.submittedAt ?? null, totalQuestions: a.questions.length, correctCount: a.status === 'SUBMITTED' ? a.questions.filter((x) => x.isCorrect).length : null }))
    return ok({ items: list, totalCount: list.length, page: 1, pageSize: 15 })
  }
  const attemptPath = path.match(/^\/attempts\/(\d+)(?:\/(answers\/(\d+)|submit|abandon|direction-time|result))?$/)
  if (attemptPath) {
    const attempt = state.attempts.get(Number(attemptPath[1]))
    if (!attempt) return fail(404, 'ATTEMPT_NOT_FOUND', 'Không tìm thấy lượt làm bài')
    const sub = attemptPath[2]
    if (!sub && method === 'GET') return ok(attemptDto(attempt, attempt.scope === 'BANK'))
    if (!sub && method === 'DELETE') { state.attempts.delete(attempt.attemptId); return { status: 204, data: null } }
    if (sub === 'submit') { attempt.status = 'SUBMITTED'; attempt.submittedAt = iso(Date.now()); return ok({ attemptId: attempt.attemptId, status: 'SUBMITTED' }) }
    if (sub === 'abandon') { attempt.status = 'ABANDONED'; return { status: 204, data: null } }
    if (sub === 'direction-time') return ok({ ...attemptDto(attempt), remainingSeconds: 880 })
    if (sub?.startsWith('answers')) {
      const qid = Number(attemptPath[3]), item = attempt.questions.find((x) => x.questionId === qid), full = ALL_QUESTIONS.find((x) => x.questionId === qid)
      if (!item) return fail(404, 'QUESTION_NOT_IN_ATTEMPT', 'Câu hỏi không thuộc lượt làm bài này')
      // Luyện tập: câu đã hiện đáp án bị khóa; reveal = false chỉ lưu lựa chọn (đổi/bỏ được), chưa trả đáp án.
      attempt.revealed ??= new Set()
      if (attempt.mode === 'PRACTICE' && attempt.revealed.has(qid)) return fail(409, 'ANSWER_LOCKED', 'Câu này đã được chấm')
      const reveal = attempt.mode === 'PRACTICE' && body.reveal !== false
      if (reveal && !body.optionId) return fail(400, 'ANSWER_CLEAR_NOT_ALLOWED', 'Không bỏ chọn được')
      state.answerBodies.push({ qid, ...body })
      item.selectedOptionId = body.optionId
      const feedback = body.optionId ? feedbackFor(full, body.optionId) : null
      item.isCorrect = feedback ? feedback.isCorrect : null
      if (reveal) attempt.revealed.add(qid)
      return ok(reveal ? { questionId: qid, selectedOptionId: body.optionId, feedback } : { questionId: qid, selectedOptionId: body.optionId })
    }
    if (sub === 'result') {
      if (attempt.status === 'IN_PROGRESS') return fail(409, 'ATTEMPT_NOT_SUBMITTED', 'Lượt làm bài chưa được nộp')
      const include = q.get('includeReview') === 'true'
      // Từ 17/11/2026 Luyện thi cũng xem được đáp án sau khi nộp (backend mặc định Learning:AllowExamReview = true).
      const parts = attempt.partNos.map((p) => { const list = attempt.questions.filter((x) => x.partNo === p); return { partNo: p, total: list.length, correct: list.filter((x) => x.isCorrect).length, answered: list.filter((x) => x.selectedOptionId).length } })
      const result = { attemptId: attempt.attemptId, examId: attempt.examId, examTitle: attempt.scope === 'BANK' ? null : 'Test 1', mode: attempt.mode, scope: attempt.scope, status: attempt.status, isAutoSubmitted: false, submittedAt: attempt.submittedAt, durationSeconds: 95, totalQuestions: attempt.questions.length, correctCount: attempt.questions.filter((x) => x.isCorrect).length, answeredCount: attempt.questions.filter((x) => x.selectedOptionId).length, listeningScaled: null, readingScaled: null, totalScaled: null, parts }
      const labelOf = (qid, pick) => ALL_QUESTIONS.find((x) => x.questionId === qid)?.options.find(pick)?.optionLabel ?? null
      result.questions = attempt.questions.map((x) => ({ questionId: x.questionId, partNo: x.partNo, questionNo: x.questionNo, selectedOptionId: x.selectedOptionId, isCorrect: !!x.isCorrect,
        selectedLabel: x.selectedOptionId ? labelOf(x.questionId, (o) => o.optionId === x.selectedOptionId) : null, correctLabel: labelOf(x.questionId, (o) => o.isCorrect) }))
      if (include) result.groups = Object.values(EXAM_PARTS).flat().filter((g) => attempt.partNos.includes(g.partNo)).map((g) => ({ groupId: g.groupId, partNo: g.partNo, passageHtml: g.passageHtml || null, media: mediaOf(g), transcriptEn: g.partNo <= 4 ? TRANSCRIPT.en : null, translationVi: g.partNo <= 4 ? TRANSCRIPT.vi : null, questions: g.questions.map((x) => { const item = attempt.questions.find((y) => y.questionId === x.questionId); return { ...x, selectedOptionId: item?.selectedOptionId ?? null, isCorrect: !!item?.isCorrect, explanation: explanationFor(x), optionExplanations: analysisFor(x), vocabularies: feedbackFor(x, 0).vocabularies } }) }))
      return ok(result)
    }
  }

  const cards = path.match(/^\/bank\/parts\/(\d+)\/cards$/)
  if (cards) {
    const card = (key, name, total, practiced) => ({ cardKey: key, kind: key.startsWith('level') ? 'LEVEL' : 'CATEGORY', name, shortLabel: 'Mô tả ngắn', totalQuestions: total, practicedCount: practiced, correctCount: Math.floor(practiced / 2), wrongCount: practiced - Math.floor(practiced / 2), status: practiced ? 'IN_PROGRESS' : 'NEW', children: ['Con 1'], lockedCount: 0 })
    return ok({ partNo: Number(cards[1]), totalQuestions: 12, levelCards: [card('level-1', 'Level 1', 6, 2), card('level-2', 'Level 2', 6, 0)], categoryCards: [card('cat-5', 'Chủ đề A', 4, 0)], categories: [{ categoryId: 5, name: 'Chủ đề A', depth: 0, questionCount: 4 }] })
  }
  if (path === '/grammar/topics') return ok({ totalQuestions: 20, practicedCount: 4, correctCount: 3, wrongCount: 1, groups: [{ categoryId: 9, name: 'Thì động từ', topicCount: 1, totalQuestions: 20, topics: [{ categoryId: 90, grammarTopicId: 3, hasArticle: true, cardKey: 'cat-90', name: 'Thì hiện tại', summary: 'Tóm tắt', totalQuestions: 20, practicedCount: 4, correctCount: 3, wrongCount: 1, status: 'IN_PROGRESS' }] }] })
  // UC-18: mỗi chủ điểm một bài học tương tác; chủ điểm 3 có bài (kèm HTML độc hại để kiểm tra lọc), chủ điểm khác đang cập nhật.
  // MOCK_GRAMMAR_FILE: nạp nội dung bài từ tệp (để xem thử bài mẫu thật).
  const topicArticle = path.match(/^\/grammar\/topics\/(\d+)\/article$/)
  if (topicArticle) {
    const topic = { grammarTopicId: Number(topicArticle[1]), categoryId: 90, name: 'Thì hiện tại', groupName: 'Thì động từ', summary: 'Tóm tắt' }
    if (topic.grammarTopicId !== 3) return ok({ topic, article: null })
    const quiz = (q, options, correct, explain) => `<div class="grammar-exercise"><p>${q}</p><ol class="grammar-options">${options.map((o, i) => `<li${i === correct ? ' class="grammar-correct"' : ''}>${o}</li>`).join('')}</ol><div class="grammar-explain"><p>${explain}</p></div></div>`
    const content = process.env.MOCK_GRAMMAR_FILE ? readFileSync(process.env.MOCK_GRAMMAR_FILE, 'utf8')
      : '<h2>1. Cách dùng</h2><p>Dùng cho <b>thói quen</b>.</p><p class="grammar-structure">S + V(s/es)</p><blockquote class="grammar-example"><p>She works every day.</p></blockquote>'
        + quiz('She ______ here every day.', ['work', 'works', 'working', 'worked'], 1, 'Chủ ngữ số ít she: works.')
        + '<h2>2. Dấu hiệu</h2><p>every day, usually…</p><blockquote class="grammar-example"><p>He usually walks.</p></blockquote>'
        + quiz('They usually ______ to work.', ['walk', 'walks'], 0, 'Chủ ngữ số nhiều: walk.')
        + '<h2>Mẹo TOEIC</h2><div class="grammar-tip"><p>Dấu hiệu: every day.</p></div>'
        + '<div class="grammar-exercise"><p>Bài cũ dạng details</p><details><summary>Xem đáp án</summary><p>(B) works</p></details></div>'
        + '<img src="x" onerror="window.__xss=1"><script>window.__xss=2</script>'
    return ok({ topic: { ...topic, articleId: 31 }, article: { articleId: 31, grammarTopicId: 3, title: 'Thì hiện tại đơn', updatedAt: iso(Date.now()), content } })
  }
  if (path === '/bank/attempts' && method === 'POST') {
    const partNos = [body.partNo], groups = EXAM_PARTS[body.partNo === 5 || body.partNo === 7 || body.partNo === 1 || body.partNo === 2 ? body.partNo : 5]
    const attempt = { attemptId: state.nextAttempt++, examId: null, mode: 'PRACTICE', scope: 'BANK', status: 'IN_PROGRESS', startedAt: iso(Date.now()), partNos, questions: groups.flatMap((g) => g.questions.map((x) => ({ questionId: x.questionId, partNo: g.partNo, questionNo: x.questionNo, groupId: g.groupId, selectedOptionId: null, isCorrect: null }))), content: groups.map((g) => playGroup(g, true)) }
    state.attempts.set(attempt.attemptId, attempt)
    return ok(attemptDto(attempt, true), 201)
  }

  if (path === '/dictation/sets') return ok({ sets: [{ examSetId: 1, name: 'ETS 2026', isLocked: false }], needsPracticeItems: 1, standaloneItems: 1 })
  if (path === '/dictation/sets/1/exams') return ok([{ examId: 1, title: 'Test 1', isLocked: false, parts: [1, 2, 3, 4].map((p) => ({ partNo: p, partName: PART_NAMES[p] || `Part ${p}`, itemCount: p === 2 ? 3 : 0, clipCount: p === 2 ? 6 : 0, practicedItems: p === 2 ? 1 : 0, needsPracticeItems: p === 2 ? 1 : 0 })) }])
  if (path === '/dictation/topics') return ok({ categories: [{ categoryId: 1, name: 'Wh-question', parentCategoryId: null, itemCount: 3, clipCount: 6, practicedItems: 1 }], levels: [{ levelNo: 2, name: 'Level 2', itemCount: 3, clipCount: 6 }], specialTags: [] })
  // UC-28 TH2: bộ clip sưu tầm không thuộc đề.
  if (path === '/dictation/items' && q.get('source') === 'STANDALONE') return ok({ items: [STANDALONE_ITEM], totalCount: 1, page: 1, pageSize: 18 })
  if (path === '/dictation/items') return ok(dictItems())
  const dict = path.match(/^\/dictation\/items\/(\d+)(\/progress)?$/)
  if (dict && !dict[2] && Number(dict[1]) === STANDALONE_ITEM.itemId) return ok({ ...DICT_ITEM(STANDALONE_ITEM.itemId), item: STANDALONE_ITEM, groupTranslationVi: null })
  if (dict && !dict[2]) return ok(DICT_ITEM(Number(dict[1])))
  if (dict && dict[2]) { state.dictProgress.push({ itemId: Number(dict[1]), ...body }); return ok({ status: (body.accuracyPercent ?? 100) >= 80 ? 'DONE' : 'NEEDS_PRACTICE', bestAccuracy: body.accuracyPercent ?? null }) }

  if (path === '/vip/plans') return ok([{ code: 'M1', name: 'Gói 1 tháng', priceVnd: 99000, durationDays: 30, description: 'Mở khóa nội dung VIP' }])
  if (path === '/vip/me') return ok(state.vip ? { isVip: true, isAdmin: false, expiresAt: iso(Date.now() + 30 * DAY), daysLeft: 30 } : { isVip: false, isAdmin: false, expiresAt: null, daysLeft: 0 })
  if (path === '/vip/history') return ok(state.vipHistory || [])
  if (path === '/vip/orders' && method === 'GET') return ok({ items: state.orders, totalCount: state.orders.length, page: 1, pageSize: 10 })
  if (path === '/vip/orders' && method === 'POST') {
    const txnRef = `MOCK${state.orders.length + 1}`
    state.orders.unshift({ orderId: state.orders.length + 1, txnRef, planName: 'Gói 1 tháng', amount: 99000, status: 'PENDING', createdAt: iso(Date.now()), expiresAt: iso(Date.now() + DAY) })
    return ok({ orderId: state.orders.length, txnRef, amount: 99000, paymentUrl: `http://localhost:${Number(process.env.UI_API_PORT) || 5078}/api/__mock/gateway?txnRef=${txnRef}&outcome=${state.nextOutcome || 'PAID'}`, expiresAt: iso(Date.now() + DAY) }, 201)
  }

  if (path === '/reports' && method === 'GET') return ok({ items: state.reports.map((r, i) => ({ reportId: i + 1, status: 'NEW', createdAt: iso(Date.now()), adminNote: null, vocabId: null, ...r })), totalCount: state.reports.length, page: 1, pageSize: 20 })
  if (path === '/reports' && method === 'POST') { state.reports.push(body); return ok({ reportId: state.reports.length }, 201) }
  return null
}
