import { Icon } from '../ui/Icon.jsx'

function LearningArtwork() {
  return (
    <div className="learning-art artwork" aria-hidden="true">
      <div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" />
      <div className="art-spark art-spark-one"><Icon name="sparkles" size={30} /></div>
      <div className="art-spark art-spark-two">✳</div>
      <div className="art-book art-book-back" />
      <div className="art-book art-book-front"><span>ENGLISH OPENS DOORS</span><Icon name="arrow-up-right" size={30} /></div>
      <div className="vocabulary-card">
        <div className="art-card-top"><span>WORD OF THE DAY</span><span className="mini-icon"><Icon name="book" size={17} /></span></div>
        <h3>grow<span>.</span></h3>
        <div className="word-pronunciation">/ɡrəʊ/ <span>verb</span></div>
        <div className="word-meaning">Lớn lên. Tiến bộ. Vươn xa.</div>
        <div className="word-example">A little progress, every day.</div>
        <div className="word-card-bottom"><span>01 <span>/ 07</span></span><span className="word-card-dots"><i /><i /><i /></span></div>
      </div>
      <div className="listening-card"><span className="listening-icon"><Icon name="headphones" size={21} /></span><div><strong>Listen. Learn. Grow.</strong><div className="waveform">{[9,17,12,25,19,31,16,24,13,19,9,14,23,16,10,19,28,15,22,10,16,8].map((height, index) => <i key={index} style={{ height }} />)}</div></div><span className="audio-time">01:28</span></div>
      <div className="art-tag"><span><Icon name="check" size={14} /></span> Mỗi ngày, một bước tiến.</div>
    </div>
  )
}

function AdminArtwork() {
  return (
    <div className="admin-art artwork" aria-hidden="true">
      <div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" />
      <div className="art-spark art-spark-one"><Icon name="sparkles" size={30} /></div>
      <div className="art-spark art-spark-two">✳</div>
      <div className="admin-board-back" />
      <div className="admin-board">
        <div className="admin-board-header"><span className="mini-icon"><Icon name="layers" size={20} /></span><div><strong>Không gian quản trị</strong><span>Chất lượng từ từng chi tiết</span></div><span className="board-dots">•••</span></div>
        <div className="board-section-label">NỘI DUNG HỌC TẬP <span>TOEIC</span></div>
        <div className="board-row"><span className="board-row-icon"><Icon name="headphones" /></span><div><strong>Listening</strong><span>Lắng nghe để hiểu hơn</span></div><span className="board-row-check"><Icon name="check" size={15} /></span></div>
        <div className="board-row"><span className="board-row-icon"><Icon name="book" /></span><div><strong>Reading</strong><span>Mở rộng từng trang kiến thức</span></div><span className="board-row-check"><Icon name="check" size={15} /></span></div>
        <div className="board-row"><span className="board-row-icon"><Icon name="layers" /></span><div><strong>Vocabulary & Grammar</strong><span>Vững nền tảng, tiến xa hơn</span></div><span className="board-row-check"><Icon name="check" size={15} /></span></div>
        <div className="board-footer"><span className="board-status-dot" /> Cùng xây dựng trải nghiệm học tốt hơn</div>
      </div>
      <div className="admin-art-badge"><span><Icon name="shield" size={24} /></span><div><strong>Đúng người. Đúng quyền.</strong><small>Không gian dành cho quản trị viên</small></div></div>
    </div>
  )
}

export function AuthArtwork({ admin }) {
  return admin ? <AdminArtwork /> : <LearningArtwork />
}
