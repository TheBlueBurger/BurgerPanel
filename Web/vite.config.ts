import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 55014
  },
  resolve: {
    alias: {
      "@assets": "/src/assets",
      "@components": "/src/components",
      "@util": "/src/util",
      "@": "/src"
    }
  }
})
