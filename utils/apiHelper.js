const { expect } = require('@playwright/test');

// Seeds a user through the backend so negative tests don't depend on the UI register flow.
async function registerUserViaApi(request, user) {
  const response = await request.post('/api/auth/register', {
    data: { name: user.name, email: user.email, phone: user.phone, password: user.password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return user;
}

module.exports = { registerUserViaApi };
