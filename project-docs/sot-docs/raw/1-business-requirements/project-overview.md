# Project Overview — LBM ERP Rewrite

## What LBM runs on today

LBM's operations — sales orders, purchasing, pricing, inventory across locations, vendor management,
accounts receivable, and everything downstream of those — all run on a system built on top of vtiger
CRM 5.0.4. "Built on top of" undersells it a bit: over roughly two decades, 135 distinct modules were
added, and the parts of vtiger that remain visible are mostly the plumbing underneath. The business
logic, the pricing engines, the warehouse workflows — all of it is custom, all of it grew organically,
and none of it was built with a consistent security or data-access standard in mind.

## Why we're replacing it instead of maintaining it

The short version: the platform it's built on is end-of-life and unsupported, and the custom layer on
top has never been audited end to end. Once we started systematically documenting modules ahead of a
rewrite decision, the pattern became unavoidable — every module examined so far has at least one
confirmed, live SQL injection, and one module (Settings) alone accounts for roughly forty-seven of
them, on top of storing integration credentials in plaintext. This isn't a modernization nice-to-have;
it's catching up to a security posture that's already caused at least one real data-loss incident,
traced during this same effort back to a defect in the Users module.

## How we're approaching the rewrite

Rather than starting from a requirements-gathering exercise that guesses at what the current system
does, we're extracting the legacy system's actual behavior first, module by module, directly from the
running code and the live database. Each module goes through a structured, nine-pass process — what
files and functions exist, what the real data model is, what business rules are actually enforced,
what the status/lifecycle logic looks like, how money gets calculated, what documents and reports get
produced, how the module depends on others, and a re-verification pass that checks earlier findings a
second time. The output of that process (we call it the "blueprint") is then reorganized into a
tech-agnostic specification — the same facts, restructured around what the new system needs to do,
independent of whatever programming language or framework ends up building it.

## Where we are

Sixteen modules are through this full process and make up the confirmed first build target: SalesOrder,
Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory, PurchaseOrder,
PurchaseLineItem, PurchaseHistory, MPLPricePlan, and the three price-book tiers. Along the way we found
two more capabilities worth pulling out as their own units — Unit of Measure, which turned out to be
genuinely shared logic touching a dozen-plus other modules with no real boundary around it today, and
Account Statement, which is large and self-contained enough to warrant its own specification even
though it lives inside the Accounts module in the legacy system.

Of the system's 135 modules total, 42 have already been ruled out as dead weight — vestigial features,
abandoned integrations, things nobody uses — and 93 remain genuinely in scope for the rewrite,
long-term. The sixteen (plus the two extracted capabilities) are the first slice of those 93, chosen
because they're the highest-value, highest-risk core of the business.

## What isn't decided yet

The technology stack the rewrite will actually be built on hasn't been chosen. That's deliberate — we
wanted the specification layer to exist first, so the stack decision can be informed by what the system
actually needs rather than made in a vacuum. Budget, timeline, and named project sponsorship also
aren't settled anywhere in the current project record, and this overview isn't going to paper over that
with invented numbers.
