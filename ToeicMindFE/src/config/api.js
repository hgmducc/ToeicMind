const environment = import.meta.env ?? {}
const explicitBase = environment.VITE_API_BASE_URL?.trim()
const legacyBase = environment.VITE_API_URL?.trim()

// Local requests go through Vite's proxy. Keep the existing VITE_API_URL
// compatible with deployed builds without changing the developer's .env.
export const API_BASE_URL = (
  explicitBase || (environment.DEV ? '/api' : legacyBase || '/api')
).replace(/\/+$/, '')

export const API_TIMEOUT_MS = Number(environment.VITE_API_TIMEOUT_MS) || 60000
