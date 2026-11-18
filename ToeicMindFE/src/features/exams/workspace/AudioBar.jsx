import { useMemo } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { formatTime, nextRate, waveform } from './studyModel.js'

// Thanh âm thanh: nút phát/dừng, sóng âm (vạch đã nghe tô màu), thời gian; Luyện tập có thêm tua lại 3s/5s, nghe lại, tốc độ.
// controls=false (Luyện thi): chỉ hiện tiến độ, không tua được như thi thật.
export function AudioBar({ seed, current, duration, playing, rate = 1, blocked = false, loading = false, controls = true, onToggle, onSeek, onBack, onReplay, onRate }) {
  const bars = useMemo(() => waveform(seed), [seed])
  const progress = duration ? Math.min(1, current / duration) : 0
  const played = Math.round(progress * bars.length)

  function seekFromPointer(event) {
    if (!controls || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration)))
  }
  function onWaveKey(event) {
    if (!controls || !duration) return
    const delta = { ArrowLeft: -3, ArrowRight: 3, Home: -duration, End: duration }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    event.stopPropagation()
    onSeek(Math.max(0, Math.min(duration, current + delta)))
  }

  const wave = (
    <div className="audio-wave" onPointerDown={seekFromPointer} onKeyDown={onWaveKey}
      {...(controls
        ? { role: 'slider', tabIndex: 0, 'aria-label': 'Vị trí âm thanh', 'aria-valuemin': 0, 'aria-valuemax': Math.round(duration || 0), 'aria-valuenow': Math.round(current || 0), 'aria-valuetext': `${formatTime(current)} / ${formatTime(duration)}` }
        : { role: 'progressbar', 'aria-label': 'Tiến độ âm thanh', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) })}>
      {bars.map((height, index) => <i key={index} data-played={index < played} style={{ height: `${height * 100}%` }} />)}
    </div>
  )

  return (
    <div className="audio-bar" data-loading={loading}>
      <div className="audio-main">
        {controls || blocked
          ? <button type="button" className="audio-play" onClick={onToggle} aria-label={playing ? 'Dừng' : blocked ? 'Bấm để phát' : 'Phát'}><Icon name={playing ? 'pause' : 'play'} size={18} /></button>
          : <span className="audio-play" data-static="true" aria-hidden="true"><Icon name={playing ? 'volume' : 'pause'} size={18} /></span>}
        {wave}
        <span className="audio-time">{loading ? 'Đang tải…' : `${formatTime(current)} / ${formatTime(duration)}`}</span>
      </div>
      {blocked && <p className="audio-blocked" role="status">Trình duyệt chặn tự phát âm thanh. Bấm nút phát để nghe.</p>}
      {controls && (
        <div className="audio-tools">
          <button type="button" className="audio-tool" onClick={() => onBack(3)} aria-label="Tua lại 3 giây"><Icon name="rotate-ccw" size={16} />3s</button>
          <button type="button" className="audio-tool" onClick={() => onBack(5)} aria-label="Tua lại 5 giây"><Icon name="rotate-ccw" size={16} />5s</button>
          <button type="button" className="audio-tool" onClick={onReplay}><Icon name="refresh" size={16} />Nghe lại</button>
          <span className="spacer" />
          <button type="button" className="audio-tool audio-rate" onClick={() => onRate(nextRate(rate))} aria-label={`Tốc độ phát ${rate}x, bấm để đổi`}>{rate}x</button>
        </div>
      )}
    </div>
  )
}
