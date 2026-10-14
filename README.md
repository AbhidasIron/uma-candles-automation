# UMA Candles – E2E Automation Framework

[![Playwright Tests](https://github.com/AbhidasIron/uma-candles-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/AbhidasIron/uma-candles-automation/actions/workflows/playwright.yml)

End-to-end test automation for [uma-candles.vercel.app](https://uma-candles.vercel.app) built with **Playwright** and **JavaScript**, using the Page Object Model, with HTML / JUnit / Allure reporting and CI on **GitHub Actions** and **Jenkins**.

## Tech stack

| Area | Tool |
|---|---|
| Test runner & browser automation | [Playwright Test](https://playwright.dev) |
| Language | JavaScript (Node.js 22) |
| Design pattern | Page Object Model + custom fixtures |
| Reports | Playwright HTML, JUnit XML, Allure 3 |
| CI/CD | GitHub Actions, Jenkins |
| Containerisation | Docker, Docker Compose |
| Config | `dotenv` (`.env`) |

## Project structure

```
├── .github/workflows/playwright.yml   # GitHub Actions pipeline
├── docs/FRAMEWORK_GUIDE.md            # step-by-step build log & explanations
├── pages/                             # Page Objects
│   ├── BasePage.js
│   ├── LoginPage.js
│   └── RegisterPage.js
├── test-data/messages.js              # expected UI messages
├── tests/
│   ├── fixtures.js                    # injects page objects into tests
│   └── auth/register-login.spec.js    # registration & login tests
├── utils/
│   ├── apiHelper.js                   # API helpers (seed users)
│   └── dataFactory.js                 # unique test data generator
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── Jenkinsfile
└── playwright.config.js
```

## Getting started

**Prerequisites:** Node.js 22+, npm.

```bash
git clone https://github.com/AbhidasIron/uma-candles-automation.git
cd uma-candles-automation
npm ci
npx playwright install chromium
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `BASE_URL` | Application under test | `https://uma-candles.vercel.app` |
| `TEST_USER_PASSWORD` | Password for generated test users | `Test@1234` |

## Running tests

| Command | Description |
|---|---|
| `npm test` | Run all tests (headless) |
| `npm run test:headed` | Run with a visible browser |
| `npm run test:auth` | Run only auth tests |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Debug with Playwright Inspector |
| `npx playwright test --grep @smoke` | Run by tag |
| `npx playwright test -g "TC_AUTH_01"` | Run a single test by ID |

## Running in Docker

No local Node.js or browsers needed – only Docker. The image is based on the official `mcr.microsoft.com/playwright:v1.64.0-noble`.

```bash
npm run docker:build                                     # or: docker compose build
npm run docker:test                                      # or: docker compose run --rm tests
docker compose run --rm tests npm test -- --grep @smoke  # pass any Playwright args
docker compose run --rm tests npm run allure:generate    # build Allure report
```

Reports and failure artefacts are written to `./reports` and `./test-results` on the host (mounted volumes). Override the target with `BASE_URL=https://... docker compose run --rm tests`.

**Watching tests from Docker:** containers have no display, so a headed browser can't open. Instead run `npm run docker:ui` and open <http://localhost:8080> (not the `http://0.0.0.0:8080` link from the logs – browsers block it and show a blank page) – Playwright UI mode runs inside the container and streams a live, step-by-step view to your browser. Stop with `Ctrl+C` then `docker compose down`. For a real headed browser, run locally with `npm run test:headed`.

## Reports

| Report | Command / Location |
|---|---|
| Playwright HTML | `npm run report` → `reports/html` |
| Allure | `npm run allure:report` → `reports/allure-report` |
| JUnit XML | `reports/junit/results.xml` |
| Failure trace | `npx playwright show-trace test-results/<test>/trace.zip` |

Screenshots, videos and traces are captured **only on failure**.

## Test coverage

| ID | Type | Scenario |
|---|---|---|
| TC_AUTH_01 | Positive `@smoke` | New user registers, then logs in successfully |
| TC_AUTH_02 | Negative | Mismatched passwords on registration |
| TC_AUTH_03 | Negative | Password shorter than 6 characters |
| TC_AUTH_04 | Negative | Registration with an existing email |
| TC_AUTH_05 | Negative | Empty registration form |
| TC_AUTH_06 | Negative | Login with unregistered email |
| TC_AUTH_07 | Negative | Login with wrong password |
| TC_AUTH_08 | Negative | Login with empty fields |

## CI/CD

**GitHub Actions** – runs on push/PR to `main`, daily schedule, and manually (optional `grep` input such as `@smoke`). Playwright HTML and Allure reports are uploaded as run artifacts. Optional repo variable `BASE_URL` and secret `TEST_USER_PASSWORD`.

**Jenkins** – declarative pipeline in `Jenkinsfile` with `BASE_URL` and `GREP` parameters. Requires the NodeJS (tool `node22`), HTML Publisher, JUnit and Allure plugins.

**Docker (GitHub Actions)** – `.github/workflows/docker.yml` builds the image and runs the suite inside it. Triggered manually or when Docker/dependency files change on `main`.

## Known limitations

- The registration API is rate-limited (~10 sign-ups/hour per IP). Each full run registers 3 users; frequent local runs may receive `429 Too many requests`.
- Test users are created on the live site with `qa.auto.<timestamp>@example.com` emails.

## Documentation

See [docs/FRAMEWORK_GUIDE.md](docs/FRAMEWORK_GUIDE.md) for a detailed, step-by-step explanation of how the framework was built.
