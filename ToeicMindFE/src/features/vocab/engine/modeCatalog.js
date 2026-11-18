import { blankOf, lettersOf } from './text.js'

// Bảy dạng câu hỏi. Chỉ chứa mô tả và điều kiện chơi được; phần hiển thị nằm ở features/vocab/modes.
// strong(level): dạng này có đủ sức đánh giá độ quen của từ ở mức khó `level` (0..3) hay không.
// Dạng yếu (đúng/sai có 50% đoán mò, tự chấm) ít được chọn hơn cho từ đã quen để phép đo đáng tin hơn.
export const GROUP_MODE = 'match'
export const MODE_IDS = ['quiz', 'match', 'scramble', 'tf', 'fill', 'flash', 'missing']

export const MODES = {
  quiz: {
    id: 'quiz', name: 'Word Quiz', vi: 'Trắc nghiệm', short: 'Trắc nghiệm', icon: 'target',
    desc: 'Chọn nghĩa đúng của từ hoặc từ đúng của nghĩa. Càng quen càng nhiều đáp án gây nhiễu.',
    eligible: (_item, env) => env.words.length >= 3, strong: () => true,
  },
  match: {
    id: 'match', name: 'Word Matching', vi: 'Ghép cặp', short: 'Ghép cặp', icon: 'link', group: true,
    desc: 'Nối từ tiếng Anh với nghĩa tiếng Việt, tính giờ. Mỗi lượt 3–6 từ.',
    eligible: () => true, strong: () => true,
  },
  scramble: {
    id: 'scramble', name: 'Word Scramble', vi: 'Xếp chữ', short: 'Xếp chữ', icon: 'shuffle',
    desc: 'Sắp xếp các chữ cái bị xáo trộn thành từ đúng. Mức cao có thêm chữ cái thừa.',
    eligible: (item) => { const n = lettersOf(item.word.lemma).length; return n >= 3 && n <= 14 }, strong: () => true,
  },
  tf: {
    id: 'tf', name: 'True or False', vi: 'Đúng hay sai', short: 'Đúng/Sai', icon: 'check',
    desc: 'Phán đoán nhanh một nhận định về từ là đúng hay sai.',
    eligible: (_item, env) => env.words.length >= 2, strong: (level) => level <= 2,
  },
  fill: {
    id: 'fill', name: 'Fill in the Blank', vi: 'Điền chỗ trống', short: 'Điền từ', icon: 'book',
    desc: 'Điền từ vào câu ví dụ (hoặc định nghĩa). Mức cao phải tự gõ.',
    eligible: (item) => !!blankOf(item), strong: () => true,
  },
  flash: {
    id: 'flash', name: 'Memory Cards', vi: 'Thẻ ghi nhớ', short: 'Thẻ nhớ', icon: 'sparkles', self: true,
    desc: 'Lật thẻ, tự nhớ lại rồi chấm Quên / Khó / Nhớ / Dễ.',
    eligible: () => true, strong: (level) => level <= 1,
  },
  missing: {
    id: 'missing', name: 'Missing Letters', vi: 'Điền chữ cái còn thiếu', short: 'Thiếu chữ', icon: 'text',
    desc: 'Từ bị khuyết một số chữ cái, điền các chữ còn thiếu. Mức cao khuyết nhiều hơn.',
    eligible: (item) => lettersOf(item.word.lemma).length >= 3, strong: () => true,
  },
}

export const isModeId = (id) => Object.hasOwn(MODES, id)
