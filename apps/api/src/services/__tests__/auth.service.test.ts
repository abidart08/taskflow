// src/services/__tests__/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../auth.service'

// ── Mock PrismaClient ────────────────────────────────────────────
const mockDb = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}

const authService = new AuthService(mockDb as any)

// ════════════════════════════════════════════════════════════════
// Ejercicio 3: handleFailedLogin
// ════════════════════════════════════════════════════════════════
describe('AuthService.handleFailedLogin', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.user.update.mockResolvedValue({})
  })

  it('1er intento fallido: no bloquea', async () => {
    mockDb.user.findUnique.mockResolvedValue({ failedLogins: 0, lockedUntil: null })

    await authService.handleFailedLogin('user-1')

    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLogins: 1, lockedUntil: null }),
      })
    )
  })

  it('4to intento fallido: no bloquea', async () => {
    mockDb.user.findUnique.mockResolvedValue({ failedLogins: 3, lockedUntil: null })

    await authService.handleFailedLogin('user-1')

    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLogins: 4, lockedUntil: null }),
      })
    )
  })

  // BUG-05: Este test DEBE FALLAR con el código actual.
  // El código usa > en lugar de >=, por lo que el 5to intento NO bloquea.
  it('5to intento fallido: bloquea la cuenta', async () => {
    mockDb.user.findUnique.mockResolvedValue({ failedLogins: 4, lockedUntil: null })

    await authService.handleFailedLogin('user-1')

    const updateCall = mockDb.user.update.mock.calls[0][0]
    expect(updateCall.data.failedLogins).toBe(5)
    expect(updateCall.data.lockedUntil).not.toBeNull()
  })

  it('6to intento: ya bloqueada, no incrementa el contador', async () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000)
    mockDb.user.findUnique.mockResolvedValue({ failedLogins: 5, lockedUntil: futureDate })

    await authService.handleFailedLogin('user-1')

    expect(mockDb.user.update).not.toHaveBeenCalled()
  })
})
