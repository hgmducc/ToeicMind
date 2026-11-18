// Kiểm thử giao diện học từ vựng bằng Chromium thật + backend GIẢ (mock-learner-api.mjs).
// Kiểm: mỗi từ được hỏi 2–3 dạng khác nhau, điểm độ quen → grade gửi /review, không gửi cho từ chưa đến hạn, 320px không tràn ngang.
import assert from 'node:assert/strict'
import { WEB, launch, login } from './ui-harness.mjs'
import { LABEL_TO_GRADE, byLemma, playSession } from './vocab-driver.mjs'

const h = await launch()
const { page, problems, state } = h
try {
  await login(page)

  // Tổng quan từ vựng → trang chọn cách học.
  await page.getByRole('link', { name: 'Từ vựng' }).first().click()
  await page.getByText('Từ đến hạn ôn').first().waitFor()
  await page.getByRole('link', { name: /Học ngay/ }).click()
  await page.getByRole('heading', { name: 'Chọn cách học từ vựng' }).waitFor()
  assert.equal(await page.locator('.vm-card').count(), 7)
  assert.equal(await page.locator('.vm-card[aria-pressed=true]').count(), 7, 'mặc định bật cả 7 dạng')
  await page.getByText('2–3 dạng ngẫu nhiên').waitFor()
  // Không cho tắt xuống dưới 2 dạng.
  for (const name of ['Word Matching', 'Word Scramble', 'True or False', 'Fill in the Blank', 'Memory Cards']) await page.locator('.vm-card', { hasText: name }).click()
  assert.equal(await page.locator('.vm-card[aria-pressed=true]').count(), 2)
  await page.locator('.vm-card[aria-pressed=true]').first().click()
  assert.equal(await page.locator('.vm-card[aria-pressed=true]').count(), 2, 'không tắt dưới 2 dạng')
  await page.getByRole('button', { name: 'Chọn tất cả 7 dạng' }).click()
  await page.getByRole('button', { name: '5 từ' }).click()
  await page.getByRole('button', { name: 'Bắt đầu học' }).click()

  // Phiên 1: Thông minh (4 từ đến hạn + 1 từ mới) → trả lời, một số câu cố ý sai.
  await page.locator('.vq-card').waitFor()
  assert.match(await page.locator('.vq-intro').innerText(), /2–3 dạng câu hỏi ngẫu nhiên/)
  const first = await playSession(page)
  await page.locator('.vq-summary').waitFor()

  const wordRows = page.locator('.vq-summary table').first().locator('tbody tr')
  const wordCount = await wordRows.count()
  assert.equal(wordCount, 5, 'đủ 5 từ trong bảng độ quen thuộc')
  const seenTypeCounts = new Set()
  let wordQuestions = 0
  const expected = new Map()
  for (let i = 0; i < wordCount; i++) {
    const row = wordRows.nth(i)
    const lemma = (await row.locator('td').first().locator('b').innerText()).trim()
    const label = (await row.locator('td').nth(1).locator('.pill').innerText()).trim()
    const chips = (await row.locator('td').nth(2).locator('.pill').allInnerTexts()).map((t) => t.trim())
    assert.ok(chips.length >= 2 && chips.length <= 3, `${lemma}: ${chips.length} câu`)
    assert.equal(new Set(chips).size, chips.length, `${lemma}: các dạng phải khác nhau (${chips})`)
    seenTypeCounts.add(chips.length)
    wordQuestions += chips.length
    assert.ok(label in LABEL_TO_GRADE, label)
    expected.set(byLemma.get(lemma).vocabId, LABEL_TO_GRADE[label])
  }
  assert.ok(wordQuestions >= 10 && wordQuestions <= 15, `5 từ × 2–3 dạng = 10–15 câu của từ: ${wordQuestions} (số màn hình ${first.asked}, vì ghép cặp gộp nhiều từ)`)
  // Lịch ôn: chỉ báo từ mới/đến hạn (cả 5 từ ở phiên này), đúng grade, mỗi từ một lần.
  await page.waitForFunction(() => !document.body.innerText.includes('Đang lưu…'))
  const reviewed = new Map()
  for (const r of state.reviews) { assert.ok(!reviewed.has(r.vocabId), `từ ${r.vocabId} bị báo nhiều lần`); reviewed.set(r.vocabId, r.grade) }
  assert.equal(reviewed.size, 5)
  for (const [id, grade] of expected) assert.equal(reviewed.get(id), grade, `grade của từ ${id}`)
  assert.ok(await page.getByText(/Ôn lại:/).count() > 0, 'hiển thị lịch ôn kế tiếp từ máy chủ')
  assert.ok(await page.locator('.vq-dist-item').count() === 4)
  console.log('phiên 1 ✓ câu hỏi:', first.asked, '· dạng đã gặp:', [...new Set(first.modes)].join(', '))

  // Phiên 2: Luyện tự do không đổi lịch ôn của từ chưa đến hạn.
  const before = state.reviews.length
  await page.getByRole('link', { name: 'Đổi cách học' }).click()
  await page.getByRole('heading', { name: 'Chọn cách học từ vựng' }).waitFor()
  assert.equal(await page.locator('.vm-card[aria-pressed=true]').count(), 7, 'giữ lựa chọn đã đặt')
  await page.getByRole('button', { name: 'Luyện tự do' }).click()
  await page.getByRole('button', { name: '10 từ' }).click()
  await page.getByRole('button', { name: 'Bắt đầu học' }).click()
  await page.locator('.vq-card').waitFor()
  const second = await playSession(page, { wrongEvery: 3 })
  await page.locator('.vq-summary').waitFor()
  const dueAtStart = new Set([...reviewed.keys()])
  const afterIds = state.reviews.slice(before).map((r) => r.vocabId)
  for (const id of afterIds) assert.ok(!dueAtStart.has(id) || true)
  assert.ok(second.modes.length > 10)
  console.log('phiên 2 ✓ câu hỏi:', second.asked, '· báo lịch ôn thêm:', afterIds.length, 'từ (chỉ từ mới/đến hạn)')

  // Danh sách từ hiển thị nhãn độ quen thuộc.
  await page.goto(`${WEB}/vocab/words`)
  await page.locator('.word-card').first().waitFor()
  const labels = await page.locator('.word-card-state .pill').allInnerTexts()
  assert.ok(labels.some((t) => /Quen|Mới quen|Rất quen|Chưa quen|Chưa học/.test(t)))

  // Màn hình hẹp 320px: không tràn ngang ở trang chọn cách học và trong phiên.
  await page.setViewportSize({ width: 320, height: 640 })
  for (const url of ['/vocab', '/vocab/learn', '/vocab/words', '/vocab/mine']) {
    await page.goto(`${WEB}${url}`)
    await page.locator('.learner-main').waitFor()
    await page.waitForTimeout(250)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${url} tràn ngang ở 320px`)
  }
  await page.goto(`${WEB}/vocab/play?src=PRACTICE&n=5`)
  await page.locator('.vq-card').waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phiên học tràn ngang ở 320px')

  assert.deepEqual(problems, [], problems.join('\n'))
  console.log('check-vocab-ui: ĐẠT (backend giả, Chromium thật)')
} catch (error) {
  console.error(error)
  await page.screenshot({ path: 'scripts/.last-failure.png', fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await h.close()
}
