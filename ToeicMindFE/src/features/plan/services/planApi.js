import { api } from '../../../lib/learnerHttp.js'

// Hợp đồng: MeController (profile, learning-plan) và PlacementController (CHG-007). Làm bài/kết quả kiểm tra đầu vào dùng /attempts như các bài khác.
export const getLearningPlan = () => api.get('/me/learning-plan')
export const getProfile = () => api.get('/me/profile')
export const saveProfile = (body) => api.put('/me/profile', body)
export const getPlacementStatus = () => api.get('/placement')
export const startPlacement = () => api.post('/placement/attempts')
