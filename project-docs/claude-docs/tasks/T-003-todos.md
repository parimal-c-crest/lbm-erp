# T-003 — Scaffold NestJS backend app

Status: 6/6 complete

- [x] Generate NestJS app in `backend/` (via `@nestjs/cli new`, `--package-manager pnpm --skip-git`)
- [x] `backend/package.json` name is `backend`, workspace member confirmed (already declared in root `pnpm-workspace.yaml`)
- [x] Added `backend/src/common/{decorators,filters,guards,interceptors,pipes,utils}/` skeleton (`.gitkeep` placeholders) per `6-development/2-folder-structure.md` §5
- [x] Added `backend/src/config/` skeleton (`.gitkeep` placeholder — real `ConfigModule` wiring is T-006's job)
- [x] `pnpm --filter backend run start:dev` boots clean ("Found 0 errors. Watching for file changes.")
- [x] `pnpm --filter backend run build` and `lint` run cleanly (lint: 1 pre-existing warning in generated `main.ts` boilerplate re: floating promise — not an error, will be addressed by our own ESLint config in T-007, not fixed ad hoc here to stay within this task's scope)

Note: `pnpm install` initially failed with `[ERR_PNPM_IGNORED_BUILDS] unrs-resolver` — pnpm's default
build-script sandboxing. Verified `unrs-resolver` is a legitimate transitive dependency of Jest's
module resolver (`pnpm why unrs-resolver` — used by `jest-resolve`, standard native-binding
postinstall), then explicitly allowed it via `pnpm-workspace.yaml`'s `allowBuilds` — not blanket-
approved without checking first.
