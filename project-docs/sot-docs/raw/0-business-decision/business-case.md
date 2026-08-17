# Business Case — LBM ERP Rewrite

## Why we're here

LBM runs its distribution business on a system that was originally vtiger CRM 5.0.4, an open-source
platform that hit end of life years ago, and has since been customized so heavily — 135 modules'
worth — that "vtiger" is really only the skeleton underneath. Everything that actually runs the
business (sales orders, purchasing, pricing, warehouse operations, statements, the works) was bolted on
top of that skeleton by whoever needed it, whenever they needed it, without much consistency in how it
was built. That's not a criticism of the people who built it — it's what happens to any system that
stays load-bearing for two decades without a rewrite budget. But it leaves us in a position where the
platform itself can't be patched (nobody supports vtiger 5.0.4 anymore) and the custom layer on top of
it was never audited as a whole.

We started finding out just how much that mattered once we began systematically documenting the system
module by module, ahead of any rewrite decision. Sixteen modules in, the pattern is no longer
ambiguous: **every single module we've examined so far has at least one confirmed, live SQL injection.**
Settings — the module that stores integration credentials, tax configuration, and company profile data
— has roughly forty-seven of them, plus AWS and payment-gateway credentials stored in plaintext with no
escaping at all. That's not a hypothetical risk section in a slide deck; it's a documented,
file-and-line-cited finding against the code running today.

## What patching in place would actually cost

The instinct is always to ask "can't we just fix the bugs and keep going?" We looked at that seriously,
and the honest answer is: fixing the SQL injections module by module, in place, doesn't fix the
underlying problem, because the problem isn't a handful of bad queries — it's that the codebase has no
consistent data-access discipline at all. Some queries are parameterized, some aren't, and there's no
structural reason a new one written next month would be safe by default. Patching the symptoms one at a
time, forever, is a worse long-term position than accepting that the platform needs to be rebuilt on a
foundation where "unescaped query reaches the database" simply isn't a category of bug that can happen.

There's also a real precedent here, not a theoretical one: we traced the root cause of a prior
data-loss incident all the way back through the Users module's `deleteRole()` logic during this
documentation effort. That incident already happened. It's part of why this isn't an abstract
modernization pitch — it's catching up to damage the current architecture has already caused once.

## What we get from doing this the slow way

Rather than starting a rewrite by guessing at what the legacy system does, we've been extracting it
first — reading the actual code, querying the actual dev database, and writing down exactly what each
module does, what data it owns, what's broken, and what's just dead weight nobody uses anymore. That
sounds slower than "just start building," and it is, up front. But it means the sixteen modules we've
covered so far (the ones that make up the MVP — order entry, accounts, users, inventory location,
products, vendors, and the core pricing modules) already have a build-ready specification instead of a
guess. We're not going to rediscover mid-build that a "simple" module actually has three
independently-drifting cost formulas with no locking between them — we already know that about
SalesHistory, and we know it about PurchaseLineItem too, because we found it before writing a line of
new code.

## The cost of doing nothing

Every month the legacy system keeps running as-is, it keeps accumulating the same category of risk it
already has — more custom code layered onto an unaudited base, more chances for a defect like the
`deleteRole()` one to resurface somewhere we haven't looked yet. We haven't put a dollar figure on that,
because we don't have good data on breach probability or downtime cost for this specific system, and we
don't want to manufacture a number that sounds precise but isn't grounded in anything. What we do have
is a growing, cited list of confirmed live security defects across every module we've checked, and no
credible in-place remediation path that doesn't amount to a rewrite of the data-access layer anyway.

## The ask

Approve continuing the blueprint-and-rewrite approach past the sixteen-module MVP scope we've already
committed to, with the understanding that the sixteen already documented represent the highest-value,
highest-risk core of the system, and that the remaining ~78 in-scope modules (of 135 total, with 42
already ruled out as dead or irrelevant) will follow the same disciplined extraction process before
being built, not after.
