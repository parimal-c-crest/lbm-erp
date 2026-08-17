# 7-cross-cutting

> **Purpose**
>
> Holds documents that don't belong to any single category — they cross-check decisions already made across `1-project/`, `2-database/`, `3-api/`, `4-ui/`, `5-modules/`, and `6-development/` rather than defining a new domain. Generated last, once everything they evaluate already exists — generating them earlier would mean cross-checking against decisions that haven't been made yet.

Templates live in `templates/`. Both documents in this category depend on the rest of the docs-kit being complete (or nearly so) — see each template's own dependency list.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-non-functional-requirements.md` | Measurable quality targets — performance, availability, scalability, security/compliance — implementation must design against, not check for after the fact. |
| 2 | `templates/2-threat-model.md` | Attack surface, threats, and mitigations — evaluates `3-api/`'s auth/authz mechanisms and `6-development/`'s coding standards against realistic attack scenarios. |

## Before You Start

Generate `1-project/` through `6-development/` first. `1-non-functional-requirements.md` can technically be drafted as soon as `1-project/4-tech-stack.md` exists (it mainly cross-checks stack choices), but stays in this category rather than `1-project/` because it's evaluated jointly with the threat model, which genuinely does need everything else done first — keeping both in one late-running category is simpler than splitting the "cross-cutting" concept in half.

## Why this category exists

Earlier versions of this template put non-functional requirements in `1-project/` and the threat model in `6-development/`, purely because those were the categories with an open filename slot — neither is really "what we're building" or "how we build it day-to-day." A document that only makes sense once everything else is decided belongs in its own category, not wherever had room.
