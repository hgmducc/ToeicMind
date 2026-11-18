import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import DOMPurify from 'dompurify'
import { ARTICLE_BLOCKS } from '../utils/grammarArticle.js'

// variant 'article': soạn bài ngữ pháp (UC-25) — bỏ mẫu bài đọc TOEIC, thêm tiêu đề phần/mục và các khối cấu trúc, ví dụ, bài tập mẫu, mẹo TOEIC.
// onRequestExercise(insert): bài ngữ pháp mở form soạn bài tập rồi gọi insert(html) để chèn đúng vị trí con trỏ đã lưu.
export function PassageEditor({ value = '', onChange, isReadOnly = false, partNo = 7, variant = 'passage', label, onRequestExercise }) {
  const article = variant === 'article'
  const areaLabel = label || `Bài đọc Part ${partNo}`
  // 'visual' (render HTML tương tác) hoặc 'html' (mã nguồn raw HTML)
  const [mode, setMode] = useState('visual')
  const contentEditableRef = useRef(null)

  // Cập nhật DOM của contentEditable khi value thay đổi từ ngoài hoặc khi chuyển tab
  useEffect(() => {
    if (contentEditableRef.current && mode === 'visual') {
      if (contentEditableRef.current.innerHTML !== (value || '')) {
        contentEditableRef.current.innerHTML = DOMPurify.sanitize(value || '', {
          USE_PROFILES: { html: true },
        })
      }
    }
  }, [value, mode])

  // Xử lý khi người dùng gõ sửa trực tiếp trong khung visual
  function handleVisualInput(e) {
    if (isReadOnly) return
    const newHtml = DOMPurify.sanitize(e.currentTarget.innerHTML, { USE_PROFILES: { html: true } })
    onChange(newHtml)
  }

  // Lưu vị trí con trỏ trong khung soạn trước khi mở hộp thoại (mở hộp thoại làm mất vùng chọn), chèn lại đúng chỗ sau đó.
  function requestExercise() {
    const selection = window.getSelection()
    const editor = contentEditableRef.current
    const saved = editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer) ? selection.getRangeAt(0).cloneRange() : null
    onRequestExercise((html) => {
      if (mode === 'html' || !editor) { onChange(`${value || ''}${html}`); return }
      editor.focus()
      const range = saved || (() => { const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false); return r })()
      selection.removeAllRanges()
      selection.addRange(range)
      executeCommand('insertHTML', html)
    })
  }

  // Thao tác định dạng văn bản nhanh bằng document.execCommand
  function executeCommand(command, arg = null) {
    if (isReadOnly) return
    if (contentEditableRef.current) {
      contentEditableRef.current.focus()
      document.execCommand(command, false, arg)
      onChange(contentEditableRef.current.innerHTML)
    }
  }

  // Chèn chỗ trống điền từ nhanh [____]
  function insertBlankPlaceholder() {
    if (isReadOnly) return
    const blankHtml = '<strong>[____]</strong> '
    executeCommand('insertHTML', blankHtml)
  }

  // Chèn mẫu văn bản TOEIC nhanh
  function insertSampleTemplate(type) {
    let tpl = ''
    if (type === 'email') {
      tpl = `<p><strong>To:</strong> All Staff &lt;staff@company.com&gt;<br><strong>From:</strong> Human Resources<br><strong>Date:</strong> October 30<br><strong>Subject:</strong> Annual Performance Review Schedule</p><p>Dear Employees,</p><p>Please be advised that the annual performance evaluations will commence next week. All departmental managers must submit their self-assessments by Friday afternoon.</p>`
    } else if (type === 'notice') {
      tpl = `<h3>Public Notice: Facility Maintenance Schedule</h3><p>Please note that the main parking pavilion will be closed for routine resurfacing from November 5 through November 7. Alternate parking passes can be claimed at the security desk.</p>`
    }
    onChange(tpl)
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = tpl
    }
  }

  return (
    <div className="passage-editor-container">
      {/* Thanh điều khiển Header: Chuyển đổi 2 chế độ và công cụ định dạng */}
      <div className="passage-toolbar">
        <div className="passage-toolbar-left">
          <div className="passage-mode-toggle" role="tablist">
            <button
              type="button"
              className="passage-mode-btn"
              data-active={mode === 'visual'}
              onClick={() => setMode('visual')}
              title="Xem và chỉnh sửa trực quan trên giao diện bài đọc"
            >
              <Icon name="eye" size={15} />
              <span>{article ? 'Soạn trực quan' : 'Giao diện bài đọc (Trực quan)'}</span>
            </button>
            <button
              type="button"
              className="passage-mode-btn"
              data-active={mode === 'html'}
              onClick={() => setMode('html')}
              title="Chỉnh sửa mã nguồn HTML"
            >
              <Icon name="sparkles" size={15} />
              <span>Mã nguồn HTML</span>
            </button>
          </div>

          {mode === 'visual' && !isReadOnly && (
            <span className="passage-hint-badge">✓ Bạn có thể click chuột vào bài đọc để sửa trực tiếp</span>
          )}
        </div>

        {/* Thanh công cụ định dạng khi ở chế độ Trực quan */}
        {mode === 'visual' && !isReadOnly && (
          <div className="passage-format-tools">
            <button
              type="button"
              className="format-tool-btn"
              onClick={() => executeCommand('bold')}
              title="In đậm (Bold)"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className="format-tool-btn"
              onClick={() => executeCommand('italic')}
              title="In nghiêng (Italic)"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className="format-tool-btn"
              onClick={() => executeCommand('insertUnorderedList')}
              title="Danh sách gạch đầu dòng"
            >
              • Danh sách
            </button>
            {partNo === 6 && (
              <button
                type="button"
                className="format-tool-btn format-tool-btn--accent"
                onClick={insertBlankPlaceholder}
                title="Chèn chỗ trống điền từ cho Part 6"
              >
                + Chèn [____]
              </button>
            )}
            {article ? (
              <>
                <button type="button" className="format-tool-btn" onClick={() => executeCommand('formatBlock', '<h2>')} title="Tiêu đề phần (hiện trong mục lục của người học)">Phần (H2)</button>
                <button type="button" className="format-tool-btn" onClick={() => executeCommand('formatBlock', '<h3>')} title="Tiêu đề mục nhỏ">Mục (H3)</button>
                <button type="button" className="format-tool-btn" onClick={() => executeCommand('formatBlock', '<p>')} title="Đoạn văn thường">Đoạn văn</button>
                <button type="button" className="format-tool-btn" onClick={() => executeCommand('insertOrderedList')} title="Danh sách đánh số">1. Danh sách</button>
                <button type="button" className="format-tool-btn format-tool-btn--accent" onClick={() => executeCommand('insertHTML', ARTICLE_BLOCKS.structure)} title="Chèn khung công thức/cấu trúc">+ Cấu trúc</button>
                <button type="button" className="format-tool-btn format-tool-btn--accent" onClick={() => executeCommand('insertHTML', ARTICLE_BLOCKS.example)} title="Chèn ví dụ mẫu có dịch nghĩa">+ Ví dụ</button>
                {onRequestExercise && <button type="button" className="format-tool-btn format-tool-btn--accent" onClick={requestExercise} title="Soạn câu “Thử ngay”: người học bấm chọn đáp án và xem giải thích ngay">+ Bài tập</button>}
                <button type="button" className="format-tool-btn format-tool-btn--accent" onClick={() => executeCommand('insertHTML', ARTICLE_BLOCKS.tip)} title="Chèn khung mẹo làm bài TOEIC">+ Mẹo TOEIC</button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="format-tool-btn"
                  onClick={() => insertSampleTemplate('email')}
                  title="Chèn mẫu Email công sở"
                >
                  Mẫu Email
                </button>
                <button
                  type="button"
                  className="format-tool-btn"
                  onClick={() => insertSampleTemplate('notice')}
                  title="Chèn mẫu Thông báo"
                >
                  Mẫu Thông báo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* VÙNG 1: HIỂN THỊ TRỰC QUAN & CHỈNH SỬA TƯƠNG TÁC (VISUAL / RENDERED) */}
      {mode === 'visual' && (
        <div
          ref={contentEditableRef}
          className="passage-rendered-paper"
          contentEditable={!isReadOnly}
          suppressContentEditableWarning={true}
          onInput={handleVisualInput}
          onBlur={handleVisualInput}
          role="textbox"
          aria-label={areaLabel}
          aria-multiline="true"
          onPaste={(e) => {
            e.preventDefault()
            if (isReadOnly) return
            const html = e.clipboardData.getData('text/html')
            if (html) executeCommand('insertHTML', DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }))
            else executeCommand('insertText', e.clipboardData.getData('text/plain'))
          }}
          placeholder={article ? 'Nhập hoặc dán nội dung bài học tại đây...' : 'Nhập hoặc dán nội dung đoạn văn bài đọc tại đây...'}
        />
      )}

      {/* VÙNG 2: CHỈNH SỬA MÃ NGUỒN RAW HTML */}
      {mode === 'html' && (
        <div className="passage-raw-html-wrapper">
          <textarea
            className="passage-raw-textarea"
            aria-label={article ? 'Mã HTML bài ngữ pháp' : `Mã HTML bài đọc Part ${partNo}`}
            rows={article ? 16 : 8}
            value={value || ''}
            readOnly={isReadOnly}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<p>Nhập mã HTML đoạn văn...</p>"
          />
        </div>
      )}
    </div>
  )
}
