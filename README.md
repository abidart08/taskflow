# TaskFlow 🗂️

Proyecto integrador del curso **Testing y Calidad de Software**.
App de gestión de tareas (tipo Jira simplificado) con suite completa de tests.

---

## Setup rápido

> **TL;DR — tres comandos y ya:**

```bash
# 1. Asegurate de tener PostgreSQL corriendo (ver abajo si no lo tenés)
# 2. Cloná el repo y entrá a la carpeta
bash setup.sh       # instala, migra y carga datos de prueba
npm run dev         # levanta API + frontend
```

Abrí **http://localhost:5173** e iniciá sesión con:

| Email | Contraseña |
|-------|-----------|
| `alice@taskflow.dev` | `Password1` |
| `bob@taskflow.dev` | `Password1` |

El script `setup.sh` es idempotente: podés correrlo todas las veces que quieras sin romper nada.

---

## Prerrequisitos

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL corriendo en localhost:5432**

### ¿No tenés PostgreSQL? Dos opciones:

**Opción A — Homebrew (macOS)**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Opción B — Docker**
```bash
docker run --name taskflow-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16
```

Si usás Docker, antes de correr `setup.sh` editá `apps/api/.env` con:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

---

## Correr los tests

```bash
npm run test:unit         # Vitest — lógica pura, con coverage
npm run test:integration  # Vitest + Supertest — rutas HTTP
npm run test:bdd          # Cucumber — escenarios Gherkin
npm run test:e2e          # Playwright — flujos completos (requiere app corriendo)
npm run test:all          # todos en orden

# Performance (requiere k6 instalado: brew install k6)
k6 run performance/scenarios/api-load.k6.js
```

---

## Hito 2 — US-01 y US-02: unit tests + integration tests

### Requisitos previos

```bash
# Desde la raíz
npm install
npx prisma generate --schema=apps/api/src/prisma/schema.prisma
```

> No se necesita base de datos real: los tests mockean los servicios.

---

### Unit tests (Vitest)

Cubren la lógica de `AuthService` y `TaskService` de forma aislada (sin DB ni HTTP).

```bash
# Todos los unit tests con reporte de coverage
npm run test:unit

# Comando equivalente directo
cd apps/api
npx vitest run tests/unit --coverage
```

**Tests que pasan (≥ 5):**

| Archivo | Casos |
|---------|-------|
| `auth.service.spec.ts` | registro, login, token, errores |
| `auth.service.handlefailedlogin.spec.ts` | bloqueo por intentos fallidos |
| `task.service.spec.ts` | creación y validación de tareas |
| `task.state-machine.spec.ts` | transiciones de estado válidas e inválidas |

---

### Integration tests (Vitest + Supertest)

Levantan la app Express completa con servicios mockeados y verifican las rutas HTTP reales.

```bash
# Todos los integration tests (desde la raíz)
npm run test:integration

# Solo las rutas de autenticación
cd apps/api
npx vitest run tests/integration/auth.routes.spec.ts

# Solo las rutas de tareas
cd apps/api
npx vitest run tests/integration/tasks.routes.spec.ts
```

**Tests que pasan (≥ 3):**

| Archivo | Caso | Código esperado |
|---------|------|----------------|
| `auth.routes.spec.ts` | registro exitoso | 201 |
| `auth.routes.spec.ts` | email ya registrado | 409 |
| `auth.routes.spec.ts` | login exitoso | 200 |
| `auth.routes.spec.ts` | credenciales incorrectas | 401 |
| `auth.routes.spec.ts` | sin token en ruta protegida | 401 |
| `tasks.routes.spec.ts` | crea tarea y devuelve objeto | 201 |
| `tasks.routes.spec.ts` | título vacío rechazado | 400 |
| `tasks.routes.spec.ts` | sin token → denegado | 401 |
| `tasks.routes.spec.ts` | retorna lista de tareas | 200 |
| `tasks.routes.spec.ts` | sin token en GET → denegado | 401 |

**Salida esperada:**

```
✓ tests/integration/tasks.routes.spec.ts (5)
✓ tests/integration/auth.routes.spec.ts (8)

Test Files  2 passed (2)
     Tests  13 passed (13)
```

---

## Tests E2E — Playwright (Page Object Model)

Los tests E2E están en `e2e/playwright/tests/` y usan Page Objects definidos en `e2e/playwright/pages/`.

Playwright levanta automáticamente el backend (`:3001`) y el frontend (`:5173`) antes de correr los tests, gracias a la configuración `webServer` en `playwright.config.ts`. No hace falta levantar nada manualmente.

### Requisitos previos

```bash
# Instalar browsers de Playwright (solo la primera vez)
npx playwright install
```

> También necesitás PostgreSQL corriendo y la DB migrada (`bash setup.sh`) porque
> los tests E2E registran usuarios reales contra la API.

