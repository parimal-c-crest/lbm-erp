# T-082 — Full UOM module test suite + OpenAPI docs tags

Status: 3/3 complete

- [x] `backend/test/uom.e2e-spec.ts` — real Postgres/Redis e2e suite covering BR-001/002/007/008/009/010/014/017/019/020/021 and VR-017, plus 401/403 authorization. 20/20 passing.
- [x] `@ApiTags('UOM')` on every controller (Categories/Types/FunctionalRoles/Groups/History/Conversion/ImportExport) — appears in `/api/docs` Swagger UI.
- [x] Live verification: full List→Detail→Edit→Create→Delete→Import/Export flow re-run directly against the running dev server (port 3000) and the real `demo` tenant database — matches e2e results.
