# Project Documentation Framework

> **Purpose**
>
> This `docs/` folder is a **standardized documentation framework** used before any development begins on a project. It defines *what* needs to be planned, designed, and agreed upon — across business requirements, architecture, database, API, UI, individual feature modules, and development practices — so that any AI coding assistant (or human developer) can pick up the project with full context and build it consistently, without guessing or re-asking basic questions.
>
> This README is the entry point. Read it first, in full, before opening any other document in this folder.

---

## What This Is

This is a **template-driven, AI-first documentation system**. Every document in this folder:

- Follows the **same standard structure** (see "Document Template Pattern" below).
- Is meant to be **filled in once, per project**, before or alongside development.
- Is written so an **AI tool can read it and generate correct, consistent output** — code, schemas, APIs, UI, tests — without needing external clarification.
- Cross-references related documents so context can be traced end-to-end (business need → architecture → database → API → UI → module → implementation → testing).

Currently the files are **blank templates**. Once filled in by the team (or by an AI assistant during discovery), this becomes the single source of truth for the project.

---

## Folder Structure

```
docs/
│
├── 1-project/         Business context, requirements, features, tech stack
├── 2-database/        Database design, ERD, migrations, standards
├── 3-api/              API design, auth, standards, versioning, OpenAPI/Postman
├── 4-ui/                Navigation, UX flows, design system, component/accessibility standards
├── 5-modules/         Per-feature documentation (one folder per business module) + templates/
├── 6-development/    Dev environment, workflow, CI/CD, testing, deployment
├── 7-cross-cutting/  Non-functional requirements and threat model — concerns spanning every module
└── README.md           This file
```

### Read/Build Order

The folders are numbered because they represent the **order in which decisions should be made** — later folders depend on earlier ones:

```
1-project            →  What are we building and why?
        ↓
2-database           →  What data does it need to store?
        ↓
3-api                →  How is that data exposed and consumed?
        ↓
4-ui                 →  How do users interact with it?
        ↓
5-modules             →  Feature-by-feature detailed specs (uses 1-4 as shared standards)
        ↓
6-development         →  How is it built, tested, and shipped?
        ↓
7-cross-cutting       →  What quality/security bar must all of the above meet?
```

An AI tool should **not** jump straight to writing code or designing a module without first understanding `1-project` (especially requirements, feature breakdown, and tech stack) and the relevant global standards in `2-database`, `3-api`, and `4-ui`.

---

## Folder-by-Folder Purpose

| Folder | Purpose |
|---|---|
| **1-project/** | Project overview, requirements, feature breakdown, and the official tech stack. The business "why" and "what" of the whole project. |
| **2-database/** | Database design, ERD, standards (naming, indexing, constraints), and migration strategy — applies globally across all modules. |
| **3-api/** | Global API architecture and standards: design principles, auth/authorization, request/response/error/versioning conventions, plus `openapi.yaml` and a Postman collection. |
| **4-ui/** | Global UI/UX architecture: navigation, user flows, design system, component/form standards, responsive design, and accessibility. |
| **5-modules/** | One subfolder per business feature (e.g. `authentication/`, `users/`, `products/`, `orders/`). Each module folder contains a full set of documents (see below) describing that one feature end-to-end. Has its own `README.md` explaining the module framework in detail, and a `templates/` folder to copy when starting a new module. |
| **6-development/** | How the project is actually built day-to-day: local dev environment, folder structure, coding standards, git workflow, implementation workflow, testing, deployment, containerization, CI/CD, debugging. |
| **7-cross-cutting/** | Concerns that apply across every module rather than one: measurable non-functional requirements (performance, availability, scalability, security, operability) and the system-wide threat model. |

---

## Document Template Pattern

Every document (outside of `5-modules/README.md` and `5-modules/templates/`) follows the **same skeleton**, so an AI tool can parse any file in this repo the same way:

1. **Title + Purpose** — a blockquote explaining what this specific document is for.
2. **Document Information** — a metadata table (project name, version, status, author, dates).
3. **Numbered sections** (`# 1. ...`, `# 2. ...` etc.) — the actual content, each with instructional text or examples showing what should go there (these are prompts for whoever/whatever fills the doc in, not final content).
4. **Assumptions / Constraints / Risks** — explicitly captured, not left implicit.
5. **Related Documents** — links to other docs this one depends on or feeds into, for traceability.
6. **Revision History** and **Approval** — version control and sign-off tracking.
7. **AI Generation Notes** — explicit instructions for an AI tool on how to fill in *this specific document*: what to focus on, what to avoid, and which other documents to stay consistent with.

**The "AI Generation Notes" section at the bottom of each file is the most important part for an AI tool** — always read it before generating or editing that document.

---

## The Module System (`5-modules/`)

Individual business features (User, Product, Order, Invoice, etc.) are **not** documented inside the global folders — they get their own self-contained folder under `5-modules/`, each with 11 standard documents (module overview, functional spec, business rules, schema, data dictionary, validation, permissions, API, UI, implementation plan, testing).

This keeps each feature independently understandable: an AI tool working on the `orders` module should only need `1-project`, the global standards (`2-database`, `3-api`, `4-ui`), and `5-modules/orders/` — not the entire documentation set.

See `5-modules/README.md` for the full module workflow, document responsibilities table, and instructions for creating a new module from `5-modules/templates/`.

---

## How an AI Tool Should Use This Folder

Before writing any code, an AI tool should:

1. Read this README.
2. Read `1-project/` fully (overview → requirements → feature breakdown → tech stack).
3. Read the relevant global standards for the task at hand:
   - Touching data? Read `2-database/`.
   - Touching an endpoint? Read `3-api/`.
   - Touching a screen? Read `4-ui/`.
4. If working on a specific feature, read that feature's folder under `5-modules/` in full, plus `5-modules/README.md` for the module workflow.
5. Read the relevant parts of `6-development/` for coding standards, folder structure, git workflow, and testing strategy before implementing.
6. Follow each document's own **AI Generation Notes** section when filling in or extending that document.
7. Keep all documents **consistent with each other** — never contradict an already-approved decision in another file; update related docs if a change ripples across them.

---

## Naming Conventions

- Folders and files are **numbered** to indicate reading/build order (`1-`, `2-`, `3-`...).
- File and folder names are **lowercase, kebab-case** (e.g. `tech-stack.md`, `sales-order/`).
- Module folders under `5-modules/` are named after the business capability, singular or plural as natural (e.g. `authentication`, `users`, `orders`).

---

## Status

This framework is currently a set of **empty templates** — no project-specific content has been filled in yet. Fill in `1-project/` first, then proceed down the folder order above.

**Framework Version:** V1
**Document Type:** Root Documentation Guide
**Applies To:** Entire `docs/` folder
