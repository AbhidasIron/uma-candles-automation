const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@1234';

// Unique per call so parallel/repeated runs never collide on email or phone.
function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function createUser(overrides = {}) {
  const id = uniqueSuffix();
  return {
    name: 'QA Automation',
    email: `qa.auto.${id}@example.com`,
    phone: `9${id.slice(-9)}`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

module.exports = { createUser };
