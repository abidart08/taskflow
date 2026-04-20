import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'

// ── Auth E2E — validates login/register flows using Page Object Model ──

test.describe('Autenticación', () => {

  test('usuario puede registrarse y es redirigido a /login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const email = `e2e-register-${Date.now()}@test.com`

    await loginPage.register('E2E User', email, 'Password1')

    // RegisterPage.tsx calls navigate('/login') on success
    await loginPage.expectRedirectToLogin()
  })

  test('usuario puede hacer login y es redirigido a /projects', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const email = `e2e-login-${Date.now()}@test.com`

    // Register first so the user exists in the DB
    await loginPage.register('E2E Login User', email, 'Password1')
    await loginPage.expectRedirectToLogin()

    // Now login
    await loginPage.login(email, 'Password1')
    await loginPage.expectRedirectToProjects()
  })

  test('login con credenciales incorrectas muestra error', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.login('noexiste@test.com', 'WrongPass1')

    // The app sets an error message in the login-error element
    await expect(page.getByTestId('login-error')).toBeVisible()
    // Page stays at /login
    await loginPage.expectRedirectToLogin()
  })

  test('usuario no autenticado es redirigido a /login al acceder a /projects', async ({ page }) => {
    // ProtectedRoute redirects to /login when isAuthenticated is false
    await page.goto('/projects')
    await expect(page).toHaveURL('/login')
  })
})
