import { deleteJson, getClientSession, getJson, postJson, putJson, uploadMultipart } from '../../../lib/apiClient.js'

function authHeader(accessToken) {
  const token = accessToken || getClientSession()?.accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Chỉ gửi bốn trường quyền hợp lệ của bộ đề (FREE/VIP); thiếu thì server dùng FREE.
function setAccess(source) {
  const out = {}
  for (const key of ['examAccess', 'vocabAccess', 'listeningAccess', 'readingAccess']) if (source[key]) out[key] = source[key]
  return out
}

export async function getAllExamSets(accessToken) {
  const items = []
  for (let page = 1; ; page++) {
    const result = await getAdminExamSets(accessToken, { page, pageSize: 100 })
    items.push(...result.items)
    if (items.length >= result.totalCount || !result.items.length) return items
  }
}

export function saveExamContent(accessToken, examId, data) {
  const options = { headers: authHeader(accessToken), timeoutMs: 120000 }
  return examId
    ? putJson(`/admin/exams/${examId}/content`, data, options)
    : postJson('/admin/exams/import', data, options)
}

export const getImportSource = (token, id) =>
  getJson(`/admin/exams/${id}/import-source`, { headers: authHeader(token), timeoutMs: 120000 })

export function uploadSegmentMedia(token, examId, groupId, clipId, file) {
  const data = new FormData()
  data.append('file', file)
  return uploadMultipart(`/admin/exams/${examId}/groups/${groupId}/segments/${clipId}/media`, data, {
    headers: authHeader(token),
  })
}

export const saveDirection = (token, id, data) =>
  id
    ? putJson(`/admin/directions/${id}`, data, { headers: authHeader(token) })
    : postJson('/admin/directions', data, { headers: authHeader(token) })

export const seedDefaultDirections = (token) =>
  postJson('/admin/directions/seed', {}, { headers: authHeader(token) })

export function uploadDirectionMedia(token, id, file) {
  const data = new FormData()
  data.append('file', file)
  return uploadMultipart(`/admin/directions/${id}/media`, data, { headers: authHeader(token) })
}

/**
 * E01. GET /api/exam-catalogs
 * Lấy danh mục Parts, Levels, Categories (phân loại) và Special Tags
 */
export async function getExamCatalog(accessToken) {
  return getJson('/exam-catalogs', { headers: authHeader(accessToken) })
}

/**
 * E06. GET /api/admin/exam-sets
 * Danh sách bộ đề Admin
 */
export async function getAdminExamSets(
  accessToken,
  { page = 1, pageSize = 20, search = '', isDeleted = false } = {},
) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    isDeleted: String(isDeleted),
  })
  if (search?.trim()) {
    query.set('search', search.trim())
  }
  return getJson(`/admin/exam-sets?${query}`, { headers: authHeader(accessToken) })
}

/**
 * E08. POST /api/admin/exam-sets
 * Tạo bộ đề mới
 */
export async function createAdminExamSet(accessToken, { name, description, ...access }) {
  return postJson('/admin/exam-sets', { name, description, ...setAccess(access) }, { headers: authHeader(accessToken) })
}

/**
 * E09. PUT /api/admin/exam-sets/{id}
 * Cập nhật bộ đề
 */
export async function updateAdminExamSet(accessToken, id, { name, description, ...access }) {
  return putJson(`/admin/exam-sets/${id}`, { name, description, ...setAccess(access) }, { headers: authHeader(accessToken) })
}

/**
 * E10. DELETE /api/admin/exam-sets/{id}
 * Xóa mềm bộ đề (chỉ khi không còn đề chưa xóa)
 */
export async function deleteAdminExamSet(accessToken, id) {
  return deleteJson(`/admin/exam-sets/${id}`, { headers: authHeader(accessToken) })
}

/**
 * E11. POST /api/admin/exam-sets/{id}/restore
 */
export async function restoreAdminExamSet(accessToken, id) {
  return postJson(`/admin/exam-sets/${id}/restore`, {}, { headers: authHeader(accessToken) })
}

/**
 * E12. GET /api/admin/exams
 * Danh sách đề thi Admin
 */
export async function getAdminExams(
  accessToken,
  { examSetId, status, isDeleted = false, page = 1, pageSize = 20, search = '' } = {},
) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    isDeleted: String(isDeleted),
  })
  if (examSetId) query.set('examSetId', String(examSetId))
  if (status) query.set('status', status)
  if (search?.trim()) query.set('search', search.trim())

  return getJson(`/admin/exams?${query}`, { headers: authHeader(accessToken) })
}

/**
 * E13. GET /api/admin/exams/{id}
 */
export async function getAdminExam(accessToken, id) {
  return getJson(`/admin/exams/${id}`, { headers: authHeader(accessToken), timeoutMs: 60000 })
}

