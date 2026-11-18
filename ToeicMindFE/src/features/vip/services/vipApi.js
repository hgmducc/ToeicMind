import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: VipController. Thanh toán qua VNPay: createVipOrder trả paymentUrl để chuyển trình duyệt sang cổng thanh toán.
export const getVipPlans = () => api.get('/vip/plans')
export const getVipStatus = () => api.get('/vip/me')
export const getVipOrders = () => api.get('/vip/orders', { page: 1, pageSize: 10 })
export const createVipOrder = (planCode) => api.post('/vip/orders', { planCode })
// Lịch sử VIP (mua gói / được quản trị viên tặng / bị thu hồi). Không kèm lý do nội bộ của quản trị viên.
export const getVipHistory = () => api.get('/vip/history')
