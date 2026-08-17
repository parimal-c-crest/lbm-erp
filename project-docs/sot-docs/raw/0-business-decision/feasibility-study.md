# Feasibility Study — LBM ERP Rewrite

## The question we're actually answering

"Is a rewrite feasible" is too vague to be useful for a system this size, so we broke it into three
narrower questions: can we actually understand the legacy system well enough to rebuild it correctly,
can the organization actually support a rewrite of this scope, and is there anything about the target
we don't yet know that could derail the whole approach. Short version: yes, mostly yes, and one real
open item (the technology stack) that we're deliberately not forcing a premature answer to.

## Technical feasibility

We didn't take technical feasibility on faith — we tested it by actually doing it. Sixteen modules
have now been through the full extraction process: a structural inventory of every file and function,
a field-by-field pass against the live database schema, a numbered catalog of every business rule we
could find, a status/lifecycle map, the financial calculation pipelines, the documents and reports each
module has to produce, its dependencies on other modules, and a re-verification pass that goes back and
checks the earlier findings against the code a second time. That's not a proposed method — it's a
method we've run sixteen times and refined as we went.

The output isn't just documentation for its own sake. Each of those sixteen modules also has a
tech-agnostic specification derived from the blueprint — entities, business rules, financial logic,
outputs, cross-module boundaries, risks, and a build-guidance document that maps every rule to where it
should be enforced in a new system. In two cases (UOM and the account-statement capability) we found
functionality bundled inside a larger module that genuinely deserved its own boundary, and split it out
with the reasoning documented alongside it. That's the kind of finding you can only make by actually
reading the thing, not by inferring it from a requirements interview.

So: is it technically feasible to understand this system well enough to rebuild it? We're sixteen
modules into a live demonstration that it is. The open question isn't "can this be done," it's "how
long will it take to do it for the other 78 in-scope modules," which is a scoping question, not a
feasibility one.

## What we don't have yet, and shouldn't pretend to

The target technology stack hasn't been chosen. That's intentional at this stage, not an oversight —
the tech-agnostic specification layer exists specifically so that stack selection can happen once,
informed by what the sixteen MVP modules actually need, rather than being locked in before we knew
enough to make a good choice. The legacy system runs on PHP and MySQL; nothing about the rewrite
requires staying on either.

There's also an open multi-tenancy question that surfaced during the UOM extraction: several of the
unit-of-measure tables we examined carry no tenant or company column at all, which is consistent with
how the rest of the legacy schema is built (tenancy enforced at the deployment level, not the row
level) but was never independently confirmed as intentional rather than a gap. That needs a real
decision before schema design locks in for any module that touches shared configuration data, not just
UOM.

## Organizational feasibility

Every module's build guidance already names the sign-off gates it needs before implementation starts —
things like confirming the corrected Global Weighted-Average-Cost formula with whoever owns pricing
policy, or getting a product-owner decision on whether the Door Configuration subsystem inside Products
is even in scope for the rewrite. These aren't generic "stakeholder engagement" placeholders; they're
specific, named decisions tied to specific findings, and they're already logged per module rather than
left to be discovered during implementation.

What we don't have documented anywhere in the surviving project record is a named executive sponsor, a
committed budget, or a timeline. Those aren't feasibility blockers by themselves, but they are
constraints this study can't resolve, and this document isn't going to invent numbers to make it look
more settled than it is.

## Schedule feasibility

We're not going to give a project-wide date, because we don't have a reliable basis for one — the
blueprint effort for sixteen modules took an amount of effort we can measure in hindsight but haven't
yet normalized into a per-module estimate solid enough to multiply by 78 remaining modules with a
straight face. What we can say is that the method scales the way we've been running it (one module at
a time, fully documented before it's touched for rewrite), and that the modules already done are the
ones most likely to justify the effort, since they're also the ones carrying the worst-documented
security exposure.

## Bottom line

The rewrite is technically feasible — we've already proven the extraction method works at meaningful
scale. It's organizationally feasible in the sense that the sign-off structure needed to keep it moving
already exists module by module. It is not yet feasible to commit to a stack, a budget, or a finish
date, and pretending otherwise in this document would just be manufacturing false confidence.
