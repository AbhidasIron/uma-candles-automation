const { BasePage } = require('./BasePage');

class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Create Account' });
    this.nameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.phoneInput = page.locator('#phone');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.getByRole('button', { name: 'Create Account' });
    this.signInLink = page.getByRole('link', { name: 'Sign in' });
  }

  async open() {
    await this.goto('/register');
  }

  async fillForm({ name, email, phone, password, confirmPassword = password }) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.phoneInput.fill(phone);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  async register(user) {
    await this.fillForm(user);
    await this.submitButton.click();
  }

  /** Locates an inline message (error/success) rendered in the page body. */
  message(text) {
    return this.main.getByText(text);
  }
}

module.exports = { RegisterPage };
