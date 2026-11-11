# Finni Patient Dashboard

A patient dashboard for a single independent practice, built with React, Express, and SQLite.

## Features

- Add, view, and edit patient records.
- Search by name, filter by status or city, and page through results.
- Sort by name, date of birth, or date added.
- Validate patient details in the browser and API.
- Persist records in SQLite and support System, Light, and Dark themes.

The sample data is fictional. The application is not configured for real patient information or production clinical use.

## Getting started

Requires Node.js **24 or later** and npm. Run commands from the repository root:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

To add eight fictional patients, run this in another terminal:

```sh
npm run seed
```

Seeding is optional and skips databases that already contain patients.

### Run the built application

```sh
npm run build
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Tech stack

| Layer          | Technologies                                                                      |
| -------------- | --------------------------------------------------------------------------------- |
| Frontend       | React, TypeScript, Vite, Tailwind CSS, Radix UI                                   |
| Forms and data | React Hook Form, Zod, TanStack Query                                              |
| Backend        | Express, better-sqlite3, SQLite                                                   |
| Testing        | Vitest, Testing Library, jsdom; Node.js test runner and Supertest for the backend |

## Architecture

During development, Vite serves the frontend on port 5173 and proxies `/api/*` to Express on port 3000. After building, Express serves both the frontend and API on port 3000. Only the backend accesses SQLite.

The frontend and API share Zod schemas for data contracts and validation. On the backend, patient routes handle HTTP requests and input validation, while the patient repository handles SQL and persistence.

## Configuration

| Variable        | Default              | Description            |
| --------------- | -------------------- | ---------------------- |
| `PORT`          | `3000`               | Server port.           |
| `HOST`          | `127.0.0.1`          | Server listen address. |
| `DATABASE_PATH` | `./data/patients.db` | SQLite file path.      |

Set environment variables directly; `.env` files are not loaded automatically.

```sh
DATABASE_PATH=/path/to/patients.db npm start
```

The database is created automatically. Hosted deployments need persistent storage outside `dist/client`.

## API

API contracts are defined in code:

- [Patient schemas](shared/patient-schema.ts): patient fields, types, and validation.
- [API schemas](shared/api-schema.ts): query parameters, response shapes, and error codes.
- [Patient routes](server/modules/patients/patient.routes.ts): HTTP methods, paths, and status codes. Routes are mounted at `/api/patients` in [the Express app](server/app.ts).

## Tests and checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Frontend tests use **Vitest**, React Testing Library, and user-event. Vitest reuses the Vite configuration; DOM assertions use `@testing-library/jest-dom` (this does not install or require the Jest runner). Backend and shared-schema tests retain Node's built-in test runner.

Frontend tests are organized by scope:

| Level                  | Location                 | Responsibility                                                                                                                                   |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit / client boundary | `src/tests/unit/`        | Query encoding, cancellation signal forwarding, response contracts, and HTTP/network errors. Runs in Node.                                       |
| Component              | `src/tests/components/`  | Form validation, submitted values, and save failures. Runs in jsdom.                                                                             |
| Page integration       | `src/tests/integration/` | Real page, forms, dialogs, and query cache working together: filters, URL state, pagination, save refresh, and focus restoration. Runs in jsdom. |

UI tests mock fetch and keep React, form validation, and TanStack Query real. Server tests verify actual API behavior, SQLite persistence, and static hosting. Shared-schema tests verify validation rules. Cross-layer fictional data factories live in `tests/fixtures/patients.ts`; each call returns fresh nested objects. Scenario-specific edge cases stay with their tests.

Detailed validation case matrices live in `shared/tests/`. Other suites keep representative integration checks: HTTP error mapping, client response-validation wiring, and form feedback/request blocking. They do not repeat the shared schema's field and parameter matrices.

The approach follows [Testing Library's user-oriented principles](https://testing-library.com/docs/guiding-principles/): query controls by role or label, prefer user-event for interactions, await observable outcomes, and clean up between tests. Test at the smallest scope that gives useful confidence; page tests cover interactions between components. Business components already exercised clearly through the page do not each require separate tests. Focused form tests isolate substantial validation and save-error behavior. Browser E2E tests are not included; jsdom tests do not verify layout or a complete browser-to-database workflow.

| Command                           | Scope                                     |
| --------------------------------- | ----------------------------------------- |
| `npm test`                        | Frontend, backend, and shared validation. |
| `npm run test:client`             | All frontend tests.                       |
| `npm run test:client:unit`        | Client unit/boundary tests.               |
| `npm run test:client:components`  | Component tests.                          |
| `npm run test:client:integration` | Page integration tests.                   |
| `npm run test:client:watch`       | Frontend watch mode.                      |
| `npm run test:server`             | API and persistence.                      |
| `npm run test:shared`             | Shared validation.                        |

Use `npm run lint:fix` and `npm run format` to apply automatic fixes.

[GitHub Actions](.github/workflows/checks.yml) runs these checks on pushes and pull requests using Node.js 24.

## Limitations

This demo does not include authentication or access control. Concurrent edits use last-write-wins.
