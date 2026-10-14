# UMA Candles – Automation Framework Build Log

This document records **every step** taken to build the framework, in order: what was created, where, and why.

Application under test: <https://uma-candles.vercel.app>
Stack: **Playwright Test + JavaScript (CommonJS)**, Page Object Model, HTML + JUnit reports, GitHub Actions, Jenkins.

---

## Phase 0 – Exploration (before writing any test)

Tests are only reliable if they are based on how the app *actually* behaves, so the site was explored first with short throwaway Playwright scripts (deleted afterwards).

| What was checked | Finding |
|---|---|
| Login URL | `/login` – fields `#email`, `#password`, button **Sign In**, tabs **Email / Phone OTP** |
| Signup URL | `/signup` is 404. Real page is `/register` |
| Register form | `#name`, `#email`, `#phone`, `#password`, `#confirmPassword`, button **Create Account** |
| Register validation | Custom JS validation (`<form noValidate>`), not HTML5. Inline messages shown under fields |
| Register API | `POST /api/auth/register` with JSON `{name,email,phone,password}` → `201` / `409` for duplicate |
| Successful registration | Shows **"Account Created!"**, then redirects to `/login` |
| Login backend | NextAuth (`/api/auth/callback/credentials`, `/api/auth/session`) |
| Successful login | Redirects to `/`; nav **Login** link is replaced by an **Account** button; `/api/auth/session` returns the user |
| Wrong email | "No account found with this email" |
| Wrong password | "Invalid password" |
| Empty login | HTML5 `required` blocks submit |

These findings directly drove the selectors, assertions and messages used below.

---

## Phase 1 – Project initialisation

### Step 1.1 – Initialise npm project
```bash
npm init -y
```
Creates **`package.json`**, the manifest that tracks dependencies and scripts.

### Step 1.2 – Install dependencies
```bash
npm i -D @playwright/test dotenv
npx playwright install chromium
```
- `@playwright/test` – test runner, assertions, browser automation, reporters.
- `dotenv` – loads environment variables from a `.env` file (e.g. `BASE_URL`), so the same tests can run against different environments.
- `playwright install chromium` – downloads the browser binary.

### Step 1.3 – Create folder structure
```bash
mkdir -p pages tests/auth utils test-data .github/workflows docs
```

```
uma-testing/
├── .github/workflows/playwright.yml   # GitHub Actions pipeline
├── docs/FRAMEWORK_GUIDE.md            # this file
├── pages/                             # Page Objects (locators + actions per page)
│   ├── BasePage.js
│   ├── LoginPage.js
│   └── RegisterPage.js
├── test-data/
│   └── messages.js                    # expected UI messages
├── tests/
│   ├── fixtures.js                    # custom test() with page objects injected
│   └── auth/
│       └── register-login.spec.js     # test cases
├── utils/
│   ├── apiHelper.js                   # backend shortcuts (seed users)
│   └── dataFactory.js                 # unique test data generator
├── .env.example                       # template of env variables
├── .gitignore
├── Jenkinsfile                        # Jenkins pipeline
├── package.json
└── playwright.config.js               # global Playwright configuration
```

**Why this layout?**
- `pages/` – Page Object Model: if a selector changes, fix it in **one** place, not in every test.
- `tests/` – only test logic / assertions; no raw selectors.
- `utils/` – reusable helpers not tied to a page.
- `test-data/` – static expected data, separated from code.

---

## Phase 2 – Configuration files

### Step 2.1 – `package.json` scripts
Added shortcuts so nobody has to remember CLI flags:

| Script | Purpose |
|---|---|
| `npm test` | Run all tests headless |
| `npm run test:headed` | Run with visible browser |
| `npm run test:auth` | Run only `tests/auth` |
| `npm run test:debug` | Step through with Playwright Inspector |
| `npm run test:ui` | Playwright UI mode (watch, time-travel) |
| `npm run report` | Open the last HTML report |

### Step 2.2 – `.env.example` and `.env`
`.env.example` is committed and documents the variables. Copy it to `.env` locally (`cp .env.example .env`).
- `BASE_URL` – environment under test (prod, staging, preview…).
- `TEST_USER_PASSWORD` – password used for generated users.

### Step 2.3 – `.gitignore`
Keeps `node_modules/`, `.env` (may contain secrets), `test-results/` and `reports/` (generated artefacts) out of git.

### Step 2.4 – `playwright.config.js`
Central configuration:

| Setting | Value | Why |
|---|---|---|
| `testDir` | `./tests` | Where specs live |
| `timeout` | 60s | Per-test limit; the site is on Vercel and login can take a few seconds |
| `expect.timeout` | 15s | Auto-wait for assertions |
| `fullyParallel` | `true` | Every test is independent (unique data) so they run in parallel |
| `forbidOnly` | on CI | Prevents an accidental `test.only` from silently skipping the suite |
| `retries` | 1 on CI, 0 locally | Absorbs network blips on CI without hiding flakiness locally |
| `reporter` | `list`, `html`, `junit` | Console output, rich HTML report, JUnit XML for Jenkins/GitHub |
| `baseURL` | from `.env` | Tests use relative paths like `/login` |
| `trace` / `screenshot` / `video` | on failure only | Debug evidence without bloating passing runs |
| `projects` | Chromium | More browsers (Firefox/WebKit/mobile) can be added later |

