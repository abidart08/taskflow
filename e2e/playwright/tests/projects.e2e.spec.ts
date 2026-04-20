import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { ProjectListPage } from '../pages/ProjectListPage'

// ── Projects E2E — complete registration → login → project creation flow ──

test.describe('Proyectos', () => {

  /**
   * Full happy-path: register → redirect to /login → login → redirect to
   * /projects → create project → project appears in the list.
   */
  test('flujo completo: registrar, login y crear proyecto', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const projectPage = new ProjectListPage(page)

    // Unique credentials to avoid collisions between runs
    const ts = Date.now()
    const email = `e2e-proj-${ts}@test.com`
    const name = 'E2E Projects User'
    const projectName = `Proyecto E2E ${ts}`

    // 1. Register
    await loginPage.register(name, email, 'Password1')

    // 2. Registration redirects to /login
    await loginPage.expectRedirectToLogin()

    // 3. Login
    await loginPage.login(email, 'Password1')

    // 4. Login redirects to /projects
    await loginPage.expectRedirectToProjects()

    // 5. Create a project
    await projectPage.createProject(projectName)

    // 6. Project card appears in the list
    await projectPage.expectProjectVisible(projectName)
  })

  /**
   * Submitting the form with an empty name must NOT create a project.
   *
   * The project-name-input carries the `required` HTML attribute, so the
   * browser's native validation blocks the request.  The form stays visible
   * and no new card is added.
   */
  test('nombre vacío no crea el proyecto — el formulario sigue visible', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const projectPage = new ProjectListPage(page)

    const ts = Date.now()
    const email = `e2e-empty-${ts}@test.com`

    // Register & login
    await loginPage.register('E2E Empty Name', email, 'Password1')
    await loginPage.expectRedirectToLogin()
    await loginPage.login(email, 'Password1')
    await loginPage.expectRedirectToProjects()

    // Count projects before attempting creation
    const cardsBefore = await page.getByTestId('project-card').count()

    // Open the creation form, leave the name empty, and attempt submit
    await page.getByTestId('create-project-btn').click()
    await projectPage.expectFormVisible()

    // Leave name empty (just submit without filling)
    await page.getByTestId('project-submit').click()

    // The browser's required-field validation prevents submission:
    // - form is still visible
    // - no new project card appeared
    await projectPage.expectFormVisible()
    await expect(page.getByTestId('project-card')).toHaveCount(cardsBefore)
  })
})
