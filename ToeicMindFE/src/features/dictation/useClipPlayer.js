import { useCallback, useEffect, useRef, useState } from 'react'

// Phát từng clip bằng một thẻ Audio: tốc độ, tua, tiến độ; báo khi hết hoặc lỗi.
export function useClipPlayer(rate) {
  const ref = useRef({ audio: null, token: 0 })
  const rateRef = useRef(rate)
  const [state, setState] = useState({ playing: false, progress: 0 })

  useEffect(() => {
    rateRef.current = rate
    if (ref.current.audio) ref.current.audio.playbackRate = rate
  }, [rate])

  const stop = useCallback(() => {
    const current = ref.current
    current.token++
    if (current.audio) { current.audio.onended = current.audio.onerror = current.audio.ontimeupdate = null; current.audio.pause(); current.audio = null }
    setState({ playing: false, progress: 0 })
  }, [])

  const play = useCallback((url, { onEnd, onError } = {}) => {
    stop()
    if (!url) { onError?.(new Error('NO_AUDIO')); return }
    const current = ref.current
    const mine = current.token
    const audio = new Audio(url)
    audio.playbackRate = rateRef.current
    current.audio = audio
    audio.onended = () => { if (mine !== current.token) return; setState({ playing: false, progress: 1 }); onEnd?.() }
    audio.onerror = () => { if (mine === current.token) { setState({ playing: false, progress: 0 }); onError?.(new Error('AUDIO_ERROR')) } }
    audio.ontimeupdate = () => { if (mine === current.token && audio.duration) setState({ playing: !audio.paused, progress: audio.currentTime / audio.duration }) }
    audio.play().then(() => { if (mine === current.token) setState((s) => ({ ...s, playing: true })) }).catch(() => { if (mine === current.token) setState((s) => ({ ...s, playing: false })) })
  }, [stop])

  const toggle = useCallback(() => {
    const audio = ref.current.audio
    if (!audio || audio.ended) return false
    if (audio.paused) { audio.play(); setState((s) => ({ ...s, playing: true })) } else { audio.pause(); setState((s) => ({ ...s, playing: false })) }
    return true
  }, [])

  const seek = useCallback((ratio) => {
    const audio = ref.current.audio
    if (audio?.duration) audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration
  }, [])

  useEffect(() => stop, [stop])
  return { ...state, play, stop, toggle, seek }
}
