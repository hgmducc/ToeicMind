import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: Controllers/VocabLearningController.cs và MeController.cs (từ vựng cá nhân).
export const getVocabOverview = () => api.get('/vocab/overview')
export const getVocabSetExams = (examSetId) => api.get(`/vocab/sets/${examSetId}/exams`)
export const getVocabWords = (query) => api.get('/vocab/words', query)
export const getStudySession = (query) => api.get('/vocab/study', query)
// grade: 0 Quên, 1 Khó, 2 Nhớ, 3 Dễ — máy chủ tính lịch ôn kế tiếp (SM-2 cải biên).
export const reviewVocab = (vocabId, grade) => api.post(`/vocab/${vocabId}/review`, { grade })

export const getMyVocab = (query) => api.get('/me/vocabulary', query)
export const saveMyVocab = (body) => api.post('/me/vocabulary', body)
export const deleteMyVocab = (userVocabId) => api.del(`/me/vocabulary/${userVocabId}`)
