import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import license from "rollup-plugin-license";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), license({
    thirdParty: {
      output: {
        file: "THIRD_PARTY_LICENSES_WEB.txt",
        encoding: "utf-8"
      }
    }
  })],
  server: {
    port: 60145
  },
  resolve: {
    alias: {
      "@assets": "/src/assets",
      "@components": "/src/components",
      "@util": "/src/util",
      "@": "/src"
    }
  },
})
