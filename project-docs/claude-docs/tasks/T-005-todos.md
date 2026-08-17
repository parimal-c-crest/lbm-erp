# T-005 — Initialize Prisma schema + local dev PostgreSQL database

Status: 7/7 complete

- [x] Created local PostgreSQL databases: `lbm_erp_dev`, `lbm_erp_test`. `lbm_erp_dev` had unrelated pre-existing tables/migrations (not ours) — flagged and developer-confirmed safe to reset before use (Prisma's own AI-agent safety gate required a second explicit confirmation for `migrate reset`, honored).
- [x] Added Prisma to `backend` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`) — approved `@prisma/engines`/`prisma` postinstall build scripts after confirming they're legitimate (official Prisma binaries).
- [x] Initialized `prisma/schema.prisma` at the workspace root — datasource + generator only, no business entities (none documented yet, per JIT model). Generator uses `moduleFormat = "cjs"` (Prisma 7 defaults to ESM, which doesn't match this CJS NestJS scaffold) and outputs to `backend/src/generated/prisma` (must live inside `backend/src/` — outside it broke `rootDir`-based emit, see notes below).
- [x] Wired `backend/src/prisma/` (`PrismaService`, `PrismaModule`, globally exported) per `6-development/2-folder-structure.md` §5. Prisma 7 requires an explicit driver adapter (`PrismaPg`) — plain connection-string `datasource.url` alone throws `PrismaClientInitializationError` at runtime.
- [x] `DATABASE_URL` configured in `backend/.env` and root `.env` (Prisma CLI runs from the shared root `prisma/`) — both gitignored; `.env.example` documents the placeholder.
- [x] `prisma migrate dev` confirmed against clean `lbm_erp_dev` — connection pipeline verified end to end (no migration created, since no models exist yet; that's expected).
- [x] `prisma studio` confirmed opening against the local database (port 5555).

**Real bugs found and fixed while verifying the pipeline (not scope creep — these blocked "does the
dev loop actually work," this task's real acceptance bar):**
- A stray `backend/tsconfig.build.tsbuildinfo` (created by an earlier manual `tsc` invocation during
  debugging) fooled TypeScript's incremental compiler into skipping output after `dist/` was deleted
  — `nest start --watch` reported "0 errors" but never wrote `dist/main.js`. Removed the stray file;
  added `*.tsbuildinfo` to `.gitignore` so this can't recur silently.
- `backend/tsconfig.json` had no `include`, so `**/*` swept in `test/` and the (now correctly
  `src/`-scoped) generated Prisma client — fixed by scoping `tsconfig.build.json`'s own `rootDir` to
  `./src` (build output stays flat at `dist/main.js`) while the base `tsconfig.json` keeps `test/`
  visible for ESLint's type-aware linting.
- Root `package.json` (T-002) had a `dev` script filtering `backend`, but `backend/package.json` had
  no `dev` script (only `start:dev`) — added a `dev` alias in `backend/package.json`, and added
  missing `typecheck` scripts to both `backend`/`frontend` (root's `typecheck` script referenced them
  but they didn't exist). Minor, adjacent to T-002's own scope, fixed here rather than left broken
  for whoever hit it next.
- Added root `postinstall: "prisma generate"` (with `prisma` as a root devDependency) since the
  generated client is gitignored (generated code, not source) — a fresh clone now gets a working
  client automatically on `pnpm install`, no manual step.
