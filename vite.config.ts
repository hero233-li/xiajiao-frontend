import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 开发时把 /api 代理到真实后端，浏览器侧保持同源，无需后端开 CORS。
// 默认指向线上；要打本地后端就设 API_PROXY_TARGET=http://127.0.0.1:8080。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'https://xiajiao.cloud';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/exam-countdown-source': {
          target: 'https://ce.sjtu.edu.cn',
          changeOrigin: true,
          rewrite: () => '/',
        },
      },
    },
  };
});
