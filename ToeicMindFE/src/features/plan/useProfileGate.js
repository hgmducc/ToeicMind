import { useCallback, useEffect, useState } from 'react'
import { needsOnboarding } from './planModel.js'
import { getProfile } from './services/planApi.js'

// Cổng thiết lập ban đầu: tài khoản chưa từng lưu mục tiêu (isSet = false) phải qua /welcome trước khi dùng ứng dụng.
// Đã thiết lập thì nhớ trên máy theo userId (hồ sơ không thể quay lại trạng thái chưa thiết lập) để không hỏi lại máy chủ.
// Lỗi tải (mạng, 503 database chưa chạy phần CHG-007) không chặn người học và không được nhớ.
const okKey = (userId) => `toeicmind_fe_profile_ok_${userId}`

function readOk(userId) {
  try { return globalThis.localStorage?.getItem(okKey(userId)) === '1' } catch { return false }
}
function writeOk(userId) {
  try { globalThis.localStorage?.setItem(okKey(userId), '1') } catch { /* Storage bị chặn: lần sau hỏi lại máy chủ. */ }
}

export function useProfileGate(userId) {
  const [state, setState] = useState({ userId: null, status: 'loading' })
  const cached = !!userId && readOk(userId)

  useEffect(() => {
    if (!userId || cached) return undefined
    let alive = true
    getProfile()
      .then((profile) => {
        if (!alive) return
        const required = needsOnboarding(profile)
        if (!required && profile?.isSet) writeOk(userId)
        setState({ userId, status: required ? 'required' : 'ok' })
      })
      .catch(() => { if (alive) setState({ userId, status: 'ok' }) })
    return () => { alive = false }
  }, [userId, cached])

  const markSet = useCallback(() => {
    writeOk(userId)
    setState({ userId, status: 'ok' })
  }, [userId])

  const status = !userId || cached ? 'ok' : state.userId === userId ? state.status : 'loading'
  return { status, markSet }
}
