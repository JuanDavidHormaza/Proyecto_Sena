import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En Linux/Docker usamos el hostname de la red docker 'worklex_backend', en Windows host usamos 'localhost'
  const isLinuxContainer = process.platform === 'linux';
  const defaultTarget = isLinuxContainer ? 'http://worklex_backend:8000' : 'http://localhost:8000';
  const backendTarget = process.env.BACKEND_URL || env.BACKEND_URL || defaultTarget;

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@tabler/icons-react')) {
                return 'tabler-icons';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react-router')) {
                return 'vendor';
              }
              return 'libs';
            }
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      hmr: {
        host: 'worklexsena.shop',
        clientPort: 443,
        protocol: 'wss',
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: false,
          secure: false,
          headers: {
            Host: 'localhost:8000',
          },
        },
      },
    },
  };
});
