import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/api/apps/tictactoe/proxy/',
  build: {
    outDir: 'build',
  },
})
