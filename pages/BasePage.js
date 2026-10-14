class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.main = page.locator('main');
    this.navLoginLink = page.getByRole('link', { name: 'Login' });
    this.navAccountButton = page.getByRole('button', { name: 'Account' });
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  /** Returns NextAuth session JSON ({} when logged out). */
  async getSession() {
    const response = await this.page.request.get('/api/auth/session');
    return response.json();
  }
}

module.exports = { BasePage };
