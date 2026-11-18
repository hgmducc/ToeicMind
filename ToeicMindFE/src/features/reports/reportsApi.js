import { api } from '../../lib/learnerHttp.js'

// Hợp đồng: ReportsController. Báo lỗi đúng một đối tượng (questionId, vocabId, articleId hoặc listeningItemId theo targetType).
export const createReport = (body) => api.post('/reports', body)
export const getMyReports = (query) => api.get('/reports', query)
