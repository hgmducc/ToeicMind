// Bộ "người chơi" phiên học từ vựng cho các kịch bản kiểm thử: đọc màn hình hiện tại, nhận ra dạng câu hỏi và trả lời
// (đúng hoặc cố ý sai) dựa trên dữ liệu thử của backend giả.
import { VOCAB } from './mock-learner-api.mjs'

export const byLemma = new Map(VOCAB.map((w) => [w.lemma, w]))
const byMeaning = new Map(VOCAB.map((w) => [w.meaningVi, w]))
export const LABEL_TO_GRADE = { 'Chưa quen': 0, 'Mới quen': 1, Quen: 2, 'Rất quen': 3 }
const nbsp = (text) => text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const exact = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

export async function answer(page, wrong) {
  const mode = (await page.locator('.vq-meta .pill').first().innerText()).trim()
  const text = async (selector) => nbsp(await page.locator(selector).first().innerText())
  const pickOption = async (target) => {
    if (wrong) {
      const options = page.locator('.vq-opt')
      const count = await options.count()
      for (let i = 0; i < count; i++) if ((await options.nth(i).locator('span').innerText()) !== target) { await options.nth(i).click(); return }
    }
    await page.locator('.vq-opt').filter({ has: page.locator('span', { hasText: exact(target) }) }).first().click()
  }
  if (mode === 'Word Quiz') {
    const sub = (await text('.vq-prompt .vq-sub')).toLowerCase()
    const big = await text('.vq-prompt .vq-big')
    await pickOption(sub.includes('chọn nghĩa') ? byLemma.get(big).meaningVi : byMeaning.get(big).lemma)
  } else if (mode === 'Word Matching') {
    const lemmas = page.locator('.vq-match-col').first().locator('.vq-match-item')
    const meanings = page.locator('.vq-match-col').nth(1).locator('.vq-match-item')
    const n = await lemmas.count()
    if (wrong) { await lemmas.nth(0).click(); await meanings.filter({ hasNotText: byLemma.get(await lemmas.nth(0).innerText()).meaningVi }).first().click(); await page.waitForTimeout(450) }
    for (let i = 0; i < n; i++) {
      const lemma = (await page.locator('.vq-match-col').first().locator('.vq-match-item:not([disabled])').first().innerText()).trim()
      await page.locator('.vq-match-col').first().locator('.vq-match-item:not([disabled])', { hasText: exact(lemma) }).click()
      await page.locator('.vq-match-col').nth(1).locator('.vq-match-item:not([disabled])', { hasText: exact(byLemma.get(lemma).meaningVi) }).click()
    }
  } else if (mode === 'Word Scramble' || mode === 'Missing Letters') {
    if (!(await page.locator('.vq-big--sm').count())) await page.getByRole('button', { name: 'Gợi ý' }).click()
    const meaning = await text('.vq-big--sm')
    const lemma = byMeaning.get(meaning).lemma
    if (mode === 'Word Scramble') {
      const fixed = await page.locator('.vq-slot').evaluateAll((els) => els.map((el) => el.hasAttribute('data-fixed')))
      const letters = [...lemma].filter((_, i) => !fixed[i])
      for (const letter of wrong ? letters.map((_, i) => (i === 0 ? (letters[0] === 'z' ? 'y' : 'z') : letters[i])) : letters) await page.keyboard.press(letter)
      if (wrong) while (await page.locator('.vq-tile:not([disabled])').count() && !(await page.locator('.vq-slots[data-result]').count())) await page.locator('.vq-tile:not([disabled])').first().click()
    } else {
      const inputs = page.locator('.vq-missing')
      const chars = await page.locator('.vq-missing, .vq-letter').evaluateAll((els) => els.map((el) => (el.tagName === 'INPUT' ? null : el.textContent)))
      let k = 0
      for (let i = 0; i < chars.length; i++) if (chars[i] === null) { await inputs.nth(k++).fill(wrong && k === 1 ? 'q' : lemma[i]) }
      await page.getByRole('button', { name: 'Kiểm tra' }).click()
    }
  } else if (mode === 'True or False') {
    const statement = await text('.vq-statement')
    let truth = true
    const meaning = statement.match(/^(.+?) \(.+?\) có nghĩa là (.+)$/)
    if (meaning) truth = byLemma.get(meaning[1]).meaningVi === meaning[2]
    else if (statement.includes('=')) { const [lemma, def] = statement.split(' = '); truth = nbsp(byLemma.get(lemma).definitionEn.replace(new RegExp(`\\b${lemma}[a-z]*`, 'ig'), '____')) === def.replace(/^“|”$/g, '') }
    else { const bold = await text('.vq-statement b'); truth = byLemma.has(bold) }
    await page.locator('.vq-opt').filter({ hasText: (truth !== wrong) ? 'Đúng' : 'Sai' }).first().click()
  } else if (mode === 'Fill in the Blank') {
    const sentence = await text('.vq-sentence')
    const word = VOCAB.find((w) => {
      const found = new RegExp(`\\b${w.lemma}[a-z]*`, 'i').exec(w.exampleEn) // kể cả dạng chia như "attended"
      const [before, after] = found ? [nbsp(w.exampleEn.slice(0, found.index)), nbsp(w.exampleEn.slice(found.index + found[0].length))] : ['', '']
      return (found && sentence.startsWith(before) && sentence.endsWith(after)) || sentence.includes(`— ${w.definitionEn.replace(new RegExp(`\\b${w.lemma}[a-z]*`, 'ig'), '____')}`)
    })
    if (await page.locator('.vq-opt').count()) await pickOption(word.lemma)
    else { await page.locator('.vq-input').fill(wrong ? 'zzz' : word.lemma); await page.getByRole('button', { name: 'Kiểm tra' }).click() }
  } else if (mode === 'Memory Cards') {
    await page.getByRole('button', { name: /Lật thẻ/ }).click()
    await page.locator(`.vq-grade[data-grade="${wrong ? 0 : 2}"]`).click()
  } else throw new Error(`Dạng chưa hỗ trợ trong kiểm thử: ${mode}`)
  return mode
}

export async function playSession(page, { wrongEvery = 4, onAsk } = {}) {
  let asked = 0
  const modes = []
  for (let guard = 0; guard < 200; guard++) {
    if (await page.locator('.vq-summary').count()) return { asked, modes }
    if (await page.locator('.vq-feedback .vq-fb').count()) { await page.locator('.vq-feedback .btn-primary').click(); continue }
    if (!(await page.locator('.vq-card').count())) { await page.waitForTimeout(80); continue }
    if (onAsk) await onAsk(await page.locator('.vq-meta .pill').first().innerText(), asked)
    modes.push(await answer(page, wrongEvery > 0 && asked % wrongEvery === wrongEvery - 1))
    asked++
    await page.waitForTimeout(60)
  }
  throw new Error('Phiên học không kết thúc')
}

