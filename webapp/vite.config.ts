import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',         // ← use relative paths (fixes GitHub Pages 404s)
  plugins: [react()],
  root: '.',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
