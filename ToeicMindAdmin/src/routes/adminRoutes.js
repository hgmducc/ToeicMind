export const ADMIN_ROUTES = Object.freeze({
  dashboard: '/dashboard', exams: '/exams', upload: '/exams/new', directions: '/directions',
  media: '/media', catalog: '/catalog', placement: '/placement-tests', grammar: '/grammar', listening: '/listening',
  users: '/users', vip: '/vip', reports: '/reports', user_info: '/account',
})

export function pathForView(view, examId) {
  if (view === 'upload' && examId != null) return `/exams/${encodeURIComponent(examId)}/edit`
  return ADMIN_ROUTES[view] || ADMIN_ROUTES.dashboard
}

export function viewForPath(pathname) {
  if (/^\/exams\/(new|[^/]+\/edit)\/?$/.test(pathname)) return 'upload'
  return Object.entries(ADMIN_ROUTES).find(([, path]) => path === pathname)?.[0] || 'dashboard'
}
