import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to your GitHub repo name, e.g. '/7g-wiki/'
// Change this to match your GitHub Pages repo name
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base,
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
