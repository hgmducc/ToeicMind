import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: DictationController (danh sách công khai; chi tiết bộ clip và ghi tiến độ cần đăng nhập).
export const getDictationSets = () => api.get('/dictation/sets')
export const getDictationExams = (examSetId) => api.get(`/dictation/sets/${examSetId}/exams`)
export const getDictationTopics = (partNo) => api.get('/dictation/topics', { partNo })
export const getDictationItems = (query) => api.get('/dictation/items', query)
export const getDictationItem = (itemId) => api.get(`/dictation/items/${itemId}`)
export const saveDictationProgress = (itemId, body) => api.post(`/dictation/items/${itemId}/progress`, body)
