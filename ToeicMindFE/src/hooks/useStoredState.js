import { useEffect, useState } from 'react'

// State được nhớ trong localStorage (tùy chọn giao diện). Storage bị chặn thì vẫn chạy bằng bộ nhớ.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initial : JSON.parse(raw)
    } catch { return initial }
  })
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage bị chặn. */ }
  }, [key, value])
  return [value, setValue]
}
