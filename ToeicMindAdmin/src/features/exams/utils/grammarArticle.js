// Bài ngữ pháp (UC-25): mỗi chủ điểm một bài học tương tác. Mỗi phần mở đầu bằng <h2> (mục lục bên người học) và đi theo nhịp
// lý thuyết → cấu trúc → ví dụ → bài tập "Thử ngay"; cuối bài là mẹo TOEIC và bài tập tổng hợp.
// Class được backend giữ lại khi lọc HTML: grammar-structure, grammar-example, grammar-tip và bài tập tương tác
// div.grammar-exercise > câu hỏi + ol.grammar-options > li (li.grammar-correct = đáp án đúng) + div.grammar-explain.

export const OPTION_LABELS = ['A', 'B', 'C', 'D']

const escapeHtml = (text) => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const paragraphs = (text) => String(text ?? '').split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('')

// Khối bài tập tương tác từ dữ liệu form (văn bản thuần, được escape). correct: chỉ số đáp án đúng.
export function exerciseHtml({ question, options, correct, explanation }) {
  const items = options.map((option, i) => `<li${i === correct ? ' class="grammar-correct"' : ''}>${escapeHtml(option.trim())}</li>`).join('')
  return `<div class="grammar-exercise">${paragraphs(question)}<ol class="grammar-options">${items}</ol>`
    + `<div class="grammar-explain">${paragraphs(explanation) || '<p></p>'}</div></div><p></p>`
}

export const ARTICLE_BLOCKS = {
  structure: '<p class="grammar-structure">S + V(s/es) + O</p><p></p>',
  example: '<blockquote class="grammar-example"><p><strong>Ví dụ:</strong> The manager <u>reviews</u> the report every Monday. <em>(Quản lý xem báo cáo vào mỗi thứ Hai.)</em></p></blockquote><p></p>',
  tip: '<div class="grammar-tip"><p><strong>Mẹo TOEIC:</strong> Dấu hiệu nhận biết, bẫy thường gặp và cách loại trừ nhanh đáp án.</p></div><p></p>',
}

const sampleExercise = exerciseHtml({
  question: 'The new policy ______ effective next month.',
  options: ['become', 'becomes', 'becoming', 'to become'],
  correct: 1,
  explanation: 'Đáp án (B). Chủ ngữ số ít "The new policy" nên động từ chia số ít.',
})

// Khung bài chuẩn điền sẵn khi soạn bài mới: 2 phần mẫu theo nhịp học → ví dụ → thử ngay, rồi mẹo TOEIC và bài tập tổng hợp.
export const articleTemplate = (topicName) =>
  `<h2>1. ${escapeHtml(topicName)} là gì?</h2><p>Khái niệm, chức năng trong câu và khi nào dùng.</p>${ARTICLE_BLOCKS.example}${sampleExercise}`
  + `<h2>2. Cấu trúc</h2>${ARTICLE_BLOCKS.structure}<ul><li>Khẳng định: …</li><li>Phủ định: …</li><li>Nghi vấn: …</li></ul>${ARTICLE_BLOCKS.example}${sampleExercise}`
  + `<h2>Mẹo làm bài TOEIC</h2>${ARTICLE_BLOCKS.tip}`
  + `<h2>Bài tập tổng hợp</h2>${sampleExercise}`

const has = (html, cls) => new RegExp(`class="[^"]*\\b${cls}\\b`).test(html)
const isSummaryPart = (title) => /mẹo|tổng kết|tổng hợp|ôn tập/i.test(title)

// Cảnh báo (không chặn lưu): phần học thiếu ví dụ/bài tập, cả bài thiếu mẹo TOEIC, bài tập sai cấu trúc.
export function lessonIssues(html) {
  const text = String(html || '')
  const issues = []
  const parts = text.split(/<h2[^>]*>/i).slice(1).map((chunk) => {
    const end = chunk.search(/<\/h2>/i)
    return { title: chunk.slice(0, end).replace(/<[^>]*>/g, '').trim(), body: chunk.slice(end) }
  })
  if (!parts.length) issues.push('Bài chưa chia phần (dùng nút "Phần (H2)").')
  for (const part of parts.filter((p) => !isSummaryPart(p.title))) {
    const lacks = [!has(part.body, 'grammar-example') && 'ví dụ', !has(part.body, 'grammar-exercise') && 'bài tập "Thử ngay"'].filter(Boolean)
    if (lacks.length) issues.push(`Phần “${part.title || 'không tên'}” chưa có ${lacks.join(' và ')}.`)
  }
  if (!has(text, 'grammar-tip')) issues.push('Bài chưa có mẹo làm bài TOEIC.')
  const exercises = text.split(/(?=<div class="grammar-exercise")/).filter((chunk) => chunk.startsWith('<div class="grammar-exercise"'))
  exercises.forEach((chunk, i) => {
    const options = chunk.slice(0, chunk.search(/<\/ol>/i) + 1 || undefined)
    const correct = (options.match(/class="[^"]*\bgrammar-correct\b/g) || []).length
    if (!has(chunk, 'grammar-options') || correct !== 1) issues.push(`Bài tập ${i + 1} cần danh sách lựa chọn và đúng một đáp án đúng.`)
    else if (!has(chunk, 'grammar-explain')) issues.push(`Bài tập ${i + 1} chưa có giải thích.`)
  })
  return issues
}
