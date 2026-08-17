# AccountStatement — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/AccountStatement/04-status-workflow.md`.

## Applicability

Applicable, but only partially — unlike most entities in this series, the Statement Archive row does
carry real status-shaped fields, but **not a single unified state-machine column**. There are two
independent status flags plus an implicit generation lifecycle, documented below. This is stated
explicitly rather than inventing a formal state machine the source doesn't have.

## States

| State | Meaning |
|---|---|
| Display Status = No (default) | Archived statement does not appear in the archive listview. (`.displaystatus`, boolean) |
| Display Status = Yes | Archived statement appears in the archive listview. No confirmed transition path independently traced that sets this to the display-eligible state — see `risks-and-open-questions.md` STMT-OQ-001. |
| Email Status = N/A (default) | No email delivery has been attempted for this archived statement. (`.emailstatus`, enum) |
| Email Status = Yes | Statement was successfully emailed, per `AccountStatement.php:5958 sendStatementinMail`. |
| Email Status = No | An email attempt was made but did not succeed. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| (no archive row) | Archive row created, Display Status = No, Email Status = N/A | Statement content generation completes (single, quick, or batch) | Generation pipeline reaches the HTML-persistence stage | HTML content and/or file path written; row inserted |
| Email Status = N/A | Email Status = Yes / No | Email-delivery mechanism invoked (`sendStatementinMail`) | Recipient email resolves per delivery-preference rule | Email sent (or not), status recorded |
| Display Status = No | Display Status = Yes | Not independently confirmed | Unknown — open item | Unknown — open item |

## State Diagram

Informal, since no formal state machine exists in the source — the real lifecycle inferred from the
three-stage generation pipeline (`outputs.md` — content generation → HTML persistence → delivery) is:

```
generated (content built, HTML persisted)
   -> archived (Statement Archive row created)
   -> delivered (email/fax/print acted on the persisted HTML)
   -> retrieved (re-displayed from the archive; same delivery actions re-runnable
      against the already-archived content)
```

Display Status and Email Status are each narrow, single-purpose flags layered on top of this implicit
lifecycle, not fields of one unified status column.

## Batch run correlation, not a status

The Batch Statement Snapshot's `statementtime` field is a correlation key identifying which batch run
a snapshot belongs to, not a status field — it has no transition semantics of its own, just groups
rows generated in the same run.
