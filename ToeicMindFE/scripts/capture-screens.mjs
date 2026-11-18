// Chụp ảnh màn hình các trang người học (backend GIẢ, Chromium thật) để rà soát giao diện bằng mắt.
// Chạy: node scripts/capture-screens.mjs <thư-mục-ảnh>   (ảnh desktop 1280px và mobile 375px)
import fs from 'node:fs'
import path from 'node:path'
import { contentHandler } from './mock-learner-content.mjs'
import { WEB, launch } from './ui-harness.mjs'
import { playSession } from './vocab-driver.mjs'

const out = path.resolve(process.argv[2] || 'screens')
fs.mkdirSync(out, { recursive: true })
const h = await launch({ extraHandlers: [contentHandler] })
const { page } = h
const DESKTOP = { width: 1280, height: 860 }
const MOBILE = { width: 375, height: 760 }
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, `${name}.png`) }) }

try {
  await page.goto(`${WEB}/`)
  await page.locator('input[name=email]').fill('learner@example.com')
  await page.locator('input[name=password]').fill('secret123')
  await page.locator('form.auth-form .submit-button').click()
  await page.getByRole('heading', { name: /Xin chào/ }).waitFor()

  for (const [label, viewport] of [['d', DESKTOP], ['m', MOBILE]]) {
    await page.setViewportSize(viewport)
    const pages = [['home', '/'], ['tests', '/tests'], ['vocab', '/vocab'], ['learn', '/vocab/learn'], ['words', '/vocab/words'], ['mine', '/vocab/mine'],
      ['listen', '/listen/dictation'], ['part2', '/listen/2'], ['grammar', '/read/grammar'], ['history', '/history'], ['vip', '/vip'], ['account', '/account']]
    for (const [name, url] of pages) {
      await page.goto(`${WEB}${url}`)
      await page.locator('.learner-main').waitFor()
      await page.waitForFunction(() => !document.querySelector('.state-box .spinner'), null, { timeout: 8000 }).catch(() => {})
      await shot(`${label}-${name}`)
    }
  }

  // Phiên học từ vựng: chụp mỗi dạng câu hỏi lần đầu gặp và màn tổng kết (desktop + mobile).
  for (const [label, viewport] of [['d', DESKTOP], ['m', MOBILE]]) {
    await page.setViewportSize(viewport)
    await page.goto(`${WEB}/vocab/play?src=PRACTICE&n=20`)
    await page.locator('.vq-card').waitFor()
    const seen = new Set()
    await playSession(page, {
      wrongEvery: 3,
      async onAsk(mode) {
        if (seen.has(mode)) return
        seen.add(mode)
        await shot(`${label}-vocab-${mode.toLowerCase().replace(/\s+/g, '-')}`)
      },
    })
    await page.locator('.vq-summary').waitFor()
    await shot(`${label}-vocab-summary`)
    console.log(label, 'dạng đã chụp:', [...seen].join(', '))
  }

  // Làm bài: hộp chọn chế độ, luyện tập, kết quả, luyện thi, nghe chép.
  await page.setViewportSize(DESKTOP)
  await page.goto(`${WEB}/tests`)
  await page.locator('.exam-card', { hasText: 'Test 1' }).getByRole('button', { name: /Chọn chế độ/ }).click()
  await page.locator('dialog[open]').waitFor()
  await shot('d-modedialog')
  await page.locator('dialog[open]').getByRole('tab', { name: /Luyện tập/ }).click()
  await shot('d-modedialog-practice')
  await page.locator('dialog[open] .pick', { hasText: 'Part 5' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: /Bắt đầu/ }).last().click()
  await page.waitForURL(/\/attempt\/\d+$/)
  await page.locator('.study-q').first().waitFor()
  await page.locator('.study-q .option').first().click()
  await page.locator('.explain-result').first().waitFor()
  await shot('d-practice')
  await page.setViewportSize(MOBILE)
  await shot('m-practice')
  await page.setViewportSize(DESKTOP)
  await page.getByRole('button', { name: 'Kết thúc' }).first().click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Kết thúc' }).click()
  await page.waitForURL(/\/result\/\d+$/)
  await page.getByText('câu đúng').first().waitFor()
  await shot('d-result')

  await page.evaluate(() => localStorage.setItem('toeicmind_fe_exam_options', JSON.stringify({ autoDirections: false, autoNext: false })))
  await page.goto(`${WEB}/tests`)
  await page.locator('.exam-card', { hasText: 'Test 1' }).getByRole('button', { name: /Chọn chế độ/ }).click()
  await page.locator('dialog[open] .mode-card', { hasText: 'Thi Listening' }).getByRole('button', { name: /Bắt đầu/ }).click()
  await page.waitForURL(/\/attempt\/\d+$/)
  await page.locator('.study-solo-title').first().waitFor()
  await shot('d-exam-direction')
  await page.getByRole('button', { name: /Tiếp tục|Bỏ qua phần này/ }).click()
  await page.getByRole('button', { name: /Tiếp tục|Bỏ qua phần này/ }).click()
  await page.locator('.option--letter').first().waitFor({ timeout: 8000 })
  await shot('d-exam-listening')
  await page.setViewportSize(MOBILE)
  await shot('m-exam-listening')

  await page.setViewportSize(DESKTOP)
  await page.goto(`${WEB}/dictation/item/1`)
  await page.locator('.wave').waitFor()
  await shot('d-dictation')
  await page.setViewportSize(MOBILE)
  await shot('m-dictation')
  console.log('ảnh lưu tại', out)
} finally { await h.close() }
