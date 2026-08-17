# Scope — LBM ERP Rewrite

## The short version

135 modules exist in the legacy system. 42 are out entirely. 93 are in scope long-term. Of those 93,
sixteen are the confirmed first build target, plus two more capabilities we split out of that sixteen
once we understood them well enough to see they deserved their own boundary. Everything else — the
remaining 78 in-scope modules, the technology stack, UI/UX design — is real, acknowledged future work
that hasn't started.

## In scope: the MVP sixteen

Confirmed on 2026-08-15 as the first build target, chosen because they represent the highest-value,
highest-risk core of the business:

SalesOrder, Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory,
PurchaseOrder, PurchaseLineItem, PurchaseHistory, MPLPricePlan, Pricebooklevel200, Pricebooklevel300,
Pricebooklevel800.

Each of these has a completed legacy blueprint (the full nine-pass extraction) and a completed
tech-agnostic specification. Module-by-module detail is in `module-breakdown.md`.

## In scope: two extracted capabilities

While specifying the sixteen, we found two pieces of functionality that didn't fit cleanly inside the
module they lived in:

- **Unit of Measure (UOM)** — originally just part of Products, but it turned out that a dozen-plus
  other modules (SalesOrder's warehouse allocation, PurchaseOrder, Receiving, StoreTransfer,
  Manufacturing, Kits, and a string of reporting screens) all reach directly into its data with no
  real boundary, and at least one of them had already drifted into its own copy of the conversion math.
  That's exactly the shape of problem a rewrite should fix by giving UOM its own service boundary, so
  we specified it as its own module rather than leaving the finding buried inside Products' spec.
- **Account Statement** — originally just part of Accounts, but at roughly 10,900 lines of code, four
  dedicated database tables, and around thirty dedicated configuration fields, it's large and
  self-contained enough to warrant its own specification. Unlike UOM, this wasn't about fixing a
  coupling problem — it's a size-and-cohesion call, and the legacy code itself already treats it as a
  distinct area (there's a permission check literally named `AccountStatement` in the current system).

Both are held to the same tech-agnostic-specification standard as the sixteen, with the caveat that
neither went through its own from-scratch legacy blueprint — UOM's cross-module findings came from
direct code research rather than a full blueprint pass, and that's documented explicitly in its own
specification rather than glossed over.

## In scope, not yet started: 78 modules

These are confirmed as genuinely part of the system's long-term rewrite scope, but no blueprint or
specification work has begun on them. They're deferred, not excluded — the full list lives in
`blueprint/module-blueprint-scope.md` and should be treated as the living source of truth for exactly
which modules these are, since that list is actively maintained and this document isn't going to
duplicate it and risk drifting out of sync.

## Out of scope: 42 modules

Identified and confirmed as not worth carrying into the rewrite — dead features, vestigial integrations,
functionality nobody uses anymore. One of them (Administration) was investigated specifically and
confirmed dead: no registered entry in the system's module table, no live code path that calls it.
The full excluded list, with reasoning, is also in `blueprint/module-blueprint-scope.md`.

## Out of scope, full stop (for this phase of work)

- **Technology stack selection.** The rewrite's target language/framework/database hasn't been chosen,
  and choosing it isn't part of the specification work itself — it's a decision the specification work
  is meant to inform, not preempt.
- **UI/UX design.** Every module specification includes an inferred "screens and user flows" section,
  but that's a structural inference from the data and business rules, not a design deliverable — actual
  interface design is separate, later work.
- **Deployment/cutover execution.** Each module's blueprint includes an outline-depth deployment and
  cutover document, but executing an actual migration plan is out of scope until a stack is chosen and
  build work is underway.

## How scope changes

Scope isn't frozen by this document — it's tracked live in `blueprint/module-blueprint-scope.md`, which
has already been updated at least once (the Administration-module exclusion, added after investigation
confirmed it was dead). Any future addition, removal, or reclassification of a module should go through
that tracker first; this document should be treated as a snapshot of it, not a replacement for it.
