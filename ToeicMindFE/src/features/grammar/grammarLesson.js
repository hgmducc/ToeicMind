// Bài học ngữ pháp tương tác (UC-18). Nội dung do Admin soạn là HTML đã lọc; mỗi phần mở đầu bằng <h2>.
// Bài tập tương tác là khối cấp cao nhất:
//   <div class="grammar-exercise"> câu hỏi… <ol class="grammar-options"><li>…</li><li class="grammar-correct">…</li></ol>
//   <div class="grammar-explain">giải thích</div></div>
// Khối bài tập dạng cũ (đáp án trong <details>) không có ol.grammar-options nên vẫn hiển thị như HTML thường.

export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

// Tách nội dung thành các đoạn: HTML thường và bài tập tương tác; gắn id cho <h2> để làm mục lục.
// doc: Document đã chứa HTML đã lọc (DOMParser).
export function parseLesson(doc) {
  const sections = []
  const segments = []
  let buffer = []
  let sectionId = null
  const flush = () => {
    if (!buffer.length) return
    const box = doc.createElement('div')
    for (const node of buffer) box.appendChild(node)
    segments.push({ type: 'html', html: box.innerHTML })
    buffer = []
  }
  for (const node of [...doc.body.childNodes]) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      sectionId = `grammar-sec-${sections.length + 1}`
      node.id = sectionId
      sections.push({ id: sectionId, title: node.textContent.trim() || `Phần ${sections.length + 1}` })
    }
    const quiz = node.nodeType === 1 && node.classList.contains('grammar-exercise') ? readQuiz(node) : null
    if (quiz) {
      flush()
      segments.push({ type: 'quiz', key: `q${segments.length}`, sectionId, ...quiz })
    } else buffer.push(node)
  }
  flush()
  return { sections, segments, quizCount: segments.filter((s) => s.type === 'quiz').length }
}

function readQuiz(node) {
  const list = [...node.children].find((child) => child.tagName === 'OL' && child.classList.contains('grammar-options'))
  if (!list) return null
  const options = [...list.children].filter((li) => li.tagName === 'LI').map((li) => ({ html: li.innerHTML, correct: li.classList.contains('grammar-correct') }))
  // Cần ít nhất 2 lựa chọn và đúng một đáp án; sai cấu trúc thì để nguyên dạng HTML.
  if (options.length < 2 || options.filter((o) => o.correct).length !== 1) return null
  const explain = [...node.children].find((child) => child.classList.contains('grammar-explain'))
  const question = [...node.childNodes].filter((child) => child !== list && child !== explain)
  const box = node.ownerDocument.createElement('div')
  for (const child of question) box.appendChild(child.cloneNode(true))
  return { questionHtml: box.innerHTML, options, correctIndex: options.findIndex((o) => o.correct), explainHtml: explain?.innerHTML || '' }
}

// Tiến độ: answers = { [quizKey]: chỉ số đã chọn }. Phần "xong" khi mọi bài tập trong phần đã được trả lời.
export function lessonProgress(segments, answers) {
  const quizzes = segments.filter((s) => s.type === 'quiz')
  const answered = quizzes.filter((q) => answers[q.key] !== undefined)
  const correct = answered.filter((q) => answers[q.key] === q.correctIndex).length
  const bySection = new Map()
  for (const q of quizzes) bySection.set(q.sectionId, [...(bySection.get(q.sectionId) || []), q])
  const doneSections = new Set([...bySection].filter(([, list]) => list.every((q) => answers[q.key] !== undefined)).map(([id]) => id))
  return { total: quizzes.length, answered: answered.length, correct, doneSections }
}
