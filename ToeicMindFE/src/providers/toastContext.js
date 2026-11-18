import { createContext, useContext } from 'react'

export const ToastContext = createContext(() => {})

// toast(message, kind = 'info' | 'success' | 'error', ms)
export const useToast = () => useContext(ToastContext)
