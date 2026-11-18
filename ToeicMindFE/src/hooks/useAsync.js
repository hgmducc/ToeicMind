import { useCallback, useEffect, useRef, useState } from 'react'

// Tải dữ liệu bất đồng bộ. `deps` là mảng giá trị nguyên thủy; đổi giá trị thì tải lại, kết quả của lần gọi cũ bị bỏ.
// Trong lúc chưa có kết quả cho khóa hiện tại, loading = true (không hiện dữ liệu của khóa trước).
export function useAsync(task, deps = []) {
  const [result, setResult] = useState({ token: null, data: undefined, error: null })
  const [nonce, setNonce] = useState(0)
  const latestTask = useRef(task)
  const token = `${JSON.stringify(deps)}#${nonce}`

  useEffect(() => { latestTask.current = task })

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => latestTask.current()).then(
      (data) => { if (active) setResult({ token, data, error: null }) },
      (error) => { if (active) setResult({ token, data: undefined, error }) },
    )
    return () => { active = false }
  }, [token])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const setData = useCallback((updater) => {
    setResult((current) => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater }))
  }, [])

  const loading = result.token !== token
  return { data: loading ? undefined : result.data, error: loading ? null : result.error, loading, reload, setData }
}
