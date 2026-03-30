import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const port = Number(process.env.PORT) || 5173

  const allowed = process.env.VITE_ALLOWED_HOSTS ? process.env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()) : ['localhost']

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false,
      allowedHosts: allowed
    },
    preview: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      allowedHosts: allowed
    }
  }
})