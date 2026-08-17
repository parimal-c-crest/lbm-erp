# AccountStatement — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/AccountStatement/10-build-guidance.md`. This section is guidance
for however a downstream process structures its own implementation plan and testing documentation — it
is not itself an implementation plan, a schema migration script, or an API specification.

## Rule-to-Enforcement-Layer Mapping Approach

Each rule in `business-rules-and-validation.md` should be enforced at the most appropriate layer:

- **Domain invariant, server-side, single implementation**: the finance-charge/term-calculation rules
  (STMT-RULE observations on divisor divergence, suppression threshold, term-boundary parsing) —
  these must live in exactly one place, not re-implemented per entry point. This is the single
  highest-value fix for this module (see below).
- **Application-level check**: the B2B permission-gate decision (STMT-RULE-003) — whether to add
  defense-in-depth at this layer or formally document the B2B front-end's own authentication as
  sufficient is a deliberate design decision, not a default.
- **Data constraint**: the Batch Statement Snapshot uniqueness gap (`entities-and-fields.md` §2.6,
  `risks-and-open-questions.md` STMT-OQ-003) — enforce via the proposed `(batch_run_id, account_id)`
  unique constraint, not application-level de-duplication.

## Suggested Build Sequencing

### The central recommendation: one canonical finance/term-calculation service

The single highest-value fix for this module: **extract one shared finance-charge and payment-term
calculation service**, used identically by every entry point — the manual/batch UI path, the cron
path, and the statement engine's own inline calculations. This directly closes three related findings
in `risks-and-open-questions.md` (STMT-RISK-001, STMT-RISK-004, STMT-RISK-005), all of which stem from
the same root cause: no single implementation exists today, so each entry point drifted
independently. Given the confirmed 30x magnitude of the divisor divergence for "Net 1" term accounts,
this is a correctness-critical fix, not a code-cleanup nicety.

### Build the statement engine as its own bounded service

Consistent with this module's cohesion-based rationale (`module-overview.md` Origin section), the
rewrite should implement statement generation as a service Accounts calls into, not logic embedded
inside Accounts' own entity class the way `processAccountStatement`/`processQuickAccountStatement` are
today. The three-stage pipeline documented in `outputs.md` (content generation → HTML persistence →
delivery) maps naturally onto three service operations:

1. A **generate** operation (content generation + persistence), parameterized by account, date range,
   statement type, and scope (single account vs. batch).
2. A **deliver** operation (print/email/fax), operating on already-persisted content — this should
   remain decoupled from generation exactly as it is today, since that separation is already correct
   (the delivery layer never recomputes the number the content stage produced).
3. An **archive/retrieve** operation, backed by the normalized `statement_archive` table
   (`entities-and-fields.md` §2.6), with the storage-mode ambiguity (file path vs. inline HTML)
   resolved to an explicit field rather than implicit fallback logic.

### Security/correctness closures, in priority order

1. **Unify the finance-charge/term-calculation logic** — first priority, given the confirmed magnitude
   and the fact it affects a real dollar figure a customer sees on their statement.
2. **Resolve the full-vs-quick discount-text drift** (STMT-RISK-003) — once the shared calculation
   service exists, this should be a natural side effect of both views calling the same gated logic,
   rather than a separate fix.
3. **Decide the B2B permission-bypass question deliberately** (STMT-RISK-002; see `permissions.md`) —
   either add defense-in-depth at this layer, or explicitly document that the B2B front-end's own
   authentication is considered sufficient and this is an intentional, reviewed design choice — not
   left as an unexamined gap the way it is today.
4. **Confirm or resolve the two output-open-items with security/correctness weight before cutover**:
   Output 3's two untraced archive-insert code paths (could hide a third divergent behavior, STMT-OQ-006),
   and Output 9's unconfirmed fixed-window intent (STMT-OQ-008 — if unintentional, it's a missing
   feature customers may be relying on workarounds for).

## Test/Verification Strategy Pointer

One test per rule ID in `business-rules-and-validation.md` at minimum, plus:

- **Finance-charge golden-output tests**: known account/term/balance inputs run through the unified
  calculation service, covering both "Net 1" and non-"Net 1" terms, confirming the batch and statement
  entry points now produce identical results — directly closing STMT-RISK-001.
- **Discount-text parity test**: the same account/term/date input run through both the full and quick
  statement generation paths, asserting identical discount-text output — closing STMT-RISK-003.
- **Archive round-trip test**: generate → archive → retrieve → re-deliver (email/fax/print) for both
  storage modes (file-path and inline-HTML), confirming retrieval produces byte-identical content to
  what was originally generated, not a re-rendered/re-computed version.
- **Batch-run uniqueness test**: confirm the normalized schema's `(batch_run_id, account_id)` unique
  constraint rejects a duplicate snapshot for the same account within one run — closing STMT-OQ-003.
- **B2B permission-gate test**: whatever the deliberate decision from priority-3 above resolves to,
  add a test that asserts it — either that defense-in-depth now rejects an unauthenticated B2B
  statement request, or that the documented-as-sufficient upstream authentication is exercised and
  verified.
- **Migration audit** (not a unit test — run against the legacy system's live data): quantify how many
  archived statements rely on the inline-HTML-blob fallback vs. the file-path pointer, to size the
  storage-mode migration; quantify whether any account currently sits on "Net 1" terms with a non-zero
  finance-charge history, since those are the accounts whose historical charge amounts the divisor fix
  would have changed, worth flagging for accounting review rather than silently reconciling.
