import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { saveLastBank } from './bankSession.js'
import { startBankAttempt } from './services/bankApi.js'

// Bắt đầu một lượt học từ thẻ (NEW = câu chưa luyện, WRONG = câu sai, ALL = cả thẻ). Hết câu mới thì hỏi có làm lại toàn bộ không.
export function useStartBank() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  return useCallback(async function start(partNo, cardKey, pick, extra = {}) {
    const body = { partNo, cardKey, pick, ...extra }
    try {
      const attempt = await startBankAttempt(body)
      saveLastBank(body)
      navigate(paths.attempt(attempt.attemptId))
    } catch (error) {
      if (error.code === 'BANK_EMPTY') {
        if (pick === 'NEW' && await confirm({ title: 'Hết câu mới', message: 'Bạn đã luyện hết câu mới ở mục này. Làm lại toàn bộ các câu?', okLabel: 'Làm lại toàn bộ' })) return start(partNo, cardKey, 'ALL', extra)
        if (pick === 'WRONG') toast('Bạn chưa có câu sai nào ở mục này.')
        return undefined
      }
      if (error.code !== 'VIP_REQUIRED') toast(error.message, 'error', 5000)
      return undefined
    }
  }, [navigate, confirm, toast])
}
