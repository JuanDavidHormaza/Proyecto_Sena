import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // En Linux/Docker usamos el hostname de la red docker 'worklex_backend', en Windows host usamos 'localhost'
  const isLinuxContainer = process.platform === 'linux'
  const defaultTarget = isLinuxContainer ? 'http://worklex_backend:8000' : 'http://localhost:8000'
  const backendTarget = process.env.BACKEND_URL || env.BACKEND_URL || defaultTarget

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: false,
          secure: false,
          headers: {
            Host: 'localhost:8000',
          },
        }
      }
    }
  }
})

