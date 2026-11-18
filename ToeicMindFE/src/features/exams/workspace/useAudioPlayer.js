import { useCallback, useEffect, useRef, useState } from 'react'
import { useStoredState } from '../../../hooks/useStoredState.js'
import { RATES } from './studyModel.js'

// Phát danh sách audio của một nhóm câu (Luyện tập): tự phát khi mở nhóm (trình duyệt chặn thì chờ bấm), tua, nghe lại, tốc độ (được nhớ).
// Link ký hết hạn → gọi onError một lần để lấy link mới.
export function useAudioPlayer(urls, { autoPlay = true, onError } = {}) {
  const [rate, setRate] = useStoredState('toeicmind_fe_audio_rate', 1)
  const [state, setState] = useState({ playing: false, current: 0, duration: 0, blocked: false })
  const audio = useRef(null)
  const index = useRef(0)
  const failed = useRef(false)
  const key = urls.join('|')
  const latest = useRef({ rate, onError })
  useEffect(() => { latest.current = { rate, onError } })

  useEffect(() => {
    if (!urls.length) return undefined
    const element = new Audio()
    audio.current = element
    index.current = 0
    failed.current = false
    const load = (i) => { element.src = urls[i]; element.playbackRate = RATES.includes(latest.current.rate) ? latest.current.rate : 1 }
    const play = () => element.play()?.catch?.((error) => setState((s) => ({ ...s, playing: false, blocked: error?.name === 'NotAllowedError' })))
    element.ontimeupdate = () => setState((s) => ({ ...s, current: element.currentTime, duration: element.duration || s.duration }))
    element.onloadedmetadata = () => setState((s) => ({ ...s, duration: element.duration || 0 }))
    element.onplay = () => setState((s) => ({ ...s, playing: true, blocked: false }))
    element.onpause = () => setState((s) => ({ ...s, playing: false }))
    element.onended = () => {
      if (index.current + 1 < urls.length) { index.current += 1; load(index.current); play() } else setState((s) => ({ ...s, playing: false, current: s.duration }))
    }
    element.onerror = () => { if (!failed.current) { failed.current = true; latest.current.onError?.() } }
    load(0)
    if (autoPlay) play()
    return () => { element.pause(); element.ontimeupdate = element.onended = element.onerror = element.onplay = element.onpause = element.onloadedmetadata = null; audio.current = null }
    // Danh sách URL thay đổi (nhóm mới hoặc link mới) thì tạo trình phát mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, autoPlay])

  const toggle = useCallback(() => {
    const element = audio.current
    if (!element) return
    if (element.paused) element.play()?.catch?.(() => {}); else element.pause()
  }, [])
  const seek = useCallback((seconds) => { const element = audio.current; if (element) element.currentTime = Math.max(0, seconds) }, [])
  const back = useCallback((seconds) => { const element = audio.current; if (element) element.currentTime = Math.max(0, element.currentTime - seconds) }, [])
  const replay = useCallback(() => {
    const element = audio.current
    if (!element) return
    if (index.current !== 0) { index.current = 0; element.src = urls[0] }
    element.currentTime = 0
    element.play()?.catch?.(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const changeRate = useCallback((value) => { setRate(value); if (audio.current) audio.current.playbackRate = value }, [setRate])

  return { ...state, rate, hasAudio: urls.length > 0, toggle, seek, back, replay, setRate: changeRate }
}
