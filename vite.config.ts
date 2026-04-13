/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '/breeding-game/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'lab.html'),
        popgen: resolve(__dirname, 'popgen.html'),
        linkage: resolve(__dirname, 'linkage.html'),
        modules: resolve(__dirname, 'modules.html'),
        molbio: resolve(__dirname, 'molbio.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
