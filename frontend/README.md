# Kanban Studio

## Run

```bash
npm install
npm run dev
```

## Production build

`npm run build` creates a deterministic static export in `out/`. FastAPI serves
that export at `/` when it is present. The Docker image builds this export in a
Node stage and copies it into the FastAPI image, so the production app does not
need a Next.js server.

## Tests

```bash
npm run lint
npm run build
npm run test:unit
npm run test:e2e
```

Playwright builds the export and starts FastAPI on port 8000, exercising the
same static app used by the container.

## MVP sign-in

The board is protected by a client-side fake sign-in using username `user` and
password `password`. The username is stored in `localStorage`; the Basic
authorization header is stored only in `sessionStorage` for the current tab.
The backend validates every board request and persists it in SQLite. This is
not production authentication: encoded credentials remain browser-readable for
the tab and the password is never sent beyond the API request.
