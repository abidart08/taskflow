import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'src/index.ts',
        'src/app.ts',
        'src/prisma/**',
        'src/routes/**',
        'src/middleware/**',
        'src/services/comment.service.ts',
        'src/services/project.service.ts',
        'dist/**',
        '**/*.d.ts',
      ],
    },
    setupFiles: ['./tests/setup.ts'],
  },
})
