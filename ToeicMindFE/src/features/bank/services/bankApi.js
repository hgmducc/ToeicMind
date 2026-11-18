import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: BankController và GrammarController.
export const getBankCards = (partNo, query) => api.get(`/bank/parts/${partNo}/cards`, query)
export const startBankAttempt = (body) => api.post('/bank/attempts', body)
export const resetBankCard = (partNo, cardKey) => api.del(`/bank/parts/${partNo}/cards/${encodeURIComponent(cardKey)}/progress`)
export const getGrammarTopics = (query) => api.get('/grammar/topics', query)
