const { test, expect } = require('../fixtures');
const { createUser } = require('../../utils/dataFactory');
const { registerUserViaApi } = require('../../utils/apiHelper');
const MSG = require('../../test-data/messages');

test.describe('Registration & Login @auth', () => {
  test.describe('Positive', () => {
    test('TC_AUTH_01: new user can register and then log in @smoke', async ({ page, registerPage, loginPage }) => {
      const user = createUser();

      await test.step('Open register page', async () => {
        await registerPage.open();
        await expect(registerPage.heading).toBeVisible();
      });

      await test.step('Submit valid registration details', async () => {
        await registerPage.register(user);
        await expect(registerPage.message(MSG.register.success)).toBeVisible();
      });

      await test.step('App redirects to login page', async () => {
        await expect(page).toHaveURL(/\/login$/);
        await expect(loginPage.heading).toBeVisible();
      });

      await test.step('Log in with the new credentials', async () => {
        await loginPage.login(user.email, user.password);
        await expect(page).toHaveURL(/\/$/);
      });

      await test.step('User is authenticated', async () => {
        await expect(loginPage.navAccountButton).toBeVisible();
        await expect(loginPage.navLoginLink).toBeHidden();
        const session = await loginPage.getSession();
        expect(session.user).toMatchObject({ email: user.email, name: user.name });
      });
    });
  });

  test.describe('Negative - Registration', () => {
    test.beforeEach(async ({ registerPage }) => {
      await registerPage.open();
    });

    test('TC_AUTH_02: mismatched passwords are rejected', async ({ page, registerPage }) => {
      await registerPage.register(createUser({ confirmPassword: 'Different@1' }));
      await expect(registerPage.message(MSG.register.passwordMismatch)).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });

    test('TC_AUTH_03: password shorter than 6 characters is rejected', async ({ page, registerPage }) => {
      await registerPage.register(createUser({ password: '12345' }));
      await expect(registerPage.message(MSG.register.passwordTooShort)).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });

    test('TC_AUTH_04: duplicate email cannot be registered', async ({ page, request, registerPage }) => {
      const existing = await registerUserViaApi(request, createUser());
      await registerPage.register(createUser({ email: existing.email }));
      await expect(registerPage.message(MSG.register.duplicateEmail)).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });

    test('TC_AUTH_05: empty form shows a validation error for every field', async ({ page, registerPage }) => {
      await registerPage.submitButton.click();
      const r = MSG.register;
      for (const text of [r.nameTooShort, r.emailRequired, r.phoneRequired, r.passwordRequired, r.confirmPasswordRequired]) {
        await expect(registerPage.message(text)).toBeVisible();
      }
      await expect(page).toHaveURL(/\/register$/);
    });
  });

  test.describe('Negative - Login', () => {
    test.beforeEach(async ({ loginPage }) => {
      await loginPage.open();
    });

    test('TC_AUTH_06: unregistered email cannot log in', async ({ page, loginPage }) => {
      const stranger = createUser();
      await loginPage.login(stranger.email, stranger.password);
      await expect(loginPage.message(MSG.login.noAccount)).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await expect(loginPage.navLoginLink).toBeVisible();
    });

    test('TC_AUTH_07: registered email with wrong password cannot log in', async ({ page, request, loginPage }) => {
      const user = await registerUserViaApi(request, createUser());
      await loginPage.login(user.email, 'WrongPass@99');
      await expect(loginPage.message(MSG.login.invalidPassword)).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      expect(await loginPage.getSession()).toEqual({});
    });

    test('TC_AUTH_08: empty credentials are blocked by required-field validation', async ({ page, loginPage }) => {
      await loginPage.submitButton.click();
      await expect(page).toHaveURL(/\/login$/);
      expect(await loginPage.emailInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
    });
  });
});
