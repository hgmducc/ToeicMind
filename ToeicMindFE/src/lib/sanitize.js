import DOMPurify from 'dompurify'

// HTML đoạn văn/bài đọc do quản trị biên soạn: luôn lọc trước khi chèn vào trang (chống XSS), chỉ giữ thẻ HTML thuần.
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(String(html || ''), { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style'] })
}
