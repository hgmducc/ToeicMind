import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog.jsx'
import { GoalForm } from './GoalForm.jsx'

// Hộp đặt mục tiêu ở trang Lộ trình: điểm TOEIC mục tiêu, ngày thi dự kiến, số phút học mỗi ngày. Ô để trống = không đặt.
export function GoalDialog({ profile, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog title="Mục tiêu học tập" description="Lộ trình dùng mục tiêu để ưu tiên kỹ năng còn thiếu và chia bài học mỗi ngày." size="sm" onClose={onClose} dismissible={!busy}>
      <GoalForm profile={profile} onSaved={onSaved} onCancel={onClose} onBusyChange={setBusy} />
    </Dialog>
  )
}
