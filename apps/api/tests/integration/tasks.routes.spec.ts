// tests/integration/tasks.routes.spec.ts
import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app'

// Mock TaskService: only mock the class, spread the real module to keep
// named exports (CreateTaskSchema, ValidationError imports, etc.) intact.
vi.mock('../../src/services/task.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/task.service')>()
  return {
    ...actual,
    TaskService: vi.fn().mockImplementation(() => ({
      createTask: vi.fn(),
      getTasks: vi.fn(),
      updateTask: vi.fn(),
    })),
  }
})

// Mock AuthService to control verifyToken inside the requireAuth middleware.
// The middleware instantiates AuthService at module load time, so the first
// mock.results entry is the instance used by every request.
vi.mock('../../src/services/auth.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/auth.service')>()
  return {
    ...actual,
    // verifyToken is set HERE in the factory (not in beforeEach) because
    // app.ts creates TWO AuthService instances: one in auth.routes.ts
    // (mock.results[0]) and another in auth.middleware.ts (mock.results[1]).
    // requireAuth uses the middleware instance. Setting the default in the
    // factory ensures EVERY instance returns valid auth automatically.
    AuthService: vi.fn().mockImplementation(() => ({
      register: vi.fn(),
      login: vi.fn(),
      verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
    })),
  }
})

import { TaskService } from '../../src/services/task.service'
import { ValidationError } from '../../src/services/auth.service'

// ── App and helpers ─────────────────────────────────────────────
const VALID_TOKEN = 'Bearer valid.jwt.token'
const app = createApp()

function getTaskServiceMock() {
  return (TaskService as any).mock.results[0].value
}

// vi.clearAllMocks() (setup.ts afterEach) wipes mock.results after every test.
// Capturing in beforeAll keeps the reference valid for the whole suite.
let taskServiceMock: ReturnType<typeof getTaskServiceMock>

beforeAll(() => {
  taskServiceMock = getTaskServiceMock()
})

// ════════════════════════════════════════════════════════════════
// POST /projects/:projectId/tasks
// ════════════════════════════════════════════════════════════════
describe('POST /projects/:projectId/tasks', () => {

  it('201 — crea tarea y devuelve el objeto creado', async () => {
    const createdTask = {
      id: 'task-1',
      title: 'Test task',
      description: 'A description',
      status: 'TODO',
      priority: 'MEDIUM',
      projectId: 'proj-1',
      assignedTo: null,
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    taskServiceMock.createTask.mockResolvedValue(createdTask)

    const res = await request(app)
      .post('/projects/proj-1/tasks')
      .set('Authorization', VALID_TOKEN)
      .send({ title: 'Test task', description: 'A description', priority: 'MEDIUM' })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('task-1')
    expect(res.body.title).toBe('Test task')
    expect(res.body.status).toBe('TODO')
  })

  it('400 — título vacío lanza ValidationError', async () => {
    taskServiceMock.createTask.mockRejectedValue(
      new ValidationError('Title cannot be empty or contain only whitespace')
    )

    const res = await request(app)
      .post('/projects/proj-1/tasks')
      .set('Authorization', VALID_TOKEN)
      .send({ title: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/empty|whitespace|validation/i)
  })

  it('401 — sin token devuelve 401', async () => {
    const res = await request(app)
      .post('/projects/proj-1/tasks')
      .send({ title: 'Should not be created' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })
})

// ════════════════════════════════════════════════════════════════
// GET /projects/:projectId/tasks
// ════════════════════════════════════════════════════════════════
describe('GET /projects/:projectId/tasks', () => {

  it('200 — retorna array con las tareas del proyecto', async () => {
    const taskList = [
      {
        id: 'task-1',
        title: 'Primera tarea',
        status: 'TODO',
        priority: 'HIGH',
        projectId: 'proj-1',
        assignee: null,
      },
      {
        id: 'task-2',
        title: 'Segunda tarea',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        projectId: 'proj-1',
        assignee: { id: 'user-1', email: 'user@test.com', name: 'User' },
      },
    ]
    taskServiceMock.getTasks.mockResolvedValue(taskList)

    const res = await request(app)
      .get('/projects/proj-1/tasks')
      .set('Authorization', VALID_TOKEN)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].title).toBe('Primera tarea')
    expect(res.body[1].status).toBe('IN_PROGRESS')
  })

  it('401 — sin token devuelve 401', async () => {
    const res = await request(app).get('/projects/proj-1/tasks')

    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })
})
