import { PrismaClient, Status, Priority } from '@prisma/client'
import { z } from 'zod'
import { ForbiddenError, NotFoundError, UnprocessableError, ValidationError } from './auth.service'

export const CreateTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  assignedTo: z.string().cuid().optional(),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

// Valid state transitions
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'DONE'],
  // BUG-01: DONE should have no valid transitions.
  // This allows DONE -> TODO if payload includes force:true at route level.
  DONE: [],
}

// Strict transitions for validateStatusTransition (no rollback allowed)
const STRICT_TRANSITIONS: Record<string, string[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE'],
  DONE: [],
}

export class TaskService {
  constructor(private db: PrismaClient) {}

  validateTitle(title: string): void {
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('Title cannot be empty or contain only whitespace')
    }
    if (trimmed.length < 3) {
      throw new ValidationError('Title must be at least 3 characters')
    }
    if (title.length > 100) {
      throw new ValidationError('Title must not exceed 100 characters')
    }
  }

  validateStatusTransition(currentStatus: string, newStatus: string): void {
    if (currentStatus === newStatus) {
      throw new UnprocessableError(`Cannot transition to the same status: ${currentStatus}`)
    }
    const allowed = STRICT_TRANSITIONS[currentStatus] ?? []
    if (!allowed.includes(newStatus)) {
      throw new UnprocessableError(
        `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.length ? allowed.join(', ') : 'none'}`
      )
    }
  }

  async createTask(projectId: string, userId: string, input: CreateTaskInput) {
    const parsed = CreateTaskSchema.parse(input)

    await this.assertProjectMember(projectId, userId)

    return this.db.task.create({
      data: {
        ...parsed,
        projectId,
        status: 'TODO',
      },
      include: { assignee: { select: { id: true, email: true, name: true } } },
    })
  }

  async updateTask(taskId: string, userId: string, input: UpdateTaskInput) {
    const parsed = UpdateTaskSchema.parse(input)

    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    })
    if (!task) throw new NotFoundError('Task not found')

    const isMember = task.project.members.some((m) => m.userId === userId)
    if (!isMember) throw new ForbiddenError('Not a project member')

    // Validate state transition
    if (parsed.status && parsed.status !== task.status) {
      const allowed = VALID_TRANSITIONS[task.status]
      if (!allowed.includes(parsed.status)) {
        throw new UnprocessableError(
          `Invalid transition: ${task.status} → ${parsed.status}. ` +
            `Allowed: ${allowed.length ? allowed.join(', ') : 'none'}`
        )
      }

      // Record history
      await this.db.statusHistory.create({
        data: {
          taskId,
          from: task.status,
          to: parsed.status,
          changedBy: userId,
        },
      })
    }

    return this.db.task.update({
      where: { id: taskId },
      data: parsed,
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    })
  }

  async getTasks(
    projectId: string,
    userId: string,
    filters: {
      status?: Status
      priority?: Priority
      assignedTo?: string
      search?: string
    }
  ) {
    await this.assertProjectMember(projectId, userId)

    return this.db.task.findMany({
      where: {
        projectId,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        // BUG-02: should be { assignedTo: filters.assignedTo }
        // but instead we do a contains check that also matches null rows
        ...(filters.assignedTo && {
          assignedTo: { equals: filters.assignedTo },
        }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  private async assertProjectMember(projectId: string, userId: string) {
    const member = await this.db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })
    if (!member) throw new ForbiddenError('Not a project member')
  }
}
