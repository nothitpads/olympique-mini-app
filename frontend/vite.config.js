import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: [
        '16210d9a4ee0.ngrok-free.app',
        '7ff0288f7915.ngrok-free.app'
    ], } 
})
