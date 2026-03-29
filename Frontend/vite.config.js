import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const port = Number(process.env.PORT) || 5173

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false,
      // Move allowedHosts inside the server object here
      allowedHosts: [
        'bloghub-wgow.onrender.com'
      ]
    },
    preview: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      // It's a good idea to add it here too if you're using 'vite preview'
      allowedHosts: [
        'bloghub-wgow.onrender.com'
      ]
    }
  }
})