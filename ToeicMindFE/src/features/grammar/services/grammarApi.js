import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: GrammarController (UC-18). Mỗi chủ điểm một bài học; article null = "Đang cập nhật".
export const getGrammarTopicArticle = (grammarTopicId) => api.get(`/grammar/topics/${grammarTopicId}/article`)
