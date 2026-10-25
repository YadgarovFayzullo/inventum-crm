import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
  resolve: { alias: { '@': '/src' } },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Библиотеки — отдельным долгоживущим чанком: при обновлении кода CRM браузер берёт их из кэша
        manualChunks: (id) => (id.includes('node_modules') && !id.includes('@fontsource') && !id.includes('@dicebear') ? 'vendor' : undefined),
      },
    },
  },
})
