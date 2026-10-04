import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly instead of silently moving to 5174 (the server only trusts FRONTEND_URL)
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
});