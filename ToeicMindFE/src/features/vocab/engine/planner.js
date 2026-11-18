import { GROUP_MODE, MODES, MODE_IDS } from './modeCatalog.js'
import { idOf, shuffle } from './text.js'

// Lập kế hoạch một phiên: mỗi từ được hỏi bằng 2–3 dạng câu hỏi khác nhau, chọn ngẫu nhiên.
// Các câu hỏi chia thành "vòng" (vòng 1 = câu đầu của mọi từ, vòng 2 = câu thứ hai…) nên hai câu của cùng một từ
// luôn cách nhau cả một vòng: đo được độ nhớ thật thay vì nhớ ngắn hạn từ câu vừa thấy.
export const MIN_GROUP = 3
export const MAX_GROUP = 6

function weightedIndex(weights, rng) {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let pick = rng() * total
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return i
  }
  return weights.length - 1
}

// Chia đều n mục thành các nhóm tối đa `max` (không nhóm nào nhỏ hơn n/⌈n/max⌉ làm tròn xuống).
export function chunkEvenly(entries, max = MAX_GROUP) {
  const count = Math.ceil(entries.length / max)
  const base = Math.floor(entries.length / count)
  const extra = entries.length % count
  const groups = []
  let at = 0
  for (let g = 0; g < count; g++) {
    const size = base + (g < extra ? 1 : 0)
    groups.push(entries.slice(at, at + size))
    at += size
  }
  return groups
}

function sharesWord(a, b) {
  return a.items.some((x) => b.items.some((y) => idOf(x.word) === idOf(y.word)))
}

/**
 * @param {object} options
 * @param {Array} options.items     [{ word, contexts, kind }]
 * @param {object} options.env      { words } — từ của phiên + từ gây nhiễu
 * @param {string[]} options.modeIds các dạng được phép dùng
 * @param {number[]} options.perWord [tối thiểu, tối đa] số dạng mỗi từ
 * @param {Function} options.levelOf độ khó khởi điểm của một từ (ảnh hưởng việc chọn dạng đủ mạnh)
 * @returns {{ slots: Array, plans: Array }}
 */
export function planSession({ items, env, modeIds = MODE_IDS, rng = Math.random, perWord = [2, 3], levelOf = () => 0 }) {
  const modes = [...new Set(modeIds)].filter((id) => MODES[id])
  const [min, max] = perWord
  const usage = Object.fromEntries(modes.map((id) => [id, 0]))
  const plans = []

  for (const item of shuffle(items, rng)) {
    const eligible = modes.filter((id) => MODES[id].eligible(item, env))
    if (!eligible.length) continue
    const want = Math.min(eligible.length, min + Math.floor(rng() * (max - min + 1)))
    const level = levelOf(item)
    const pool = eligible.slice()
    const chosen = []
    while (chosen.length < want) {
      // Cân bằng giữa các dạng trong phiên (dạng đã dùng nhiều ít được chọn lại); dạng yếu bị giảm trọng số với từ đã quen.
      const weights = pool.map((id) => (MODES[id].strong(level) ? 1 : 0.25) / (1 + usage[id]) ** 2)
      const [id] = pool.splice(weightedIndex(weights, rng), 1)
      chosen.push(id)
      usage[id] += 1
    }
    plans.push({ id: idOf(item.word), item, modes: chosen, final: [] })
  }

  const rounds = Array.from({ length: max }, () => [])
  for (const plan of plans) plan.modes.forEach((mode, round) => rounds[round].push({ plan, mode }))

  const slots = []
  rounds.forEach((entries, round) => {
    if (!entries.length) return
    const grouped = entries.filter((e) => e.mode === GROUP_MODE)
    let singles = entries.filter((e) => e.mode !== GROUP_MODE)

    if (grouped.length && grouped.length < MIN_GROUP) {
      // Ghép cặp cần tối thiểu 3 từ: kéo thêm từ chưa có dạng này trong vòng, hoặc đổi sang dạng khác.
      const donors = shuffle(singles.filter((e) => !e.plan.modes.includes(GROUP_MODE)), rng)
      const need = MIN_GROUP - grouped.length
      if (donors.length >= need) {
        for (const entry of donors.slice(0, need)) {
          entry.mode = GROUP_MODE
          entry.plan.modes[round] = GROUP_MODE
          grouped.push(entry)
        }
        singles = singles.filter((e) => e.mode !== GROUP_MODE)
      } else {
        for (const entry of grouped.splice(0)) {
          const alternatives = shuffle(modes.filter((id) => id !== GROUP_MODE && !entry.plan.modes.includes(id) && MODES[id].eligible(entry.plan.item, env)), rng)
          if (!alternatives.length) continue
          entry.mode = alternatives[0]
          entry.plan.modes[round] = alternatives[0]
          singles.push(entry)
        }
      }
    }

    const roundSlots = [
      ...singles.map((e) => [e]),
      ...(grouped.length ? chunkEvenly(grouped) : []),
    ].map((chunk) => ({ mode: chunk[0].mode, items: chunk.map((e) => e.plan.item), entries: chunk }))

    const ordered = shuffle(roundSlots, rng)
    const previous = slots[slots.length - 1]
    if (previous && ordered.length > 1 && sharesWord(previous, ordered[0])) {
      const swap = ordered.findIndex((slot) => !sharesWord(previous, slot))
      if (swap > 0) [ordered[0], ordered[swap]] = [ordered[swap], ordered[0]]
    }
    for (const slot of ordered) {
      slot.entries.forEach((e) => e.plan.final.push(slot.mode))
      slots.push({ key: `r${round}-${slots.length}`, mode: slot.mode, round, items: slot.items })
    }
  })

  const finished = plans.filter((plan) => plan.final.length).map((plan) => ({ id: plan.id, item: plan.item, modes: plan.final }))
  return { slots, plans: finished }
}