---

## Phase 3 – Utilities and test data

### Step 3.1 – `utils/dataFactory.js`
`createUser(overrides)` returns a user with a **unique** email and phone (timestamp + random). 
Why: the app rejects duplicate emails, so hard-coded users would fail on the second run and collide in parallel runs. `overrides` lets a test change only the field it cares about, e.g. `createUser({ password: '12345' })`.

### Step 3.2 – `utils/apiHelper.js`
`registerUserViaApi(request, user)` calls `POST /api/auth/register` directly.
Why: negative tests like "duplicate email" or "wrong password" need an *existing* user. Creating it through the API is faster and means those tests do not fail just because the registration UI is broken (that is covered by TC_AUTH_01).

### Step 3.3 – `test-data/messages.js`
All expected UI texts in one place. If the product team rewords a message, update one file.

---

## Phase 4 – Page Objects

### Step 4.1 – `pages/BasePage.js`
Common to all pages:
- `main` – the page content area (messages are searched inside it).
- `navLoginLink` / `navAccountButton` – header elements that reveal login state.
- `goto(path)` – navigation relative to `baseURL`.
- `getSession()` – reads `/api/auth/session` with the browser's cookies; returns the logged-in user or `{}`. Gives a backend-level proof of login, not just a UI one.

### Step 4.2 – `pages/RegisterPage.js`
Locators for every field + `open()`, `fillForm(user)`, `register(user)`, `message(text)`.
`confirmPassword` defaults to `password`, so tests only pass it when testing a mismatch.

### Step 4.3 – `pages/LoginPage.js`
Locators + `open()`, `login(email, password)`, `message(text)`.

**Locator strategy:** role/label-based (`getByRole('button', { name: 'Sign In' })`) where possible, because it mirrors what a user sees and survives CSS refactors; stable `id`s for inputs.

---

## Phase 5 – Fixtures

### Step 5.1 – `tests/fixtures.js`
Extends Playwright's `test` with `loginPage` and `registerPage` fixtures. Tests receive ready page objects:
```js
test('...', async ({ loginPage }) => { await loginPage.open(); });
```
Why: removes `new LoginPage(page)` boilerplate from every test, and gives one place to add future fixtures (e.g. an already-logged-in user).

---

## Phase 6 – First test suite

### Step 6.1 – `tests/auth/register-login.spec.js`

| ID | Type | Scenario | Key assertions |
|---|---|---|---|
| TC_AUTH_01 | Positive `@smoke` | Register a new user, then log in | "Account Created!" → redirect `/login` → login → URL `/`, **Account** button visible, **Login** link hidden, session email & name match |
| TC_AUTH_02 | Negative | Password ≠ confirm password | "Passwords do not match." and stays on `/register` |
| TC_AUTH_03 | Negative | Password < 6 chars | "Password must be at least 6 characters." |
| TC_AUTH_04 | Negative | Email already registered | "An account with this email already exists" |
| TC_AUTH_05 | Negative | Submit empty register form | Inline error for name, email, phone, password, confirm |
| TC_AUTH_06 | Negative | Login with unregistered email | "No account found with this email", still logged out |
| TC_AUTH_07 | Negative | Login with wrong password | "Invalid password", session is empty |
| TC_AUTH_08 | Negative | Login with empty fields | Browser `required` validation blocks submit |

Design notes:
- TC_AUTH_01 uses `test.step()` so the HTML report shows each stage (open → register → redirect → login → verify).
- Tags `@auth` and `@smoke` in titles allow `npx playwright test --grep @smoke`.
- Every test generates its own data → no order dependency, safe in parallel.

### Step 6.2 – First run and fix
First run: 7/8 passed. TC_AUTH_05 failed because it assumed HTML5 `required` validation. Inspection showed the register form uses `noValidate` with custom inline messages. The test was rewritten to assert those messages. Second run: **8/8 passed (~8s)**.

### Step 6.3 – Rate-limit finding
After several back-to-back runs, `POST /api/auth/register` started returning **429 "Too many requests. Please try again in ~3400 seconds"**. The backend limits registrations per IP (roughly 10/hour). Each run registers 3 users (TC_AUTH_01, 04, 07), so repeated runs exhaust the quota. To be resolved before scaling the suite (see open questions).

---

## Phase 7 – Reporting

After every run:
- **HTML report** → `reports/html/index.html` (`npm run report`). Includes steps, screenshots, video and trace for failures.
- **JUnit XML** → `reports/junit/results.xml` (consumed by Jenkins and GitHub Actions).
- **Trace viewer** for a failure: `npx playwright show-trace test-results/<test>/trace.zip`.

### Step 7.1 – Allure report
```bash
npm i -D allure-playwright allure
```
- `allure-playwright` – Playwright reporter that writes raw results (JSON + screenshots/videos/traces) to `reports/allure-results`.
- `allure` – Allure 3 CLI (pure Node.js, **no Java needed**) that turns results into an HTML report.

