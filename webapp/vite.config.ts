import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',              // where your src/index.html lives
  build: {
    outDir: '../docs',         // relative to the root of the repo
    emptyOutDir: true,         // clear out docs/ on each build
  },
})
