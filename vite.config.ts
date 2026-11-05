import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose YOUR_* vars from .env.local to the client (Vite only exposes VITE_* by default).
  envPrefix: ['VITE_', 'YOUR_'],
})
