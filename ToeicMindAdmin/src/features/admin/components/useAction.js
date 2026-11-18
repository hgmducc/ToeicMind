import { useRef, useState } from 'react'
import { errorNotice } from '../../exams/utils/apiErrors.js'

/** Chạy một thao tác gọi API với khóa chống bấm đúp và thông báo thống nhất. */
export function useAction() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null)
  async function run(action, success) {
    if (lock.current) return null
    lock.current = true
    setBusy(true)
    setNotice(null)
    try {
      const result = await action()
      if (success) setNotice({ kind: 'success', text: success })
      return { result }
    } catch (error) {
      setNotice(errorNotice(error))
      return null
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { busy, notice, setNotice, run }
}
