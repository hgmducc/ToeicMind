import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: ExamsController, AttemptsController, MeController (dashboard). Đường dẫn không chứa /api (đã nằm ở API_BASE_URL).
export const getDashboard = (query = { days: 84, scoreLimit: 20 }) => api.get('/me/dashboard', query)

export const getExamSets = () => api.get('/exam-sets', { page: 1, pageSize: 100 })
export const getExams = (examSetId) => api.get('/exams', { examSetId, page: 1, pageSize: 100 })
export const getExamModes = (examId) => api.get(`/exams/${examId}/modes`)
export const getExamDirections = (examId) => api.get(`/exams/${examId}/directions`)
export const getExamPart = (examId, partNo, media = false) => api.get(`/exams/${examId}/parts/${partNo}`, { media: media ? 'true' : 'false' })
export const getExamPartMedia = (examId, partNo) => api.get(`/exams/${examId}/parts/${partNo}/media`)

export const startAttempt = (body) => api.post('/attempts', body)
export const getAttempts = (query) => api.get('/attempts', query)
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`)
// reveal = false (Luyện tập chưa hiện đáp án): chỉ lưu lựa chọn. Chỉ gửi trường này khi false để body mặc định giữ nguyên như cũ.
export const saveAnswer = (attemptId, questionId, optionId, reveal = true) =>
  api.put(`/attempts/${attemptId}/answers/${questionId}`, reveal ? { optionId } : { optionId, reveal: false })
export const addDirectionTime = (attemptId, seconds) => api.post(`/attempts/${attemptId}/direction-time`, { seconds })
export const submitAttempt = (attemptId) => api.post(`/attempts/${attemptId}/submit`)
export const abandonAttempt = (attemptId) => api.post(`/attempts/${attemptId}/abandon`)
export const deleteAttempt = (attemptId) => api.del(`/attempts/${attemptId}`)
export const getAttemptResult = (attemptId, includeReview = false) => api.get(`/attempts/${attemptId}/result`, { includeReview })

export const getVipStatus = () => api.get('/vip/me')
