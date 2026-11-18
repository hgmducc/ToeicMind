import { Icon } from '../../../components/ui/Icon.jsx'
import { speak } from '../../../lib/speech.js'

export function SpeakButton({ text, label = 'Phát âm', compact = false }) {
  return (
    <button type="button" className={compact ? 'icon-btn' : 'btn btn-outline btn-sm'} onClick={(event) => { event.stopPropagation(); speak(text) }} aria-label={`Phát âm ${text}`} title="Phát âm">
      <Icon name="volume" size={compact ? 16 : 14} />{!compact && label}
    </button>
  )
}
