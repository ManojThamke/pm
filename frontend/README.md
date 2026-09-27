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
password `password`. A successful sign-in stores only the username in browser
`localStorage`, so it survives refresh; logging out removes it. This is not
secure authentication: credentials and session state are readable by the
browser, there is no server-side authorization, and it must not be used for
production or sensitive data.
