import { MODE_IDS, isModeId } from '../engine/modeCatalog.js'
import { planSession } from '../engine/planner.js'
import { levelFromProgress } from '../engine/scoring.js'
import { idOf } from '../engine/text.js'
import { getStudySession } from './vocabApi.js'

// Nguồn từ ↔ chế độ của GET /api/vocab/study (MIXED = từ đến hạn trước, rồi từ mới).
export const SOURCES = [
  { id: 'SMART', label: 'Thông minh', mode: 'MIXED', hint: 'Từ đến hạn ôn trước, rồi đến từ mới.' },
  { id: 'NEW', label: 'Chỉ từ mới', mode: 'NEW', hint: 'Những từ bạn chưa từng học.' },
  { id: 'REVIEW', label: 'Chỉ ôn lại', mode: 'REVIEW', hint: 'Những từ đã học và đến hạn ôn.' },
  { id: 'PRACTICE', label: 'Luyện tự do', mode: 'PRACTICE', hint: 'Từ ngẫu nhiên; từ chưa đến hạn không đổi lịch ôn.' },
]
export const WORD_COUNTS = [5, 10, 20]
export const DIFFICULTIES = [['auto', 'Tự động'], ['1', 'Mức 1'], ['2', 'Mức 2'], ['3', 'Mức 3'], ['4', 'Mức 4']]
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const SCOPE_KEYS = ['examSetId', 'examId', 'partNo', 'mine']
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Cấu hình phiên nằm trên URL để tải lại hoặc "Học tiếp" giữ nguyên lựa chọn.
export function parseConfig(params) {
  const scope = Object.fromEntries(SCOPE_KEYS.filter((key) => params.get(key)).map((key) => [key, params.get(key)]))
  const picked = (params.get('modes') || '').split(',').filter(isModeId)
  const diff = params.get('diff')
  return {
    scope,
    modeIds: picked.length >= 2 ? picked : MODE_IDS.slice(),
    src: SOURCES.some((source) => source.id === params.get('src')) ? params.get('src') : 'SMART',
    count: clamp(Number(params.get('n')) || WORD_COUNTS[1], 3, 30),
    diff: diff && /^[1-4]$/.test(diff) ? Number(diff) - 1 : 'auto',
    cefr: CEFR_LEVELS.includes(params.get('cefr')) ? params.get('cefr') : '',
  }
}

export function configToQuery(config) {
  const query = new URLSearchParams(config.scope)
  query.set('modes', config.modeIds.join(','))
  query.set('src', config.src)
  query.set('n', String(config.count))
  query.set('diff', config.diff === 'auto' ? 'auto' : String(config.diff + 1))
  if (config.cefr) query.set('cefr', config.cefr)
  return query.toString()
}

// Từ của phiên + từ gây nhiễu do máy chủ trả (Pool) → danh sách đáp án nhiễu cho các dạng câu hỏi.
export function buildEnv(items, pool = []) {
  const byId = new Map()
  for (const item of items) byId.set(idOf(item.word), item.word)
  for (const word of pool) if (!byId.has(idOf(word))) byId.set(idOf(word), word)
  return { words: [...byId.values()] }
}

export async function loadSession(config) {
  const source = SOURCES.find((entry) => entry.id === config.src) || SOURCES[0]
  const response = await getStudySession({ ...config.scope, cefrLevel: config.cefr, mode: source.mode, limit: config.count })
  const items = (response.cards || []).map((card) => ({ word: card.word, contexts: card.contexts || [], kind: card.kind }))
  const env = buildEnv(items, response.pool)
  const levelOf = (item) => (config.diff === 'auto' ? levelFromProgress(item.word) : config.diff)
  const { slots, plans } = planSession({ items, env, modeIds: config.modeIds, levelOf })
  return {
    id: Date.now(), items, env, slots, plans,
    dueTotal: response.dueTotal ?? 0, newTotal: response.newTotal ?? 0,
    skipped: items.length - plans.length,
  }
}
