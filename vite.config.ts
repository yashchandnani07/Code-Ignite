import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { expressDevServerPlugin } from './src/dev-server-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), expressDevServerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Monaco's worker files break the dep optimizer in rolldown-vite.
  // Excluding it lets the new URL() + new Worker() pattern work correctly.
  optimizeDeps: {
    exclude: ['monaco-editor'],
  },
  worker: {
    format: 'es',
  },
})