### Comandos

```bash
# Todos los tests E2E (headless, desde la raíz)
npm run test:e2e

# Modo headed (ver el browser)
npx playwright test --headed

# Solo auth
npx playwright test e2e/playwright/tests/auth.e2e.spec.ts

# Solo projects
npx playwright test e2e/playwright/tests/projects.e2e.spec.ts

# Con trace (para depurar fallos)
npx playwright test --trace on

# Abrir el reporte HTML del último run
npx playwright show-report
```

### Tests implementados

| Archivo | Caso |
|---------|------|
| `auth.e2e.spec.ts` | registro redirige a `/login` |
| `auth.e2e.spec.ts` | login exitoso redirige a `/projects` |
| `auth.e2e.spec.ts` | credenciales incorrectas muestra error |
| `auth.e2e.spec.ts` | usuario no autenticado redirigido desde `/projects` |
| `projects.e2e.spec.ts` | flujo completo: registrar → login → crear proyecto → aparece en lista |
| `projects.e2e.spec.ts` | nombre vacío no crea proyecto (formulario sigue visible) |

### Si los servidores ya están corriendo

```bash
# El webServer config tiene reuseExistingServer: true para desarrollo local,
# así que si ya tenés npm run dev activo, Playwright los reutiliza sin relanzarlos.
npm run dev   # Terminal 1
npx playwright test --headed   # Terminal 2
```

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + TypeScript + Vite |
| ORM | Prisma + PostgreSQL |
| Unit/Integration | Vitest + Supertest |
| BDD | Cucumber.js + Gherkin |
| E2E | Playwright |
| Performance | k6 |
| CI/CD | GitHub Actions |

---

## Estructura

```
taskflow/
├── apps/
│   ├── api/               # Backend Express + TypeScript (puerto 3001)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/  ← lógica de negocio + bugs intencionales
│   │   │   ├── middleware/
│   │   │   └── prisma/    ← schema, migraciones y seed
│   │   └── tests/
│   │       ├── unit/        ← Vitest — lógica pura
│   │       └── integration/ ← Vitest + Supertest
│   └── web/               # Frontend React 18 + Vite (puerto 5173)
│       └── src/
│           ├── api/         ← cliente Axios con interceptor JWT
│           ├── contexts/    ← AuthContext
│           ├── pages/       ← Login, Register, Projects, ProjectDetail, TaskDetail
│           ├── components/  ← Navbar, TaskCard*, CommentList*
│           └── types/       ← tipos del dominio
├── e2e/               # Playwright + Cucumber
│   ├── features/      ← archivos .feature (Gherkin)
│   ├── pages/         ← Page Object Model
│   └── step-definitions/
├── performance/       ← k6 scripts
├── docs/adr/          ← Architecture Decision Records
├── setup.sh           ← script de setup inicial
└── .github/workflows/ ← CI/CD pipelines
```

`*` Componentes con TODOs intencionales para ejercicio de estudiantes.

---

## Frontend (`apps/web`)

| Ruta | Pantalla |
|------|---------|
| `/register` | Registro de usuario |
| `/login` | Login |
| `/projects` | Lista de proyectos |
| `/projects/:id` | Detalle de proyecto + tareas |
| `/projects/:id/tasks/:taskId` | Detalle de tarea + comentarios |

```bash
npm run dev:web    # solo frontend → http://localhost:5173
npm run build:web  # build de producción
```

### TODOs para estudiantes

Dos componentes tienen funcionalidad **intencionalmente incompleta**:

- **`TaskCard.tsx`** — badge de color según prioridad (`LOW/MEDIUM/HIGH/CRITICAL`)
- **`CommentList.tsx`** — formateo de fecha de cada comentario

Buscá los comentarios `// TODO (estudiante):` en esos archivos.

---

## Hitos del semestre

| Clase | Entregable |
|-------|-----------|
| 3 | Repo + pipeline lint verde |
| 5 | US-01 y US-02 con unit + integration tests |
| 7 | US-03–05 + escenarios BDD pasando |
| 9 | US-06–08 + coverage ≥ 80% |
| 11 | E2E flujos críticos + contract tests |
| 13 | Scripts k6 + reporte SLOs |
| 15 | Suite completa + ADR + trazabilidad |
| 16 | Demo day 🎉 |

---

## Definition of Done

Una US está DONE cuando:
- [ ] Código compila sin errores TS
- [ ] Unit tests pasan con coverage ≥ 80%
- [ ] Integration tests cubren happy path + 2 casos de error
- [ ] Escenarios Gherkin implementados y pasando
- [ ] Sin errores ESLint
- [ ] Pipeline CI verde
- [ ] Matriz de trazabilidad actualizada
- [ ] PR con al menos 1 review aprobado
