# Module Breakdown — LBM ERP Rewrite

The sixteen MVP modules, plus the two capabilities we extracted from within them, one paragraph each.
This is a business-requirements-level summary — full detail lives in each module's own specification
under `docs_from_blueprint/module/`.

**SalesOrder** — the pilot module, and the largest and most complex in the set: plain sales orders,
quotes, service contracts, and a faster "Quick SO" flow, plus buyout/backorder/transfer handling.
Established the extraction method every other module followed. Headline finding: a client-trusted
finalized total — the server doesn't always independently recompute what the client submits, one of
three Critical risks in this module alone.

**Accounts** — customer account master data, credit limits, B2B portal access, and (as its own
extracted capability, see below) customer billing statements. Headline finding: a confirmed SQL
injection in the SPA-code save path, plus a B2B portal authentication flow that compares plaintext
passwords with no hashing at all.

**Users** — internal user accounts, roles, permissions, and time-clock/payroll-adjacent data. This is
the module where we traced the root cause of a real prior data-loss incident, all the way through the
`deleteRole()` logic, plus found a live SQL injection in everyday clock-in and personal-day endpoints.

**Location** — multi-location inventory and quantity-on-hand. Headline finding: no guard anywhere
against negative quantity-on-hand, across four independent write paths, plus six confirmed SQL
injections.

**Products** — the product catalog, the largest module we've blueprinted (209 files). Eleven confirmed
SQL injections, one inside the core save hook itself, meaning it's reachable from an ordinary product
edit. Barcode uniqueness isn't enforced anywhere. Also where we discovered UOM's cross-module coupling
problem while investigating whether other functionality inside Products deserved its own module.

**Vendors** — vendor master data and line-code pricing agreements. Highest concentration of Critical
findings of any module we've checked (five, in just 37 files), including a bug where editing one
vendor's line-code description silently overwrites the same field for every other vendor sharing that
code.

**SearchLineItem** — the smallest module in the set. A read-model whose real writer is SalesOrder's own
finalize routine, not its own save path — a good example of why we blueprint before assuming a module's
"save" logic actually does anything.

**Settings** — org-wide configuration, integrations, tax setup, company profile. The worst-risk module
we've found anywhere in the system: eight Critical findings across five different defect categories,
roughly forty-seven confirmed SQL injections across about twenty-two files, and AWS/payment-gateway
credentials stored in plaintext with zero escaping.

**SalesHistory** — historical sales rollups used for reporting and reorder logic. Headline finding: four
independent writers computing the same `total_activity` figure with three different formulas and no
locking between them, so the number can silently disagree depending on which writer touched it last.

**PurchaseOrder** — the purchasing counterpart to SalesOrder, comparably large (132 files, over 40,000
lines including templates). Fourteen confirmed SQL injections, including one where the actual SQL
column name is built from raw request input on a routine PO edit — not just a value, the column itself.

**PurchaseLineItem** — line-item detail for purchase orders. Another read-model module (six independent
real writers, its own save path effectively unused), plus a bug where an ajax endpoint instantiates the
wrong entity class entirely, meaning it's never actually edited this module's data through any
legitimate path.

**PurchaseHistory** — the purchasing-side counterpart to SalesHistory. Notably the cleanest module we've
found: its three real writers use a byte-for-byte identical formula, no drift. Still has one confirmed
SQL injection in its own save logic.

**MPLPricePlan** — Master Price List pricing-rule authoring. Widest injection surface of any module so
far — fourteen confirmed SQL injections across just twenty-nine cataloged rules — plus a delete function
that reaches into an entirely different module's table with no authorization check at all.

**Pricebooklevel200 / Pricebooklevel300 / Pricebooklevel800** — three tiers of a customer-specific
pricing-rule engine. Each has its own rule table technically owned by a separate sibling module with no
enforced foreign key between them, and each has its own list of confirmed SQL injections (sixteen,
twelve, and four, respectively). The 800 tier's header table currently has zero live rows, which means
every price lookup that should use it silently computes zero instead — traced back to a correctly
written cascade-delete function that's simply never called.

**UOM (Unit of Measure)** — extracted from Products once we found that a dozen-plus other modules
(SalesOrder's warehouse allocation, PurchaseOrder, Receiving, StoreTransfer, Manufacturing, Kits, and
assorted reporting screens) all reach directly into its conversion tables with no shared boundary, and
at least one of them had already drifted into its own copy of the conversion formula. Also carries two
newly-found SQL injections that no prior module blueprint had caught, because nothing had looked at UOM
as its own subject before.

**Account Statement** — extracted from Accounts on size and cohesion grounds (roughly 10,900 lines,
four dedicated tables, thirty-odd configuration fields). Headline finding: two different finance-charge
calculations exist in the system — one on the manual/batch path, one on the automated cron path — and
they disagree by roughly a factor of thirty for certain payment terms, meaning which one runs
determines how much a customer actually gets charged.
