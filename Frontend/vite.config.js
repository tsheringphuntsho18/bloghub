import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // When running locally in dev, we still listen on all interfaces so remote services (or Docker)
  // can reach the dev server if needed. For production preview (used by Render) we also
  // bind to 0.0.0.0 and respect the PORT env var.
  const port = Number(process.env.PORT) || 5173

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false
    },
    preview: {
      host: '0.0.0.0',
      port,
      strictPort: true
    }
  }
})
