# Finni Patient Dashboard

A patient dashboard for a single independent practice, built with React, Express, and SQLite.

This is an independent demo, not an official Finni Health product. The Finni Health name and logo belong to their respective owner.

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

Tests cover frontend interactions, API behavior, SQLite persistence, and shared validation. Browser end-to-end tests are not included.

Run `npm run test:client`, `npm run test:server`, or `npm run test:shared` to test each area separately.

[GitHub Actions](.github/workflows/checks.yml) runs these checks on pushes and pull requests using Node.js 24.

## Limitations

This demo does not include authentication or access control. Concurrent edits use last-write-wins.
