import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chromium } from '@playwright/test'
import * as XLSX from 'xlsx'
import { hashSync } from 'bcryptjs'
import {
  parseExcelQuestions,
  parseFolderFiles,
  convertRowsToGroups,
} from '../src/features/exams/utils/folderParser.js'
import {
  contentCounts,
  contentIssues,
  groupPayload,
  sourceIssues,
} from '../src/features/exams/utils/examContent.js'

const root = path.resolve(import.meta.dirname, '..'),
  backend = path.resolve(root, '../ToeicMindBE/ToeicMind')
const runtime = JSON.parse(
  (await fs.readFile(path.join(backend, 'artifacts/admin-audit-runtime/runtime.json'), 'utf8')).replace(
    /^\uFEFF/,
    '',
  ),
)
assert.match(runtime.database, /^ToeicMind_AdminAudit_[a-f0-9]{32}$/)
const base = process.env.ADMIN_UI_URL || 'http://127.0.0.1:5174'
const email = `audit-${randomUUID()}@example.com`,
  password = randomUUID() + 'Aa1!'
let session
async function api(endpoint, options = {}) {
  const res = await fetch(`${base}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}
// Tạo tài khoản chỉ trong DB audit đã xác minh. Nếu proxy trỏ nhầm backend,
// đăng nhập sẽ thất bại trước mọi request ghi dữ liệu ứng dụng.
const passwordHash = hashSync(password, 10)
try {
  execFileSync(
    'sqlcmd',
    [
      '-S',
      'localhost',
      '-E',
      '-C',
      '-I',
      '-d',
      runtime.database,
      '-b',
      '-Q',
      `INSERT dbo.Users(Username,Email,PasswordHash,Role,Status) VALUES('Admin audit','${email}','${passwordHash}','ADMIN','ACTIVE')`,
    ],
    { stdio: 'pipe' },
  )
} catch {
  throw new Error('Cannot create the synthetic account in the isolated audit database.')
}
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
})
const results = { api: 'real ASP.NET Core + SQL Server audit database', samples: [], checks: [] }
await fs.mkdir(path.join(root, 'artifacts/admin-audit'), { recursive: true })
let page
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.goto(base)
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.locator('form .submit-button').click()
  await page.locator('#user-info-title').waitFor()
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('toeicmind_admin_session')))
  assert.equal(session.user.role, 'ADMIN')
  results.checks.push('Real email login, ADMIN boundary and UserDto')
  const catalog = (await api('/exam-catalogs')).data
  for (const name of ['Test_1', 'Test_3']) {
    const dir = path.join(backend, 'Hướng dẫn', name)
    const xlsx = (await fs.readdir(dir)).find((f) => f.endsWith('.xlsx'))
    const workbook = await parseExcelQuestions(new File([await fs.readFile(path.join(dir, xlsx))], xlsx))
    async function filesIn(folder) {
      const out = []
      for (const item of await fs.readdir(folder, { withFileTypes: true })) {
        const full = path.join(folder, item.name)
        if (item.isDirectory()) out.push(...(await filesIn(full)))
        else if (/\.(mp3|wav|png|jpe?g|xlsx)$/i.test(item.name)) {
          const file = new File([await fs.readFile(full)], item.name)
          Object.defineProperty(file, 'webkitRelativePath', {
            value: `${name}/${path.relative(dir, full).replaceAll('\\', '/')}`,
          })
          out.push(file)
        }
      }
      return out
    }
    const folder = parseFolderFiles(await filesIn(dir))
    const groups = convertRowsToGroups(
      workbook.rows,
      folder.mediaIndex,
      workbook.segments,
      workbook.vocabRows,
      catalog,
    )
    const issues = [...sourceIssues(workbook, groups), ...contentIssues(groups, catalog)]
    const counts = contentCounts(groups)
    assert.equal(counts.questions, 200)
    assert.equal(counts.vocab, workbook.vocabRows.length)
    assert.equal(counts.segments, workbook.segments.length)
    results.samples.push({ name, sheets: workbook.sheetSummary, counts, issues })
    const rejected = await api('/admin/exams/import', {
      method: 'POST',
      body: JSON.stringify({
        examSetId: 1,
        title: `Invalid ${name}`,
        groups: groups.map(groupPayload),
        sourceSheets: workbook.sourceSheets,
      }),
    })
    assert.equal(rejected.status, 400)
    assert.ok(rejected.data.errors, JSON.stringify(rejected.data))
    results.samples.at(-1).backendErrors = rejected.data.errors
    for (const m of folder.mediaFiles) URL.revokeObjectURL(m.previewUrl)
    await page.getByRole('button', { name: /^Tải lên & Biên soạn/ }).click()
    await page.getByRole('heading', { name: 'Biên soạn đề thi', exact: true, level: 2 }).waitFor()
    await page.getByLabel('Thư mục bộ đề', { exact: true }).setInputFiles(dir)
    await page
      .getByText(`Đã đọc 200 câu và ${workbook.sheetSummary.length} sheet.`, { exact: false })
      .waitFor()
    assert.ok(await page.getByText(`${counts.vocab}`, { exact: true }).count())
    await page.locator('.sheet-preview summary').click()
    await page.locator('.sheet-preview select').selectOption('Vocab')
    await page
      .getByText(`${workbook.vocabRows.length}/${workbook.vocabRows.length} dòng`, { exact: false })
      .waitFor()
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({
      path: path.join(root, `artifacts/admin-audit/${name}-desktop.png`),
      fullPage: false,
    })
    for (const width of [320, 375, 760, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }))
      assert.ok(
        dimensions.scroll <= dimensions.width + 1,
        `${name} overflow at ${width}: ${JSON.stringify(dimensions)}`,
      )
      if (width === 320)
        await page.screenshot({
          path: path.join(root, `artifacts/admin-audit/${name}-mobile.png`),
          fullPage: false,
        })
    }
    await page.screenshot({
      path: path.join(root, `artifacts/admin-audit/${name}-wide.png`),
      fullPage: false,
    })
    // Thay đổi chưa lưu cần xác nhận khi rời trình biên soạn.
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Bộ đề & Đề thi', exact: true }).click()
    await page.getByRole('heading', { name: 'Bộ đề và đề thi', exact: true, level: 2 }).waitFor()
  }
  assert.equal((await api('/admin/exams')).data.totalCount, 0)
  results.checks.push(
    'Both invalid source workbooks rejected by the real import API, zero exam rows committed',
  )
  // Một đề nháp tổng hợp hợp lệ để kiểm tra lưu thật và R2, không sửa dữ liệu Test_1/Test_3.
  const fixture = path.join(root, 'artifacts/admin-audit/fixture')
  await fs.mkdir(fixture, { recursive: true })
  const originalDir = path.join(backend, 'Hướng dẫn/Test_1')
  const original = XLSX.read(await fs.readFile(path.join(originalDir, 'Test_1_split.xlsx')))
  const q1 = XLSX.utils.sheet_to_json(original.Sheets.Questions)[0]
  const clip = XLSX.utils.sheet_to_json(original.Sheets.Audio_Segments)[0]
  const imageName = 'audit-image' + path.extname(q1.image),
    audioName = 'audit-main' + path.extname(q1.audio),
    clipName = 'audit-clip' + path.extname(clip.clip_audio)
  for (const [source, name] of [
    [q1.image, imageName],
    [q1.audio, audioName],
    [clip.clip_audio, clipName],
  ])
    await fs.copyFile(path.join(originalDir, source), path.join(fixture, name))
  const wb = XLSX.utils.book_new()
  const data = {
    Questions: [
      {
        question_no: 1,
        part: 1,
        group_id: 'audit-q1',
        level: 1,
        cat: 'single_person',
        audio: audioName,
        image: imageName,
        option_a: 'A person.',
        option_b: 'An object.',
        option_c: 'A place.',
        option_d: 'A room.',
        correct_answer: 'A',
        script_en: 'A synthetic transcript.',
        script_vi: 'Bản dịch kiểm thử.',
        explanation: 'Synthetic explanation.',
        option_explanations: 'A: A person — Đúng.\nB: An object — Sai.\nC: A place — Sai.\nD: A room — Sai.',
      },
    ],
    Vocab: [
      {
        question_no: 1,
        base: 'open',
        term: 'opening',
        pos: 'v',
        cefr: 'A1',
        meaning_base: 'mở',
        term_meaning_vi: 'đang mở',
        ipa: 'test',
        example_en: 'An example',
        example_vi: 'Ví dụ',
      },
    ],
    Audio_Segments: [
      {
        group_id: 'audit-q1',
        question_no: 1,
        part: 1,
        seq: 1,
        clip_id: 'audit-clip',
        clip_audio: clipName,
        source_audio: audioName,
        kind: 'option',
        label: 'A',
        text: clip.text,
        start_sec: clip.start_sec,
        end_sec: clip.end_sec,
        duration_sec: clip.duration_sec,
      },
    ],
    Dict: [{ field: 'cat', value: 'single_person' }],
    Media: [{ type: 'image', path: imageName }],
  }
  for (const [name, rows] of Object.entries(data))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name)
  await fs.writeFile(path.join(fixture, 'audit.xlsx'), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  await page.getByRole('button', { name: /^Tải lên & Biên soạn/ }).click()
  await page.getByLabel('Thư mục bộ đề', { exact: true }).setInputFiles(fixture)
  await page.getByText('Đã đọc 1 câu và 5 sheet.', { exact: false }).waitFor()
  await page.getByLabel('Tạo bộ đề mới', { exact: true }).fill('Audit set')
  await page.getByRole('button', { name: 'Tạo bộ đề', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu nội dung và media', exact: true }).click()
  await page.getByText('Nội dung và các tệp được chọn đã lưu.', { exact: false }).waitFor({ timeout: 120000 })
  const saved = (await api('/admin/exams')).data.items[0]
  const stored = (await api(`/admin/exams/${saved.examId}/groups`)).data
  assert.equal(stored.length, 1)
  assert.equal(stored[0].questions[0].vocabularies[0].termMeaningVi, 'đang mở')
  assert.equal(stored[0].media.length, 2)
  assert.equal(stored[0].audioSegments[0].media.length, 1)
  assert.deepEqual(
    Object.keys((await api(`/admin/exams/${saved.examId}/import-source`)).data),
    Object.keys(data),
  )
  // Nghe/xem từ R2 sau khi mở lại; không dùng blob cục bộ của lần nhập.
  await page.getByRole('button', { name: 'Bộ đề & Đề thi', exact: true }).click()
  await page.getByRole('button', { name: 'Biên soạn', exact: true }).click()
  await page.getByRole('button', { name: 'Mở audio chính câu 1', exact: true }).click()
  const audio = page.locator('.group-audio-player audio')
  await audio.evaluate(async (element) => {
    await element.play()
    await new Promise((resolve) => setTimeout(resolve, 300))
    element.pause()
  })
  assert.ok(await audio.evaluate((element) => element.duration > 0 && element.currentTime > 0))
  await page.getByRole('button', { name: 'Mở ảnh câu 1', exact: true }).click()
  await page.locator('.media-preview img').evaluate((img) => img.decode())
  await page.locator('.segment-editor > summary').click()
  await page.locator('.segment-editor .direction-item > summary').click()
  await page.getByRole('button', { name: 'Mở clip audit-clip', exact: true }).click()
  const split = page.locator('.segment-editor audio')
  await split.evaluate(async (element) => {
    await element.play()
    await new Promise((resolve) => setTimeout(resolve, 250))
    element.pause()
  })
  assert.ok(await split.evaluate((element) => element.duration > 0 && element.currentTime > 0))
  results.checks.push(
    'Real UI import and reload: question, base/context vocabulary meanings, 5 source sheets, main audio, image and clip persisted',
  )
  results.checks.push(
    'Real R2 signed URLs: image decoded and main/clip audio played successfully in Chromium',
  )
  // Backend publish-check của đề chưa đủ 200 câu phải hiện lỗi; không báo xuất bản thành công.
  await page.getByRole('button', { name: 'Kiểm tra xuất bản', exact: true }).click()
  await page.locator('dialog[open]').waitFor()
  assert.ok((await page.locator('dialog .issue-item').count()) > 0)
  await page.keyboard.press('Escape')
  await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  results.checks.push('Real publish-check lists missing content; dialog keyboard Escape works')
  await page.getByLabel('Lời giải thích chung:', { exact: true }).fill('Updated explanation from browser')
  await page.locator('.question-vocab-box > summary').click()
  await page.getByRole('button', { name: 'Sửa từ', exact: true }).click()
  await page.getByLabel('Nghĩa trong ngữ cảnh', { exact: true }).fill('nghĩa đã sửa qua giao diện')
  await page.getByRole('button', { name: 'Lưu từ', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu nội dung và media', exact: true }).click()
  await page.getByText('Nội dung và các tệp được chọn đã lưu.', { exact: false }).waitFor()
  const edited = (await api(`/admin/exams/${saved.examId}/groups`)).data[0]
  assert.equal(edited.questions[0].questionId, stored[0].questions[0].questionId)
  assert.equal(edited.audioSegments[0].clipId, stored[0].audioSegments[0].clipId)
  assert.equal(
    edited.media.find((m) => m.mediaType === 'AUDIO').mediaId,
    stored[0].media.find((m) => m.mediaType === 'AUDIO').mediaId,
  )
  assert.equal(edited.questions[0].vocabularies[0].termMeaningVi, 'nghĩa đã sửa qua giao diện')
  await page.getByLabel('Tên đề *', { exact: true }).fill('Audit metadata renamed')
  await page.getByRole('button', { name: 'Lưu thông tin đề', exact: true }).click()
  await page.getByText('Đã lưu thông tin đề thi.', { exact: true }).waitFor()
  assert.equal((await api(`/admin/exams/${saved.examId}`)).data.title, 'Audit metadata renamed')
  results.checks.push(
    'Real UI edits preserve question/clip/media IDs and update contextual meaning and metadata',
  )

  const directions = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /^4\. Hướng dẫn/ }) })
  await directions.getByText('Part 1 · Mặc định', { exact: true }).click()
  await directions
    .locator('details[open]')
    .getByRole('button', { name: 'Tạo bản riêng', exact: true })
    .click()
  await directions.getByLabel('Hướng dẫn tiếng Anh *', { exact: true }).fill('Audit directions override')
  await directions.getByRole('button', { name: 'Lưu bản riêng', exact: true }).click()
  await directions.getByText('Đã cập nhật hướng dẫn.', { exact: true }).waitFor()
  assert.equal(
    (await api(`/admin/directions?examId=${saved.examId}&effective=true`)).data.find((d) => d.partNo === 1)
      .examId,
    saved.examId,
  )
  page.once('dialog', (d) => d.accept())
  await directions
    .locator('details[open]')
    .getByRole('button', { name: 'Dùng lại mặc định', exact: true })
    .click()
  await directions.getByText('Part 1 · Mặc định', { exact: true }).waitFor()
  assert.equal(
    (await api(`/admin/directions?examId=${saved.examId}&effective=true`)).data.find((d) => d.partNo === 1)
      .examId,
    null,
  )
  results.checks.push('Real directions override create and soft-delete restores effective default')

  await page.getByRole('button', { name: 'Bộ đề & Đề thi', exact: true }).click()
  await page.getByLabel('Tên bộ đề mới *', { exact: true }).fill('Audit CRUD set')
  await page.getByLabel('Mô tả', { exact: true }).fill('Created from UI')
  await page.getByRole('button', { name: 'Tạo bộ đề', exact: true }).click()
  const setRow = page.locator('tr').filter({ hasText: 'Audit CRUD set' })
  await setRow.getByRole('button', { name: 'Sửa bộ đề', exact: true }).click()
  await page.locator('.edit-set-form').getByLabel('Tên bộ đề *', { exact: true }).fill('Audit CRUD renamed')
  await page.getByRole('button', { name: 'Lưu bộ đề', exact: true }).click()
  const renamed = page.locator('tr').filter({ hasText: 'Audit CRUD renamed' })
  await renamed.waitFor()
  page.once('dialog', (d) => d.accept())
  await renamed.getByRole('button', { name: 'Xóa', exact: true }).click()
  await page.getByRole('button', { name: 'Thùng rác bộ đề', exact: true }).click()
  await page
    .locator('tr')
    .filter({ hasText: 'Audit CRUD renamed' })
    .getByRole('button', { name: 'Khôi phục', exact: true })
    .click()
  await page.getByRole('button', { name: 'Bộ đề đang hoạt động', exact: true }).click()
  await page.locator('tr').filter({ hasText: 'Audit CRUD renamed' }).waitFor()
  const examRow = page.locator('tr').filter({ hasText: 'Audit metadata renamed' })
  page.once('dialog', (d) => d.accept())
  await examRow.getByRole('button', { name: 'Xóa', exact: true }).click()
  await page.getByRole('button', { name: 'Thùng rác đề thi', exact: true }).click()
  await page
    .locator('tr')
    .filter({ hasText: 'Audit metadata renamed' })
    .getByRole('button', { name: 'Khôi phục', exact: true })
    .click()
  await page.getByRole('button', { name: 'Đề đang hoạt động', exact: true }).click()
  await page.locator('tr').filter({ hasText: 'Audit metadata renamed' }).waitFor()
  results.checks.push('Real UI set create/edit/delete/restore and exam delete/restore')

  for (let i = 1; i <= 21; i++)
    assert.equal(
      (
        await api('/admin/exams', {
          method: 'POST',
          body: JSON.stringify({ examSetId: saved.examSetId, title: `Paging ${String(i).padStart(2, '0')}` }),
        })
      ).status,
      201,
    )
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click()
  const examSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /^Đề thi/ }) })
  await examSection.getByText('Trang 1/2 · 22 kết quả', { exact: true }).waitFor()
  await examSection.getByRole('button', { name: 'Sau', exact: true }).click()
  await examSection.getByText('Trang 2/2 · 22 kết quả', { exact: true }).waitFor()
  await page.getByLabel('Tìm đề thi', { exact: true }).fill('Paging 01')
  await examSection.getByText('Trang 1/1 · 1 kết quả', { exact: true }).waitFor()
  await page.setViewportSize({ width: 320, height: 800 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.getByRole('button', { name: 'Mở menu điều hướng', exact: true }).click()
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('#admin-sidebar')))
  }
  await page.keyboard.press('Escape')
  assert.equal(
    await page.getByRole('button', { name: 'Mở menu điều hướng', exact: true }).getAttribute('aria-expanded'),
    'false',
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  results.checks.push('Real list pagination/search and mobile sidebar keyboard focus/Escape')

  // Chèn lỗi 503 có kiểm soát để xác minh UI báo lỗi, không thay bằng số liệu mẫu.
  await page.route('**/api/admin/exam-sets?**', (route) =>
    route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE' } }),
  )
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await page.locator('.kpi-value').allTextContents(), ['—', '—', '—', '—'])
  await page.unroute('**/api/admin/exam-sets?**')
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.kpi-value')].every((e) => e.textContent !== '—'),
  )
  results.checks.push('Mock 503: dashboard shows an error and no fabricated KPIs; retry reloads real totals')

  await page.getByRole('button', { name: /^Tải lên & Biên soạn/ }).click()
  const bad = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(bad, XLSX.utils.json_to_sheet([{ unknown: 1 }]), 'Wrong')
  const badPath = path.join(root, 'artifacts/admin-audit/bad.xlsx')
  await fs.writeFile(badPath, XLSX.write(bad, { type: 'buffer', bookType: 'xlsx' }))
  await page.getByLabel('Excel và media', { exact: true }).setInputFiles(badPath)
  await page.getByText('Thiếu sheet Questions', { exact: false }).waitFor()
  assert.equal(await page.locator('.group-card').count(), 0)
  await page.getByLabel('Thư mục bộ đề', { exact: true }).setInputFiles(fixture)
  await page.getByText('Đã đọc 1 câu và 5 sheet.', { exact: false }).waitFor()
  await page.getByLabel('Tên đề *', { exact: true }).fill('Audit retry media')
  let clipAttempts = 0,
    importRequests = 0
  const countImports = (request) => {
    if (new URL(request.url()).pathname === '/api/admin/exams/import' && request.method() === 'POST')
      importRequests++
  }
  page.on('request', countImports)
  await page.route('**/segments/*/media', async (route) => {
    clipAttempts++
    if (clipAttempts === 1) return route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE' } })
    return route.continue()
  })
  await page.getByRole('button', { name: 'Lưu nội dung và media', exact: true }).evaluate((button) => {
    button.click()
    button.click()
  })
  await page.getByText('1 tệp chưa tải được', { exact: false }).waitFor({ timeout: 120000 })
  assert.equal(importRequests, 1)
  await page.getByRole('button', { name: 'Lưu nội dung và media', exact: true }).click()
  await page.getByText('Nội dung và các tệp được chọn đã lưu.', { exact: false }).waitFor({ timeout: 120000 })
  assert.equal(clipAttempts, 2)
  assert.equal(importRequests, 1)
  await page.unroute('**/segments/*/media')
  page.off('request', countImports)
  results.checks.push(
    'Bad workbook never falls back to sample; mock one failed clip upload reports failure and retries without duplicating the exam',
  )
  assert.deepEqual(errors, [])
  results.checks.push(
    'Both real workbooks parsed with exact question/vocab/segment counts and all source sheets',
  )
  results.checks.push('No horizontal overflow at 320/375/760/1024/1440; no browser runtime errors')
  await fs.writeFile(path.join(root, 'artifacts/admin-audit/results.json'), JSON.stringify(results, null, 2))
  console.log(
    JSON.stringify(
      {
        ...results,
        samples: results.samples.map((s) => ({
          name: s.name,
          sheets: s.sheets,
          counts: s.counts,
          issues: s.issues.length,
          backendIssues: Array.isArray(s.backendErrors)
            ? s.backendErrors.length
            : Object.keys(s.backendErrors).length,
        })),
      },
      null,
      2,
    ),
  )
} catch (error) {
  results.failure = {
    message: error.message,
    notices: page ? await page.locator('.admin-notice').allTextContents() : [],
  }
  if (page)
    await page.screenshot({ path: path.join(root, 'artifacts/admin-audit/failure.png'), fullPage: false })
  throw error
} finally {
  await fs.writeFile(path.join(root, 'artifacts/admin-audit/results.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
