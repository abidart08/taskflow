import { type Page, expect } from '@playwright/test'

/**
 * Page Object for the Projects list page (/projects).
 *
 * Locators come from the real data-testid attributes in ProjectsPage.tsx:
 *   create-project-btn  – button that toggles the creation form
 *   project-name-input  – name input inside the form
 *   project-submit      – submit button inside the form
 *   project-list        – <ul> container holding all project cards
 *   project-card        – each <li> representing one project
 */
export class ProjectListPage {
  constructor(private readonly page: Page) {}

  // ── Navigation ─────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/projects')
  }

  // ── Actions ────────────────────────────────────────────────

  /**
   * Open the creation form, type the project name, and submit.
   * If `name` is empty the browser's required-field validation fires and
   * the form stays visible without sending a request.
   */
  async createProject(name: string): Promise<void> {
    await this.page.getByTestId('create-project-btn').click()
    await expect(this.page.getByTestId('project-name-input')).toBeVisible()
    await this.page.getByTestId('project-name-input').fill(name)
    await this.page.getByTestId('project-submit').click()
  }

  // ── Assertions ─────────────────────────────────────────────

  /** Assert that the project creation form is currently visible. */
  async expectFormVisible(): Promise<void> {
    await expect(this.page.getByTestId('project-name-input')).toBeVisible()
  }

  /** Assert that at least one project card with the given name is visible. */
  async expectProjectVisible(name: string): Promise<void> {
    await expect(
      this.page.getByTestId('project-list').getByText(name)
    ).toBeVisible()
  }

  /** Assert the exact number of visible project cards. */
  async expectProjectCount(count: number): Promise<void> {
    await expect(this.page.getByTestId('project-card')).toHaveCount(count)
  }
}
