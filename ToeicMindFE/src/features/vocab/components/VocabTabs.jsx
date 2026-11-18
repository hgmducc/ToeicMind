import { SegTabs } from '../../../components/ui/Controls.jsx'

export function VocabTabs({ current }) {
  return (
    <SegTabs
      label="Từ vựng"
      items={[
        { to: '/vocab', label: 'Học từ vựng', active: current === 'learn' },
        { to: '/vocab/mine', label: 'Từ của tôi', active: current === 'mine' },
      ]}
    />
  )
}
