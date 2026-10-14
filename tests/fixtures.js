const base = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { RegisterPage } = require('../pages/RegisterPage');

// Injects page objects into every test: test('...', async ({ loginPage }) => ...)
const test = base.test.extend({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
});

module.exports = { test, expect: base.expect };
