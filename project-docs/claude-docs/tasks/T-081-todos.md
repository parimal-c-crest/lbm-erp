# T-081 — Seed realistic backend demo/test data (UOM)

Status: 3/3 complete

- [x] `backend/scripts/seed-uom-demo-data.ts` — extends T-072's frontend mock dataset server-side into the real `demo` tenant database (same Categories/Types/Groups, Rebar Bundles with full Picking Hierarchy, Bagged Concrete Mix)
- [x] `pnpm --filter backend run seed:uom` script wired into `package.json`, run successfully against `demo` tenant
- [x] Bagged Concrete Mix given a second, older Conversion Factor History row (real "rate changed over time" data) since no consuming module exists yet to create a real transactional reference — documented substitution for the mock's `isTransactionLocked: true` flag, not silently dropped
