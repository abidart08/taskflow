// tests/setup.ts
// Global test setup — runs before every test file

/// <reference types="vitest/globals" />
import { vi } from 'vitest'

// Reset all mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})
