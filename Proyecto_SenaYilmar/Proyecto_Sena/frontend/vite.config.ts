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
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('react-router-dom') ||
                id.includes('scheduler')
              ) {
                return 'vendor-react';
              }
              if (id.includes('@tabler/icons-react') || id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              return 'vendor-common';
            }
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tabler/icons-react',
        'lucide-react',
        'motion/react',
      ],
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
