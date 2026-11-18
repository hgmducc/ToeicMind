// Kiểm thử giao diện Admin cho UC-25 (bài ngữ pháp), UC-28 TH2 (bộ clip sưu tầm) và màn Báo lỗi với các đối tượng mới (UC-14/26).
// Backend GIẢ qua page.route (không gọi API thật), Chromium thật. Cần Vite đang chạy: ADMIN_UI_URL (mặc định http://127.0.0.1:5174).
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const base = process.env.ADMIN_UI_URL || 'http://127.0.0.1:5174'
const user = { userId: 999, username: 'Quản trị kiểm thử', email: 'admin-ui@example.test', role: 'ADMIN', status: 'ACTIVE', hasPassword: true, createdAt: '2026-01-01T00:00:00Z' }
const session = { user, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z', refreshExpiresAt: '2099-02-01T00:00:00Z', pendingPasswordPrompt: false }
const now = '2026-11-18T08:00:00Z'

const topicRows = [
  { grammarTopicId: 1, categoryId: 501, name: 'Danh từ', groupName: 'Từ loại' },
  { grammarTopicId: 2, categoryId: 502, name: 'Thì hiện tại', groupName: 'Động từ' },
]
const articles = [{ articleId: 5, grammarTopicId: 1, categoryId: 501, topicName: 'Danh từ', title: 'Danh từ đếm được', content: '<h2>Lý thuyết</h2><p>Nội dung cũ</p>', isDeleted: false, createdAt: now, updatedAt: now }]
// Mỗi chủ điểm một bài chưa xóa (giống UX_GrammarArticle_Topic).
const topics = () => topicRows.map((t) => {
  const a = articles.find((x) => x.grammarTopicId === t.grammarTopicId && !x.isDeleted)
  return { ...t, articleId: a?.articleId ?? null, articleTitle: a?.title ?? null, articleUpdatedAt: a?.updatedAt ?? null }
})
const exists = () => ({ status: 409, json: { code: 'GRAMMAR_ARTICLE_EXISTS', message: 'Chủ điểm này đã có bài học; mỗi chủ điểm chỉ có một bài, hãy sửa bài hiện có' } })
const catalog = {
  parts: [], specialTags: [],
  levels: [{ levelNo: 1, nameVi: 'Level 1', shortLabel: 'L1' }, { levelNo: 2, nameVi: 'Level 2', shortLabel: 'L2' }],
  categories: [
    { categoryId: 301, partNo: 3, parentCategoryId: null, code: 'office', nameVi: 'Văn phòng', isLeaf: true, sortOrder: 1 },
    { categoryId: 302, partNo: 3, parentCategoryId: null, code: 'travel-root', nameVi: 'Du lịch (nhóm)', isLeaf: false, sortOrder: 2 },
    { categoryId: 401, partNo: 4, parentCategoryId: null, code: 'ads', nameVi: 'Quảng cáo', isLeaf: true, sortOrder: 1 },
  ],
}
const items = []
const calls = []
let nextItem = 7, nextClip = 70, nextMedia = 700

const summary = (i) => ({
  ...i, categoryName: catalog.categories.find((c) => c.categoryId === i.categoryId)?.nameVi ?? null,
  levelName: catalog.levels.find((l) => l.levelNo === i.levelNo)?.nameVi ?? null,
  clipCount: i.clips.length, audioCount: i.clips.filter((c) => c.mediaId).length, clips: undefined,
})
const detail = (i) => ({ item: summary(i), clips: i.clips })
const reports = [
  { reportId: 11, targetType: 'GRAMMAR_ARTICLE', articleId: 5, targetTitle: 'Danh từ đếm được', errorType: 'WRONG_EXPLANATION', description: 'Ví dụ sai', status: 'NEW', reporterEmail: 'hv@example.test', createdAt: now, targetDeleted: false },
  { reportId: 12, targetType: 'LISTENING_ITEM', listeningItemId: 7, targetTitle: 'Hội thoại văn phòng', errorType: 'MEDIA_ERROR', description: null, status: 'NEW', reporterEmail: 'hv@example.test', createdAt: now, targetDeleted: false },
  { reportId: 13, targetType: 'VOCABULARY', vocabId: 3, targetTitle: 'invoice (n)', errorType: 'TYPO', description: null, status: 'NEW', reporterEmail: 'hv@example.test', createdAt: now, targetDeleted: true },
]

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('dialog', (d) => d.accept())   // window.confirm khi xóa
  await page.addInitScript((saved) => localStorage.setItem('toeicmind_admin_session', JSON.stringify(saved)), session)
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method()
    const body = () => request.postDataJSON()
    calls.push(`${method} ${path}${url.search}`)
    let json, status = 200, m
    if (path === '/api/auth/me') json = user
    else if (path === '/api/exam-catalogs') json = catalog
    else if (path === '/api/admin/grammar-articles/topics') json = topics()
    else if (path === '/api/admin/grammar-articles' && method === 'GET') {
      const deleted = url.searchParams.get('isDeleted') === 'true', topic = Number(url.searchParams.get('grammarTopicId')) || null
      const list = articles.filter((a) => a.isDeleted === deleted && (!topic || a.grammarTopicId === topic)).map((a) => ({ ...a, content: null }))
      json = { items: list, totalCount: list.length, page: 1, pageSize: 10 }
    } else if (path === '/api/admin/grammar-articles' && method === 'POST') {
      const b = body(); calls.push(['CREATE_ARTICLE', b])
      if (articles.some((a) => a.grammarTopicId === b.grammarTopicId && !a.isDeleted)) return route.fulfill(exists())
      const topic = topicRows.find((t) => t.grammarTopicId === b.grammarTopicId)
      const a = { articleId: 6 + articles.length, ...b, categoryId: topic.categoryId, topicName: topic.name, isDeleted: false, createdAt: now, updatedAt: now }
      articles.push(a); json = a; status = 201
    } else if ((m = path.match(/^\/api\/admin\/grammar-articles\/(\d+)$/))) {
      const a = articles.find((x) => x.articleId === Number(m[1]))
      if (method === 'PUT') { Object.assign(a, body()); calls.push(['UPDATE_ARTICLE', body()]) }
      if (method === 'DELETE') { a.isDeleted = true; a.deletedAt = now; return route.fulfill({ status: 204 }) }
      json = a
    } else if ((m = path.match(/^\/api\/admin\/grammar-articles\/(\d+)\/restore$/))) {
      const a = articles.find((x) => x.articleId === Number(m[1]))
      if (articles.some((x) => x.grammarTopicId === a.grammarTopicId && !x.isDeleted && x !== a)) return route.fulfill(exists())
      a.isDeleted = false; json = a
    } else if (path === '/api/admin/listening-items' && method === 'GET') {
      const list = items.filter((i) => i.isDeleted === (url.searchParams.get('isDeleted') === 'true')).map(summary)
      json = { items: list, totalCount: list.length, page: 1, pageSize: 10 }
    } else if (path === '/api/admin/listening-items' && method === 'POST') {
      const b = body(); calls.push(['CREATE_ITEM', b])
      const i = { itemId: nextItem++, partNo: b.partNo, categoryId: null, levelNo: null, sourceNote: b.sourceNote, isPublished: false, isDeleted: false, createdAt: now, updatedAt: now, clips: [] }
      items.push(i); json = detail(i); status = 201
    } else if ((m = path.match(/^\/api\/admin\/listening-items\/(\d+)(\/.*)?$/))) {
      const i = items.find((x) => x.itemId === Number(m[1])), rest = m[2] || ''
      if (!i) return route.fulfill({ status: 404, json: { code: 'LISTENING_ITEM_NOT_FOUND', message: 'Không tìm thấy bộ clip sưu tầm' } })
      if (rest === '' && method === 'PUT') { const b = body(); calls.push(['UPDATE_ITEM', b]); Object.assign(i, b) }
      else if (rest === '/status') {
        const b = body()
        if (b.isPublished && (i.categoryId == null || i.levelNo == null)) return route.fulfill({ status: 409, json: { code: 'LISTENING_ITEM_CLASSIFICATION_REQUIRED', message: 'Cần gán loại bài và Level trước khi xuất bản bộ clip' } })
        i.isPublished = b.isPublished
      } else if (rest === '/clips' && method === 'POST') {
        const b = body(); calls.push(['CREATE_CLIP', b])
        i.clips.push({ clipId: nextClip++, seqNo: b.seqNo ?? i.clips.length + 1, clipRole: b.clipRole, speaker: b.speaker, transcriptEn: b.transcriptEn, translationVi: b.translationVi, mediaId: null })
      } else if ((m = rest.match(/^\/clips\/(\d+)\/media$/))) {
        assert.match(request.headers()['content-type'], /multipart\/form-data/)
        assert.match(request.postDataBuffer().toString(), /filename="clip1.mp3"/)
        i.clips.find((c) => c.clipId === Number(m[1])).mediaId = nextMedia++
        status = 201
      }
      json = detail(i)
    } else if (path === '/api/admin/reports') json = { items: reports, totalCount: reports.length, page: 1, pageSize: 10 }
    else throw new Error(`Unmocked request: ${method} ${path}`)
    return route.fulfill({ status, json })
  })
  const dialog = () => page.locator('dialog[open]')
  const noOverflow = async (label) => {
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} tràn ngang ở ${width}px`)
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
  }

  // ---------- UC-25: mỗi chủ điểm một bài học ----------
  await page.goto(`${base}/grammar`)
  await page.getByRole('heading', { name: 'Chủ điểm (1/2 đã có bài)' }).waitFor()
  assert.equal(await page.locator('.admin-nav-item[aria-current=page]').innerText(), 'Bài ngữ pháp')
  const nounRow = page.locator('tr', { hasText: 'Danh từ đếm được' }), tenseRow = page.locator('tr', { hasText: 'Thì hiện tại' })
  assert.equal(await nounRow.getByRole('button', { name: 'Soạn bài' }).count(), 0, 'chủ điểm đã có bài chỉ cho sửa')
  await tenseRow.getByText('Chưa có bài').waitFor()
  await tenseRow.getByRole('button', { name: 'Soạn bài' }).click()
  // Bài mới điền sẵn khung bài học tương tác (học → ví dụ → thử ngay), không cảnh báo; bỏ mẹo TOEIC thì có gợi ý (không chặn lưu).
  assert.equal(await dialog().getByLabel('Tiêu đề bài *').inputValue(), 'Thì hiện tại')
  await dialog().getByRole('button', { name: 'Mã nguồn HTML' }).click()
  const html = await dialog().getByLabel('Mã HTML bài ngữ pháp').inputValue()
  assert.ok(html.startsWith('<h2>1. Thì hiện tại là gì?</h2>'))
  assert.equal((html.match(/class="grammar-exercise"/g) || []).length, 3)
  assert.equal(await dialog().getByText('Gợi ý hoàn thiện bài').count(), 0)
  await dialog().getByLabel('Mã HTML bài ngữ pháp').fill(html.slice(0, html.indexOf('<h2>Mẹo làm bài TOEIC</h2>')))
  await dialog().getByText('Bài chưa có mẹo làm bài TOEIC.').waitFor()
  await dialog().getByLabel('Mã HTML bài ngữ pháp').fill(html)
  await dialog().getByRole('button', { name: 'Soạn trực quan' }).click()
  for (const tool of ['Phần (H2)', '+ Cấu trúc', '+ Ví dụ', '+ Bài tập', '+ Mẹo TOEIC']) await dialog().getByRole('button', { name: tool, exact: true }).waitFor()
  assert.equal(await dialog().getByRole('button', { name: 'Mẫu Email' }).count(), 0, 'soạn bài ngữ pháp không có mẫu bài đọc')
  await dialog().locator('.passage-rendered-paper .grammar-tip').waitFor()
  // "+ Bài tập": soạn câu thử ngay bằng form, chèn vào cuối nội dung (đặt con trỏ ở cuối khung soạn).
  await dialog().locator('.passage-rendered-paper').click()
  await page.keyboard.press('Control+End')
  await dialog().getByRole('button', { name: '+ Bài tập', exact: true }).click()
  const exercise = page.getByRole('dialog', { name: 'Thêm bài tập “Thử ngay”' })
  await exercise.getByLabel('Câu hỏi *').fill('The report ______ every Monday.')
  await exercise.getByLabel('Lựa chọn (A) *').fill('publish')
  await exercise.getByLabel('Lựa chọn (B) *').fill('publishing')
  await exercise.getByLabel('Lựa chọn (C)').fill('is published')
  await exercise.getByLabel('Đáp án đúng').selectOption('3')
  await exercise.getByLabel('Giải thích *').fill('Bị động hiện tại đơn: is published.')
  await exercise.getByRole('button', { name: 'Chèn vào bài' }).click()
  await exercise.getByText('Đáp án đúng phải là một lựa chọn đã điền.').waitFor()
  await exercise.getByLabel('Đáp án đúng').selectOption('2')
  await exercise.getByRole('button', { name: 'Chèn vào bài' }).click()
  await exercise.waitFor({ state: 'detached' })
  await dialog().locator('.passage-rendered-paper .grammar-correct', { hasText: 'is published' }).waitFor()
  await dialog().getByLabel('Tiêu đề bài *').fill('')
  await dialog().getByRole('button', { name: 'Lưu bài' }).click()
  await dialog().getByText('Cần nhập tiêu đề và nội dung bài.').waitFor()          // E1
  await dialog().getByLabel('Tiêu đề bài *').fill('  Thì hiện tại đơn  ')
  await dialog().getByRole('button', { name: 'Lưu bài' }).click()
  await page.getByText('Đã thêm bài “Thì hiện tại đơn”.').waitFor()
  const created = calls.find((c) => c[0] === 'CREATE_ARTICLE')[1]
  assert.deepEqual(Object.keys(created).sort(), ['content', 'grammarTopicId', 'title'])
  assert.deepEqual([created.grammarTopicId, created.title], [2, 'Thì hiện tại đơn'])
  assert.match(created.content, /<ol class="grammar-options"><li>publish<\/li><li>publishing<\/li><li class="grammar-correct">is published<\/li><\/ol><div class="grammar-explain"><p>Bị động hiện tại đơn: is published\.<\/p><\/div>/)
  await page.getByRole('heading', { name: 'Chủ điểm (2/2 đã có bài)' }).waitFor()
  // Xóa bài cũ rồi soạn bài mới cho cùng chủ điểm: khôi phục bài cũ bị từ chối vì chủ điểm đã có bài.
  await nounRow.getByRole('button', { name: 'Xóa' }).click()
  await page.getByText('Đã chuyển bài vào thùng rác.').waitFor()
  await page.locator('tr', { hasText: 'Danh từ' }).getByRole('button', { name: 'Soạn bài' }).click()
  await dialog().getByLabel('Tiêu đề bài *').fill('Danh từ (bài mới)')
  await dialog().getByRole('button', { name: 'Lưu bài' }).click()
  await page.getByText('Đã thêm bài “Danh từ (bài mới)”.').waitFor()
  await page.getByRole('button', { name: 'Thùng rác' }).click()
  await page.locator('.admin-card', { hasText: 'Thùng rác' }).locator('tr', { hasText: 'Danh từ đếm được' }).getByRole('button', { name: 'Khôi phục' }).click()
  await page.getByText('mỗi chủ điểm chỉ có một bài').waitFor()
  await noOverflow('/grammar')
  console.log('✓ bài ngữ pháp: mỗi chủ điểm 1 bài, khung bài học tương tác + gợi ý hoàn thiện, form “+ Bài tập” (kiểm tra đáp án, chèn đúng cấu trúc), xóa mềm, chặn khôi phục khi chủ điểm đã có bài')

  // ---------- UC-28 TH2: bộ clip sưu tầm ----------
  await page.goto(`${base}/listening`)
  await page.getByText('Không có bộ clip phù hợp.').waitFor()
  await page.getByRole('button', { name: 'Thêm bộ clip' }).click()
  await dialog().locator('input').fill('Hội thoại văn phòng')
  await dialog().getByRole('button', { name: 'Tạo bộ clip' }).click()
  await page.getByRole('heading', { name: 'Bộ clip #7 · Part 3' }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('item'), '7')
  assert.deepEqual(calls.find((c) => c[0] === 'CREATE_ITEM')[1], { partNo: 3, sourceNote: 'Hội thoại văn phòng' })
  // Xuất bản khi chưa gán loại/Level: máy chủ từ chối, hiện lý do.
  await page.locator('.listening-detail').getByRole('button', { name: 'Xuất bản' }).click()
  await page.getByText('Cần gán loại bài và Level trước khi xuất bản bộ clip').waitFor()
  const typeOptions = await page.locator('.listening-meta select[name=categoryId] option').allTextContents()
  assert.deepEqual(typeOptions, ['— Chưa gán —', 'Văn phòng'], 'chỉ phân loại lá của đúng Part')
  await page.locator('.listening-meta select[name=categoryId]').selectOption('301')
  await page.locator('.listening-meta select[name=levelNo]').selectOption('2')
  await page.getByRole('button', { name: 'Lưu thông tin' }).click()
  await page.getByText('Đã lưu thông tin bộ clip.').waitFor()
  assert.deepEqual(calls.find((c) => c[0] === 'UPDATE_ITEM')[1], { partNo: 3, categoryId: 301, levelNo: 2, sourceNote: 'Hội thoại văn phòng' })
  await page.getByRole('button', { name: 'Thêm clip' }).click()
  assert.deepEqual(await dialog().locator('select').locator('option').allTextContents(), ['Câu hội thoại'], 'Part 3 chỉ có vai trò SENTENCE')
  await dialog().getByLabel('Người nói').fill('Man')
  await dialog().getByLabel('Script tiếng Anh *').fill('Could you send me the invoice?')
  await dialog().getByLabel('Bản dịch tiếng Việt').fill('Bạn gửi tôi hóa đơn được không?')
  await dialog().getByRole('button', { name: 'Lưu' }).click()
  await page.getByText('Đã thêm clip.').waitFor()
  assert.deepEqual(calls.find((c) => c[0] === 'CREATE_CLIP')[1], { seqNo: null, clipRole: 'SENTENCE', speaker: 'Man', transcriptEn: 'Could you send me the invoice?', translationVi: 'Bạn gửi tôi hóa đơn được không?' })
  await page.getByText('1 clip chưa có audio').waitFor()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Tải audio' }).click()
  await (await chooser).setFiles({ name: 'clip1.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('ID3 mock audio') })
  await page.getByText('Đã tải audio cho clip.').waitFor()
  await page.getByRole('button', { name: 'Nghe', exact: true }).waitFor()
  await page.locator('.listening-detail').getByRole('button', { name: 'Xuất bản' }).click()
  await page.getByText('Đã xuất bản bộ clip.').waitFor()
  await page.locator('tr', { hasText: 'Hội thoại văn phòng' }).getByText('Đã xuất bản').waitFor()
  await noOverflow('/listening')
  console.log('✓ clip sưu tầm: tạo bộ, chặn xuất bản khi thiếu phân loại, loại bài lá đúng Part, thêm clip theo vai trò Part, tải audio, xuất bản')

  // ---------- Báo lỗi: đối tượng mới, liên kết tới màn sửa, nội dung đã xóa ----------
  await page.goto(`${base}/reports`)
  await page.locator('tr', { hasText: 'Danh từ đếm được' }).waitFor()
  assert.match(await page.locator('tr', { hasText: 'Hội thoại văn phòng' }).innerText(), /Bộ clip nghe/)
  const vocabRow = page.locator('tr', { hasText: 'invoice (n)' })
  await vocabRow.getByText('Nội dung đã xóa').waitFor()
  assert.equal(await vocabRow.getByRole('button', { name: 'Mở nội dung' }).count(), 0)
  await vocabRow.getByRole('button', { name: 'Xử lý' }).click()
  await dialog().getByText('Nội dung đã bị xóa: đóng báo cáo').waitFor()
  await dialog().getByRole('button', { name: 'Hủy' }).click()
  await page.locator('tr', { hasText: 'Danh từ đếm được' }).getByRole('button', { name: 'Mở nội dung' }).click()
  await page.waitForURL(/\/grammar\?article=5$/)
  await dialog().getByRole('heading', { name: 'Sửa bài học · Danh từ' }).waitFor()
  assert.equal(await dialog().getByLabel('Tiêu đề bài *').inputValue(), 'Danh từ đếm được')
  await dialog().getByRole('button', { name: 'Hủy' }).click()
  assert.equal(new URL(page.url()).search, '')
  await page.goto(`${base}/reports`)
  await page.locator('tr', { hasText: 'Hội thoại văn phòng' }).getByRole('button', { name: 'Mở nội dung' }).click()
  await page.waitForURL(/\/listening\?item=7$/)
  await page.getByRole('heading', { name: 'Bộ clip #7 · Part 3' }).waitFor()
  console.log('✓ báo lỗi: hiện bài ngữ pháp/bộ clip/từ vựng, mở đúng màn sửa, cảnh báo nội dung đã xóa')

  assert.deepEqual(errors, [])
  console.log('check-admin-content: ĐẠT (backend giả, Chromium thật)')
} finally {
  await browser.close()
}
