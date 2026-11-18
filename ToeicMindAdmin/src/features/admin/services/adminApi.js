import { deleteJson, getClientSession, getJson, postJson, putJson } from '../../../lib/apiClient.js'

const auth = (token) => {
  const t = token || getClientSession()?.accessToken
  return { headers: t ? { Authorization: `Bearer ${t}` } : {} }
}
const qs = (params) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

/* Người dùng */
export const getAdminUsers = (token, { page = 1, pageSize = 10, search, role, status } = {}) =>
  getJson(`/admin/users${qs({ page, pageSize, search: search?.trim(), role, status })}`, auth(token))
export const getAdminUsersSummary = (token) => getJson('/admin/users/summary', auth(token))
export const createAdminUser = (token, body) => postJson('/admin/users', body, auth(token))
export const changeAdminUserRole = (token, id, role) =>
  putJson(`/admin/users/${id}/role`, { role }, auth(token))
export const lockAdminUser = (token, id) => putJson(`/admin/users/${id}/status`, { status: 'LOCKED' }, auth(token))
export const unlockAdminUser = (token, id) => putJson(`/admin/users/${id}/status`, { status: 'ACTIVE' }, auth(token))
export const revokeAdminUserSessions = (token, id) =>
  postJson(`/admin/users/${id}/revoke-sessions`, {}, auth(token))
export const getAdminUserStats = (token, id) => getJson(`/admin/users/${id}/stats`, auth(token))
export const getAdminUserAttempts = (token, id, { page = 1, pageSize = 8 } = {}) =>
  getJson(`/admin/users/${id}/attempts${qs({ page, pageSize })}`, auth(token))

/* Thống kê: một lần gọi trả { summary, activity, popularExams, hardestQuestions } */
export const getAdminDashboard = (token, { days = 30, limit = 5, minAnswers = 5 } = {}) =>
  getJson(`/admin/dashboard${qs({ days, limit, minAnswers })}`, auth(token))

/* Báo lỗi */
export const getAdminReports = (token, { page = 1, pageSize = 10, status } = {}) =>
  getJson(`/admin/reports${qs({ page, pageSize, status })}`, auth(token))
export const updateAdminReport = (token, id, body) => putJson(`/admin/reports/${id}`, body, auth(token))

/* Media theo vị trí */
import { uploadMultipart } from '../../../lib/apiClient.js'

export const getMediaSlots = (token, examId) => getJson(`/admin/exams/${examId}/media-slots`, auth(token))

// uploadPath do backend trả về có thể bắt đầu bằng /api; apiClient đã có sẵn tiền tố đó.
export function uploadToSlot(token, slot, file) {
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase()
  const renamed = new File([file], slot.fileName + ext, { type: file.type })
  const data = new FormData()
  data.append('file', renamed)
  const path = slot.uploadPath.replace(/^\/api/, '')
  return uploadMultipart(`${path}${qs({ fileName: slot.fileName })}`, data, auth(token))
}

/* VIP: gói bán, đơn thanh toán, cấp/thu hồi thủ công */
export const getVipPlans = (token) => getJson('/admin/vip/plans', auth(token))
export const createVipPlan = (token, body) => postJson('/admin/vip/plans', body, auth(token))
export const updateVipPlan = (token, id, body) => putJson(`/admin/vip/plans/${id}`, body, auth(token))
export const getVipOrders = (token, { page = 1, pageSize = 10, status } = {}) =>
  getJson(`/admin/vip/orders${qs({ page, pageSize, status })}`, auth(token))
// Cộng thêm ngày (action GRANT, nối tiếp hạn hiện tại) hoặc thu hồi (REVOKE); bắt buộc lý do. Ghi vào lịch sử VIP, không tạo đơn thanh toán.
export const adjustUserVip = (token, userId, { action, days, reason }) =>
  putJson(`/admin/vip/users/${userId}`, action === 'GRANT' ? { action, days, reason } : { action, reason }, auth(token))
// Lịch sử VIP của một người dùng (mua gói, được tặng, bị thu hồi) kèm lý do và quản trị viên thực hiện.
export const getUserVipHistory = (token, userId) => getJson(`/admin/vip/users/${userId}/history`, auth(token))

