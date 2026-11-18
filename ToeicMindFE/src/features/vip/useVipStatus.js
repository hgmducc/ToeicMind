import { useAsync } from '../../hooks/useAsync.js'
import { getVipStatus } from './services/vipApi.js'

// Trạng thái VIP của người dùng hiện tại ({ isVip, isAdmin, expiresAt, daysLeft }) hoặc null khi chưa biết/lỗi.
// `refreshKey` đổi thì tải lại (ví dụ khi vào các trang /vip sau khi thanh toán).
export function useVipStatus(refreshKey) {
  const { data } = useAsync(() => getVipStatus().catch(() => null), [refreshKey])
  return data ?? null
}
