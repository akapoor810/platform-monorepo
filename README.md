# platform-monorepo

Internal platform monorepo for Acme Corp. Contains the web dashboard, REST API, shared libraries, CLI tooling, and infrastructure-as-code.

## Structure

```
packages/
  web/          # React + Vite frontend dashboard
  api/          # Express.js REST API
  shared/       # Shared TypeScript types & utilities
  cli/          # Internal developer CLI
  infra/        # Terraform modules & Docker configs

libs/
  auth/         # Authentication & SSO library
  logger/       # Structured logging (pino-based)
  db/           # Prisma ORM wrapper & migrations
  queue/        # BullMQ job queue abstraction
```

## Getting Started

```bash
pnpm install
pnpm build
pnpm dev          # starts web + api in parallel
```

## Testing

```bash
pnpm test                 # unit tests (vitest)
pnpm test:e2e             # playwright e2e
pnpm test:integration     # API integration tests
```

## Deployment

Staging deploys are triggered on push to `main`. Production requires a manual approval step in the GitHub Actions workflow.

See `packages/infra/` for Terraform and Docker configuration.
