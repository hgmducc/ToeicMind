import { useStoredState } from '../../../hooks/useStoredState.js'

export function useStudyPanels() {
  const [open, setOpen] = useStoredState('toeicmind_fe_study_panels', { transcript: false, explain: true, vocab: false })
  const toggle = (key) => (value) => setOpen((current) => ({ ...current, [key]: value }))
  return { open, toggle }
}
