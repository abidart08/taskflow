// tests/integration/auth.routes.spec.ts
import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'

// In a real project these tests run against a test database.
// Here we mock the services to keep tests fast and isolated.
// Integration tests with a real DB go in tests/integration/db/ using Testcontainers.

vi.mock('../../src/services/auth.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.service')>()
  return {
    ...actual,
    AuthService: vi.fn().mockImplementation(() => ({
      register: vi.fn(),
      login: vi.fn(),
      verifyToken: vi.fn(),
    })),
  }
})

import { AuthService, ConflictError, UnauthorizedError } from '../../src/services/auth.service'

const app = createApp()

function getAuthServiceMock() {
  return (AuthService as any).mock.results[0].value
}

// vi.clearAllMocks() (setup.ts afterEach) wipes mock.results after every test,
// making mock.results[0] undefined from the 2nd test onward.
// Capturing the reference in beforeAll keeps it valid for the whole suite.
let authServiceMock: ReturnType<typeof getAuthServiceMock>

beforeAll(() => {
  authServiceMock = getAuthServiceMock()
})

// ════════════════════════════════════════════════════════════════
// POST /auth/register
// ════════════════════════════════════════════════════════════════
describe('POST /auth/register', () => {

  it('201 — registro exitoso devuelve user y token', async () => {
    authServiceMock.register.mockResolvedValue({
      user: { id: 'user-1', email: 'ana@test.com', name: 'Ana' },
      token: 'jwt.token.here',
    })

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ana@test.com', password: 'Password1', name: 'Ana' })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('ana@test.com')
  })

  it('409 — email ya registrado', async () => {
    authServiceMock.register.mockRejectedValue(
      new ConflictError('Email already registered')
    )

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ana@test.com', password: 'Password1' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already registered/i)
  })

  it('400 — password débil', async () => {
    authServiceMock.register.mockRejectedValue(
      Object.assign(new Error('Validation error'), { statusCode: 400 })
    )

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ana@test.com', password: 'weak' })

    expect(res.status).toBe(400)
  })

  it('400 — email con formato inválido', async () => {
    authServiceMock.register.mockRejectedValue(
      Object.assign(new Error('Invalid email format'), { statusCode: 400 })
    )

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'notanemail', password: 'Password1' })

    expect(res.status).toBe(400)
  })
})

// ════════════════════════════════════════════════════════════════
// POST /auth/login
// ════════════════════════════════════════════════════════════════
describe('POST /auth/login', () => {

  it('200 — login exitoso devuelve token', async () => {
    authServiceMock.login.mockResolvedValue({
      user: { id: 'user-1', email: 'ana@test.com', name: 'Ana' },
      token: 'jwt.token.here',
    })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'Password1' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('401 — credenciales incorrectas', async () => {
    authServiceMock.login.mockRejectedValue(
      new UnauthorizedError('Invalid credentials')
    )

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'Wrong1234' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid credentials/i)
  })

  it('401 — cuenta bloqueada', async () => {
    authServiceMock.login.mockRejectedValue(
      new UnauthorizedError('Account locked. Try again in 14 minutes')
    )

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@test.com', password: 'Password1' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/locked/i)
  })

  it('401 — endpoint de proyectos sin token devuelve 401', async () => {
    const res = await request(app).get('/projects')
    expect(res.status).toBe(401)
  })
})
