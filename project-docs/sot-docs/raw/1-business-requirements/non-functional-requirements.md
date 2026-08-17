# Non-Functional Requirements — LBM ERP Rewrite

## Security — the headline NFR

This isn't one item on a checklist; it's the requirement the entire rewrite decision rests on. Every
module blueprinted so far — all sixteen of the MVP set, plus both extracted capabilities — has at least
one confirmed, live SQL injection. Settings alone carries roughly forty-seven of them across about
twenty-two files, on top of storing AWS and payment-gateway credentials in plaintext with zero
escaping. This isn't a pattern of a few careless developers; it's evidence the legacy system never had
a consistent data-access standard at all.

The rewrite's data-access layer must make the two confirmed injection shapes — unescaped/unparameterized
values, and dynamic construction of SQL identifiers (column or table names) from request input —
structurally unavailable to ordinary business logic, not merely discouraged by convention. Credential
storage (API keys, payment-gateway tokens, integration secrets) must be encrypted at rest by default,
not left to individual modules to remember to do correctly. Authentication must never compare
credentials in plaintext — the current B2B portal login does exactly that.

## Data integrity

Several confirmed findings point to the same underlying gap: the legacy system enforces very little at
the database level, and relies instead on application code remembering to check things correctly, which
it doesn't always do.

- **Quantity can go negative.** Location has no guard against negative quantity-on-hand across four
  separate write paths.
- **Uniqueness isn't enforced where it should be.** Product barcodes aren't checked for uniqueness
  anywhere in the legacy system.
- **The same number can be computed differently by different writers.** SalesHistory has four
  independent writers computing the same activity total with three different formulas and no locking.
  PurchaseLineItem has a six-way version of the same problem. Account Statement's finance-charge
  calculation disagrees with itself by roughly a factor of thirty depending on which code path runs.
- **Relationships aren't always real relationships.** Several pricing modules (the three Pricebooklevel
  tiers, MPLPricePlan) reference sibling modules' tables by matching a name string, not a foreign key —
  meaning nothing in the database actually guarantees the reference is valid.

The rewrite should treat these as structural requirements, not bugs to patch individually: real foreign
keys where a relationship exists, real unique constraints where uniqueness matters, and single-owner
write paths (or explicit optimistic-concurrency handling) wherever more than one process currently
computes the same figure.

## Multi-tenancy

This is a multi-tenant SaaS system, but tenant scoping isn't consistently visible at the data layer —
UOM's tables, for instance, carry no tenant/company column at all. Whether that's intentional (tenancy
enforced entirely at the deployment level, one database per customer) or a genuine gap was not
confirmed during the blueprint work and needs an explicit decision before schema design locks in for
any module touching shared configuration data, not an assumption in either direction.

## Auditability

The blueprint and specification work itself has set a standard worth carrying into the rewrite's own
requirements: every finding traces to a specific file, line, or query result, and every open question
is recorded rather than silently resolved. The new system should be built with the same instinct —
changes to financial figures, pricing rules, and account data should be traceable to who made them and
when, not just correct in the moment. This isn't formally specified as an audit-log requirement per
module yet, but it's implied strongly enough by the documentation style itself that it belongs here as
a stated expectation.

## Performance

Not independently assessed as part of the blueprint work — no module's specification currently includes
load, volume, or response-time targets. This is a real gap, not an oversight this document is
resolving; performance requirements should be gathered separately once the technology stack is chosen,
since sensible targets depend heavily on what that stack can do.

## Availability / reliability

Also not independently assessed. The legacy system's actual uptime history, backup/recovery posture,
and disaster-recovery plan aren't documented anywhere in the surviving project record. This should be
treated as an open item for whoever owns infrastructure, not assumed to be "whatever the legacy system
currently does" without checking.
