# T-002 — Set up pnpm workspace (`pnpm-workspace.yaml`, root `package.json`)

Status: 5/5 complete

- [x] Create `pnpm-workspace.yaml` declaring `backend` and `frontend` as workspace members
- [x] Create root `package.json` (private, workspace-root scripts: dev/build/lint/typecheck/format, filtered across both apps)
- [x] Add root `.npmrc` — not needed, no real requirement surfaced; skipped rather than added preemptively
- [x] Add `engines` field pinning Node.js `>=24` (Active LTS as of 2026-08) and `pnpm >=10`; `packageManager` field pins exact pnpm `11.15.1`
- [x] Verified `pnpm install` runs cleanly at workspace root (`pnpm-lock.yaml` generated, no errors with `backend`/`frontend` not yet existing)
