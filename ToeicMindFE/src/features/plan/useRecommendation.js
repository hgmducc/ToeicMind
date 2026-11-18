import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStartBank } from '../bank/useStartBank.js'
import { recommendationTarget } from './planModel.js'

// Mở một gợi ý: điều hướng tới trang đích, bắt đầu lượt ngân hàng câu hỏi, hoặc gọi onProfile (mở hộp mục tiêu).
export function useRecommendation(onProfile) {
  const navigate = useNavigate()
  const startBank = useStartBank()
  return useCallback(async (recommendation) => {
    const target = recommendationTarget(recommendation.action)
    if (target.kind === 'profile') return onProfile?.()
    if (target.kind === 'bank') return startBank(target.partNo, target.cardKey, target.pick)
    navigate(target.to)
    return undefined
  }, [navigate, startBank, onProfile])
}
