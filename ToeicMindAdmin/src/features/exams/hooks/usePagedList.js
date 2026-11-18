import { useEffect, useState } from 'react'

export function usePagedList(loader, token, query, reload) {
  const key = JSON.stringify(query),
    requestKey = `${key}:${reload}:${token}`
  const [state, setState] = useState({ key: '', items: [], totalCount: 0, error: null })
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      loader(token, JSON.parse(key))
        .then((result) => {
          if (active) setState({ ...result, key: requestKey, error: null })
        })
        .catch((error) => {
          if (active) setState({ items: [], totalCount: 0, key: requestKey, error })
        })
    }, 200)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [loader, token, key, requestKey])
  return state.key === requestKey
    ? { ...state, loading: false }
    : { items: [], totalCount: 0, loading: true, error: null }
}
