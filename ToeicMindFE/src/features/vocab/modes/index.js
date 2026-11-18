import FillMode from './FillMode.jsx'
import FlashMode from './FlashMode.jsx'
import MatchMode from './MatchMode.jsx'
import MissingMode from './MissingMode.jsx'
import QuizMode from './QuizMode.jsx'
import ScrambleMode from './ScrambleMode.jsx'
import TrueFalseMode from './TrueFalseMode.jsx'

// Dạng câu hỏi → component hiển thị. Mô tả và điều kiện chơi được nằm ở engine/modeCatalog.js.
export const MODE_VIEWS = {
  quiz: QuizMode,
  match: MatchMode,
  scramble: ScrambleMode,
  tf: TrueFalseMode,
  fill: FillMode,
  flash: FlashMode,
  missing: MissingMode,
}
