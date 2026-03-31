// src/services/__tests__/task.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { TaskService } from '../../src/services/task.service'
import { ValidationError, UnprocessableError } from '../../src/services/auth.service'

// ── Mock PrismaClient ────────────────────────────────────────────
const mockDb = {
  task: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  statusHistory: { create: vi.fn() },
  projectMember: { findUnique: vi.fn() },
}

const taskService = new TaskService(mockDb as any)

// ════════════════════════════════════════════════════════════════
// Ejercicio 1: validateTitle
// ════════════════════════════════════════════════════════════════
describe('TaskService.validateTitle', () => {

  it('rechaza título con menos de 3 caracteres', () => {
    expect(() => taskService.validateTitle('ab')).toThrow(ValidationError)
  })

  it('rechaza título con más de 100 caracteres', () => {
    expect(() => taskService.validateTitle('a'.repeat(101))).toThrow(ValidationError)
  })

  it('rechaza título vacío', () => {
    expect(() => taskService.validateTitle('')).toThrow(ValidationError)
  })

  it('rechaza título con solo espacios', () => {
    expect(() => taskService.validateTitle('   ')).toThrow(ValidationError)
  })

  it('acepta título válido', () => {
    expect(() => taskService.validateTitle('Valid title')).not.toThrow()
  })

  it('acepta título de exactamente 3 caracteres', () => {
    expect(() => taskService.validateTitle('abc')).not.toThrow()
  })

  it('acepta título de exactamente 100 caracteres', () => {
    expect(() => taskService.validateTitle('a'.repeat(100))).not.toThrow()
  })
})

// ════════════════════════════════════════════════════════════════
// Ejercicio 2: validateStatusTransition
// ════════════════════════════════════════════════════════════════
describe('TaskService.validateStatusTransition', () => {

  it('TODO → IN_PROGRESS es válido', () => {
    expect(() => taskService.validateStatusTransition('TODO', 'IN_PROGRESS')).not.toThrow()
  })

  it('IN_PROGRESS → DONE es válido', () => {
    expect(() => taskService.validateStatusTransition('IN_PROGRESS', 'DONE')).not.toThrow()
  })

  it('TODO → DONE es inválido', () => {
    expect(() => taskService.validateStatusTransition('TODO', 'DONE')).toThrow(UnprocessableError)
  })

  it('IN_PROGRESS → TODO es inválido', () => {
    expect(() => taskService.validateStatusTransition('IN_PROGRESS', 'TODO')).toThrow(UnprocessableError)
  })

  it('DONE → TODO es inválido', () => {
    expect(() => taskService.validateStatusTransition('DONE', 'TODO')).toThrow(UnprocessableError)
  })

  it('DONE → IN_PROGRESS es inválido', () => {
    expect(() => taskService.validateStatusTransition('DONE', 'IN_PROGRESS')).toThrow(UnprocessableError)
  })

  it('mismo estado (TODO → TODO) es inválido', () => {
    expect(() => taskService.validateStatusTransition('TODO', 'TODO')).toThrow(UnprocessableError)
  })
})