/**
 * E14. POST /api/admin/exams
 * Tạo đề thi nháp (DRAFT)
 */
export async function createAdminExam(accessToken, { examSetId, examCode, title, description, accessLevel }) {
  const body = { examSetId: Number(examSetId), title: title.trim(), accessLevel: accessLevel || null }
  if (examCode?.trim()) body.examCode = examCode.trim()
  if (description?.trim()) body.description = description.trim()

  return postJson('/admin/exams', body, { headers: authHeader(accessToken) })
}

/**
 * E15. PUT /api/admin/exams/{id}
 * Cập nhật metadata đề thi
 */
export async function updateAdminExam(accessToken, id, { examSetId, examCode, title, description, accessLevel }) {
  const body = { examSetId: Number(examSetId), title: title.trim(), accessLevel: accessLevel || null }
  if (examCode?.trim()) body.examCode = examCode.trim()
  if (description?.trim()) body.description = description.trim()

  return putJson(`/admin/exams/${id}`, body, { headers: authHeader(accessToken) })
}

/**
 * E16. DELETE /api/admin/exams/{id}
 */
export async function deleteAdminExam(accessToken, id) {
  return deleteJson(`/admin/exams/${id}`, { headers: authHeader(accessToken) })
}

/**
 * E17. POST /api/admin/exams/{id}/restore
 */
export async function restoreAdminExam(accessToken, id) {
  return postJson(`/admin/exams/${id}/restore`, {}, { headers: authHeader(accessToken) })
}

/**
 * E18. GET /api/admin/exams/{examId}/groups
 * Lấy danh sách nhóm câu hỏi của đề (kèm câu hỏi, đáp án, media)
 */
export async function getAdminExamGroups(accessToken, examId, partNo = null) {
  const query = partNo ? `?partNo=${partNo}` : ''
  return getJson(`/admin/exams/${examId}/groups${query}`, { headers: authHeader(accessToken), timeoutMs: 120000 })
}

/**
 * E28. POST /api/admin/exams/{examId}/groups/{groupId}/media
 * Upload file audio/image cho nhóm
 */
export async function uploadGroupMedia(
  accessToken,
  examId,
  groupId,
  file,
  { sortOrder = 1, altText = '' } = {},
) {
  const formData = new FormData()
  formData.append('file', file)

  const query = new URLSearchParams()
  if (sortOrder) query.set('sortOrder', String(sortOrder))
  if (altText?.trim()) query.set('altText', altText.trim())

  const queryString = query.toString() ? `?${query.toString()}` : ''
  return uploadMultipart(`/admin/exams/${examId}/groups/${groupId}/media${queryString}`, formData, {
    headers: authHeader(accessToken),
  })
}

/**
 * E30. GET /api/admin/media/{id}/url
 * Lấy URL ký Cloudflare R2 để nghe/xem trước
 */
export async function getSignedMediaUrl(accessToken, mediaId) {
  return getJson(`/admin/media/${mediaId}/url`, { headers: authHeader(accessToken) })
}

/**
 * E31. DELETE /api/admin/media/{id}
 */
export async function deleteMedia(accessToken, mediaId) {
  return deleteJson(`/admin/media/${mediaId}`, { headers: authHeader(accessToken) })
}

/**
 * E32. GET /api/admin/exams/{examId}/publish-check
 * Kiểm tra các điều kiện xuất bản đề thi
 */
export async function checkPublishExam(accessToken, examId) {
  return getJson(`/admin/exams/${examId}/publish-check`, { headers: authHeader(accessToken), timeoutMs: 60000 })
}

/**
 * E33. PUT /api/admin/exams/{examId}/status { status: 'PUBLISHED' }
 * Xuất bản đề thi (DRAFT -> PUBLISHED)
 */
export async function publishExam(accessToken, examId) {
  return putJson(`/admin/exams/${examId}/status`, { status: 'PUBLISHED' }, { headers: authHeader(accessToken) })
}

/**
 * E34. PUT /api/admin/exams/{examId}/status { status: 'DRAFT' }
 * Đưa đề thi về bản nháp (PUBLISHED -> DRAFT)
 */
export async function unpublishExam(accessToken, examId) {
  return putJson(`/admin/exams/${examId}/status`, { status: 'DRAFT' }, { headers: authHeader(accessToken) })
}

/**
 * E24. GET /api/admin/directions
 */
export async function getAdminDirections(accessToken, { examId = null, effective = true } = {}) {
  const query = new URLSearchParams({ effective: String(effective) })
  if (examId) query.set('examId', String(examId))
  return getJson(`/admin/directions?${query}`, { headers: authHeader(accessToken) })
}
