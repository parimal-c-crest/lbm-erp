# T-078 — Conversion service backend

Status: 3/3 complete

- [x] `ConversionService.resolve` — base-unit-pivot arithmetic, both directions, qty and price
- [x] BR-007 always fractional, never whole-number-rounded
- [x] `POST /uom/conversions/resolve` — 400 when Type is not reachable through the Group (not Base, no Conversion Factor row)
