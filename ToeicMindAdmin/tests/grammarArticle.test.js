import test from 'node:test'
import assert from 'node:assert/strict'
import { articleTemplate, exerciseHtml, lessonIssues } from '../src/features/exams/utils/grammarArticle.js'

test('khung bài mới theo nhịp học → ví dụ → thử ngay, có mẹo TOEIC và không bị cảnh báo', () => {
  const html = articleTemplate('Danh từ')
  assert.deepEqual(lessonIssues(html), [])
  assert.match(html, /^<h2>1\. Danh từ là gì\?<\/h2>/)
  assert.equal((html.match(/class="grammar-exercise"/g) || []).length, 3)
  assert.match(html, /class="grammar-tip"/)
})

test('exerciseHtml: đánh dấu đúng một đáp án, escape văn bản, giải thích theo dòng', () => {
  const html = exerciseHtml({ question: 'Pick <b>one</b> ______.', options: ['a', 'b & c', 'd'], correct: 1, explanation: 'Dòng 1\nDòng 2' })
  assert.equal(html, '<div class="grammar-exercise"><p>Pick &lt;b&gt;one&lt;/b&gt; ______.</p><ol class="grammar-options"><li>a</li><li class="grammar-correct">b &amp; c</li><li>d</li></ol>'
    + '<div class="grammar-explain"><p>Dòng 1</p><p>Dòng 2</p></div></div><p></p>')
  assert.deepEqual(lessonIssues(`<h2>Phần</h2><blockquote class="grammar-example">e</blockquote>${html}<div class="grammar-tip">t</div>`), [])
})

test('lessonIssues: phần thiếu ví dụ/bài tập, thiếu mẹo, bài tập sai cấu trúc; phần mẹo/tổng hợp được miễn', () => {
  assert.deepEqual(lessonIssues('<p>x</p>'), ['Bài chưa chia phần (dùng nút "Phần (H2)").', 'Bài chưa có mẹo làm bài TOEIC.'])
  const html = '<h2>1. Vị trí</h2><p>lý thuyết</p>'
    + '<h2>2. Số ít</h2><blockquote class="grammar-example">e</blockquote>'
    + '<div class="grammar-exercise"><p>q</p><ol class="grammar-options"><li>a</li><li>b</li></ol><div class="grammar-explain">x</div></div>'
    + '<h2>Mẹo làm bài TOEIC</h2><div class="grammar-tip">t</div>'
    + '<h2>Bài tập tổng hợp</h2><div class="grammar-exercise"><p>q</p><ol class="grammar-options"><li class="grammar-correct">a</li><li>b</li></ol></div>'
  assert.deepEqual(lessonIssues(html), [
    'Phần “1. Vị trí” chưa có ví dụ và bài tập "Thử ngay".',
    'Bài tập 1 cần danh sách lựa chọn và đúng một đáp án đúng.',
    'Bài tập 2 chưa có giải thích.',
  ])
})
