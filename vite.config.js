import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Fannos Flight API requests to avoid CORS issues
      '/fannos': {
        target: 'http://3.11.26.231',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
