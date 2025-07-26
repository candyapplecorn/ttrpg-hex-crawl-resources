import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

export default defineConfig({
  base: './',         // ← use relative paths (fixes GitHub Pages 404s)
  plugins: [react(),
    obfuscatorPlugin({
      exclude: [/node_modules/],
      apply: "build",
      debugger: true,
      options: {
        // your javascript-obfuscator options
        debugProtection: true,
        // ...  [See more options](https://github.com/javascript-obfuscator/javascript-obfuscator)
      },
    }),
  ],
  root: '.',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