Changes made:
- `playwright.config.js` – added the `allure-playwright` reporter with `resultsDir`, `suiteTitle` (groups tests by file/describe) and `environmentInfo` (BASE_URL, Node version, OS shown on the report).
- `package.json` scripts:

| Script | Purpose |
|---|---|
| `pretest` | Runs automatically before `npm test`; clears old `allure-results` so reports don't mix runs |
| `allure:clean` | Delete `reports/allure-results` (cross-platform Node one-liner) |
| `allure:generate` | Build HTML report into `reports/allure-report` |
| `allure:open` | Serve the generated report in the browser |
| `allure:report` | Generate + open in one go |

Tags in test titles (`@auth`, `@smoke`) appear as Allure tags; `test.step()` blocks appear as steps.

Usage:
```bash
npm test
npm run allure:report
```
> Open the report with `allure:open`, not by double-clicking `index.html` – it loads data files that browsers block on `file://`.

---

## Phase 8 – CI/CD

### Step 8.1 – `.github/workflows/playwright.yml`
Triggers: push/PR to `main`/`master`, manual run (with optional `grep` input, e.g. `@smoke`), and a daily schedule.
Steps: checkout → Node 22 (npm cache) → `npm ci` → install Chromium → run tests → upload HTML report (always) → generate + upload Allure report (always) → upload traces/videos (on failure) → publish JUnit summary on the run page.
Config: optional repo **variable** `BASE_URL` and **secret** `TEST_USER_PASSWORD` (Settings → Secrets and variables → Actions); defaults are used if absent.

### Step 8.2 – `Jenkinsfile`
Declarative pipeline with parameters `BASE_URL` and `GREP`.
Stages: **Install** (`npm ci`, browsers) → **Test** (clears old Allure results first). Post: publish JUnit results, HTML report, Allure report, archive failure artefacts.
Jenkins prerequisites: plugins **NodeJS**, **HTML Publisher**, **JUnit**, **Allure**; a NodeJS tool named `node22` and an Allure Commandline tool (Manage Jenkins → Tools). The Allure plugin reads `reports/allure-results` and adds an *Allure Report* link plus trend graph to each build. Create a *Pipeline* job → "Pipeline script from SCM" → point to this repo.
> Note: Jenkins' default CSP blocks JS in published HTML reports. If the report appears blank, relax `hudson.model.DirectoryBrowserSupport.CSP` or open the archived report locally.

---

## Phase 9 – Docker

Goal: run the suite identically on any machine or CI agent without installing Node.js or browsers.

### Step 9.1 – `Dockerfile`
- Base image `mcr.microsoft.com/playwright:v1.64.0-noble` – official image with Node.js, Chromium/Firefox/WebKit and all OS libraries preinstalled. Its version **must match** `@playwright/test` in `package-lock.json`, otherwise Playwright can't find the browsers; bump both together.
- `COPY package.json package-lock.json` then `npm ci` **before** `COPY . .` – Docker caches the dependency layer, so code-only changes rebuild in seconds.
- `ENV CI=true` – activates CI behaviour from `playwright.config.js` (retries, `forbidOnly`, 2 workers).
- `CMD ["npm", "test"]` – default command; `pretest` clears old Allure results first.
- Runs as root (image default) so the container can write to bind-mounted `reports/` on any host without UID mismatches. Acceptable here because it only browses our own site.

### Step 9.2 – `.dockerignore`
Excludes `node_modules`, reports, `.env` (secrets) and `.git` from the build context – smaller, faster builds and no secrets baked into the image.

### Step 9.3 – `docker-compose.yml`
One service `tests`:
- `init: true` / `ipc: host` – recommended by Playwright so Chromium doesn't crash from limited shared memory and zombie processes are reaped.
- `environment` – passes `BASE_URL` / `TEST_USER_PASSWORD` from the host shell (with defaults).
- `volumes` – maps `reports/` and `test-results/` back to the host so reports are visible after the container exits.

### Step 9.4 – npm scripts
`docker:build` (`docker compose build`) and `docker:test` (`docker compose run --rm tests`).

### Step 9.4.1 – UI mode from Docker (`ui` service)
A container has no screen, so `--headed` cannot show a window. The `ui` service (`extends: tests`) starts Playwright UI mode as a web server (`--ui-host=0.0.0.0 --ui-port=8080`) and publishes it on `127.0.0.1:8080` only (not exposed to your network). Run `npm run docker:ui`, open <http://localhost:8080>, pick tests and watch each step live with DOM snapshots.

### Step 9.5 – `.github/workflows/docker.yml`
Builds the image and runs the tests inside it on GitHub Actions, then generates the Allure report and uploads `reports/` as an artifact. Triggered manually (with optional `grep`) or when Docker/dependency files change, so normal pushes don't run the suite twice.

Usage:
```bash
npm run docker:build
npm run docker:test
docker compose run --rm tests npm test -- --grep @smoke
```

---

## How to run locally
```bash
npm ci
npx playwright install chromium
cp .env.example .env
npm test                 # all tests
npx playwright test --grep @smoke
npm run report           # open HTML report
npm run allure:report    # generate + open Allure report
```
