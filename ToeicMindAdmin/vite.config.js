import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const legacyUrl = env.VITE_API_URL
  const target = env.VITE_API_PROXY_TARGET || (legacyUrl?.startsWith('http') ? new URL(legacyUrl).origin : 'http://localhost:5078')
  const isLocalBackend = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname)

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          followRedirects: true,
          // ASP.NET's local HTTPS development certificate may be self-signed.
          secure: !isLocalBackend,
        },
      },
    },
  }
})
