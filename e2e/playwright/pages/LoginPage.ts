import { type Page, expect } from '@playwright/test'

/**
 * Page Object for the Login (/login) and Register (/register) pages.
 *
 * Locators are sourced directly from the real HTML data-testid attributes:
 *   login:    login-email | login-password | login-submit | login-error
 *   register: register-name | register-email | register-password | register-submit | register-error
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  // ── Navigation ─────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/login')
  }

  // ── Register flow ──────────────────────────────────────────

  /**
   * Navigate to /register, fill the form, and submit.
   * After a successful registration the app redirects to /login.
   */
  async register(name: string, email: string, password: string): Promise<void> {
    await this.page.goto('/register')
    await this.page.getByTestId('register-name').fill(name)
    await this.page.getByTestId('register-email').fill(email)
    await this.page.getByTestId('register-password').fill(password)
    await this.page.getByTestId('register-submit').click()
  }

  // ── Login flow ─────────────────────────────────────────────

  /**
   * Fill the login form (page must already be at /login) and submit.
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.getByTestId('login-email').fill(email)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
  }

  // ── Assertions ─────────────────────────────────────────────

  async expectRedirectToProjects(): Promise<void> {
    await expect(this.page).toHaveURL('/projects')
  }

  async expectRedirectToLogin(): Promise<void> {
    await expect(this.page).toHaveURL('/login')
  }

  /** Assert that an error message containing `text` is visible. */
  async expectErrorMessage(text: string): Promise<void> {
    // The app uses data-testid="login-error" on /login and
    // data-testid="register-error" on /register.
    const currentUrl = this.page.url()
    const testId = currentUrl.includes('/register') ? 'register-error' : 'login-error'
    await expect(this.page.getByTestId(testId)).toContainText(text)
  }

  /** Assert that the login form is still displayed (no redirect happened). */
  async expectLoginFormVisible(): Promise<void> {
    await expect(this.page.getByTestId('login-email')).toBeVisible()
  }
}
