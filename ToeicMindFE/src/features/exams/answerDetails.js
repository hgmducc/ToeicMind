// Tách văn bản giải thích do quản trị biên soạn (văn bản thuần, mỗi ý một dòng) thành dữ liệu có cấu trúc để hiển thị.
// Không đoán được cấu trúc thì trả về dạng đơn giản để giao diện hiện nguyên văn, không làm mất chữ.

const lines = (text) => String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

const STEP = /^(Bước\s*\d+)\s*[:.]\s*(.*)$/i
const TIP = /\s*\b(Mẹo|Lưu ý|Tip)\s*:\s*/i

// "Bước 1: …", "Bước 2: … Mẹo: …" → { steps: [{ label, text }], tips: [{ label, text }] }. Dòng không có "Bước N" giữ label null.
export function explanationSteps(text) {
  const steps = []
  const tips = []
  for (const line of lines(text)) {
    const tip = line.match(TIP)
    let body = line
    if (tip && tip.index > 0) {
      body = line.slice(0, tip.index).trim()
      tips.push({ label: tip[1], text: line.slice(tip.index + tip[0].length).trim() })
    } else if (tip && tip.index === 0) {
      tips.push({ label: tip[1], text: line.slice(tip[0].length).trim() })
      continue
    }
    const step = body.match(STEP)
    steps.push(step ? { label: step[1], text: step[2] } : { label: null, text: body })
  }
  return { steps: steps.filter((s) => s.text), tips: tips.filter((t) => t.text) }
}

const OPTION_LINE = /^\(?([A-D])\)?\s*[:.)\-–]\s*(.*)$/
const VERDICT = /(?:^|\s[-–—]\s*)(Đúng|Sai)\s*[:\-–—.]\s*/i

// "A: The woman is wiping … - Sai: Người phụ nữ không lau bàn." → [{ label: 'A', quote, verdict: 'wrong', reason }].
// Dòng không bắt đầu bằng nhãn được nối vào lý do của phương án trước. Dòng đầu không có nhãn → null (hiện nguyên văn).
export function parseOptionAnalysis(text) {
  const items = []
  for (const line of lines(text)) {
    const match = line.match(OPTION_LINE)
    if (!match) {
      if (!items.length) return null
      const last = items[items.length - 1]
      last.reason = `${last.reason ? `${last.reason} ` : ''}${line}`
      continue
    }
    const [, label, body] = match
    const verdict = body.match(VERDICT)
    if (verdict) {
      items.push({
        label,
        quote: body.slice(0, verdict.index).trim().replace(/\s*[-–—]$/, ''),
        verdict: verdict[1].toLowerCase() === 'đúng' ? 'correct' : 'wrong',
        reason: body.slice(verdict.index + verdict[0].length).trim(),
      })
    } else items.push({ label, quote: '', verdict: null, reason: body.trim() })
  }
  return items.length ? items : null
}

const PAIR_LABEL = /^\(([A-D])\)\s*/

// Script tiếng Anh và bản dịch: số dòng bằng nhau → ghép từng cặp (nhãn (A)…(D) tách ra); khác nhau → hai khối riêng.
export function pairTranscript(english, vietnamese) {
  const en = lines(english)
  const vi = lines(vietnamese)
  if (!en.length) return null
  if (!vi.length || vi.length !== en.length) return { pairs: null, en, vi }
  return {
    pairs: en.map((line, index) => {
      const labelEn = line.match(PAIR_LABEL)
      const labelVi = vi[index].match(PAIR_LABEL)
      return { label: labelEn?.[1] || labelVi?.[1] || null, en: line.replace(PAIR_LABEL, ''), vi: vi[index].replace(PAIR_LABEL, '') }
    }),
    en,
    vi,
  }
}

// Tách người nói đầu dòng hội thoại ("M: …", "W1: …", "Woman: …") để in đậm.
const SPEAKER = /^((?:M|W|Man|Woman|Narrator)\s?\d?)\s*:\s*/i
export function splitSpeaker(line) {
  const match = String(line ?? '').match(SPEAKER)
  return match ? { speaker: match[1], text: line.slice(match[0].length) } : { speaker: null, text: line }
}
