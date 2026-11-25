import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  envDir: false,
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    maxWorkers: 1,
    fileParallelism: false,
  },
})
