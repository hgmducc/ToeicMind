import { createContext, useContext } from 'react'

export const ConfirmContext = createContext(() => Promise.resolve(false))

// const ok = await confirm({ title, message, okLabel, cancelLabel, danger })
export const useConfirm = () => useContext(ConfirmContext)