/* Kiểm tra đầu vào (CHG-007): ghép bài từ nhóm câu của đề đã xuất bản, bật một bài cho người học */
export const getPlacementTests = (token) => getJson('/admin/placement-tests', auth(token))
export const getPlacementTest = (token, id) => getJson(`/admin/placement-tests/${id}`, auth(token))
export const savePlacementTest = (token, id, body) =>
  id ? putJson(`/admin/placement-tests/${id}`, body, auth(token)) : postJson('/admin/placement-tests', body, auth(token))
export const deletePlacementTest = (token, id) => deleteJson(`/admin/placement-tests/${id}`, auth(token))
export const getPlacementCandidates = (token, { page = 1, pageSize = 10, partNo, examId, levelNo, categoryId, search } = {}) =>
  getJson(`/admin/placement-tests/candidates${qs({ page, pageSize, partNo, examId, levelNo, categoryId, search: search?.trim() })}`, auth(token))
export const generatePlacement = (token, body) => postJson('/admin/placement-tests/generate', body, auth(token))

/* Bài ngữ pháp (UC-25): 15 chủ điểm cố định của Part 5, nhiều bài mỗi chủ điểm, xóa mềm/khôi phục */
export const getGrammarTopics = (token) => getJson('/admin/grammar-articles/topics', auth(token))
export const getGrammarArticles = (token, { page = 1, pageSize = 10, grammarTopicId, search, isDeleted } = {}) =>
  getJson(`/admin/grammar-articles${qs({ page, pageSize, grammarTopicId, search: search?.trim(), isDeleted: isDeleted || undefined })}`, auth(token))
export const getGrammarArticle = (token, id) => getJson(`/admin/grammar-articles/${id}`, auth(token))
export const saveGrammarArticle = (token, id, body) =>
  id ? putJson(`/admin/grammar-articles/${id}`, body, auth(token)) : postJson('/admin/grammar-articles', body, auth(token))
export const deleteGrammarArticle = (token, id) => deleteJson(`/admin/grammar-articles/${id}`, auth(token))
export const restoreGrammarArticle = (token, id) => postJson(`/admin/grammar-articles/${id}/restore`, {}, auth(token))

/* Bộ clip nghe sưu tầm (UC-28 TH2): không thuộc đề; xuất bản khi đã có loại bài, Level và ít nhất một clip */
export const getListeningItems = (token, { page = 1, pageSize = 10, partNo, isPublished, isDeleted, search } = {}) =>
  getJson(`/admin/listening-items${qs({ page, pageSize, partNo, isPublished, isDeleted: isDeleted || undefined, search: search?.trim() })}`, auth(token))
export const getListeningItem = (token, id) => getJson(`/admin/listening-items/${id}`, auth(token))
export const saveListeningItem = (token, id, body) =>
  id ? putJson(`/admin/listening-items/${id}`, body, auth(token)) : postJson('/admin/listening-items', body, auth(token))
export const setListeningItemPublished = (token, id, isPublished) => putJson(`/admin/listening-items/${id}/status`, { isPublished }, auth(token))
export const deleteListeningItem = (token, id) => deleteJson(`/admin/listening-items/${id}`, auth(token))
export const restoreListeningItem = (token, id) => postJson(`/admin/listening-items/${id}/restore`, {}, auth(token))
export const saveListeningClip = (token, itemId, clipId, body) =>
  clipId ? putJson(`/admin/listening-items/${itemId}/clips/${clipId}`, body, auth(token)) : postJson(`/admin/listening-items/${itemId}/clips`, body, auth(token))
export const deleteListeningClip = (token, itemId, clipId) => deleteJson(`/admin/listening-items/${itemId}/clips/${clipId}`, auth(token))
export function uploadListeningClipAudio(token, itemId, clipId, file) {
  const data = new FormData()
  data.append('file', file)
  return uploadMultipart(`/admin/listening-items/${itemId}/clips/${clipId}/media`, data, auth(token))
}
