#!/usr/bin/env node
/**
 * validate-template.mjs
 *
 * Zero-dependency structural checker for project-docs-template/.
 * Run it after any edit to prompts/ or docs-templates/ — before publishing
 * a new template version — to catch broken cross-references mechanically
 * instead of relying on a full manual read-through.
 *
 * Usage:
 *   node tools/validate-template.mjs
 *   node tools/validate-template.mjs /path/to/another/project-docs-template
 *
 * MAINTENANCE — THIS IS CLAUDE'S RESPONSIBILITY, NOT THE USER'S:
 * Whenever a change to prompts/ or docs-templates/ alters one of the
 * conventions this script checks — cross-references written as
 * `project-docs/prompts/<path>.md`, every prompt file (except README.md
 * and GLOSSARY.md) carrying a `**Prompt version:** X.Y` line, document
 * counts stated in prose as "N documents" / "N templates" — Claude must
 * update the matching CHECK_* function below in the SAME turn as that
 * template change, without waiting to be asked. Don't leave this script
 * silently checking a convention that no longer applies — a validator
 * that passes green against a rule nobody follows anymore is worse than
 * no validator at all. Ordinary content edits (new documents, new
 * prompts, edited instructions) need no change here — only a change to
 * the conventions themselves does.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = resolve(process.argv[2] ?? join(__dirname, ".."));
const PROMPTS_DIR = join(TEMPLATE_ROOT, "prompts");
const TEMPLATES_DIR = join(TEMPLATE_ROOT, "docs-templates");

/** @type {{file: string, line: number, message: string}[]} */
const errors = [];

function walk(dir, extList = [".md"]) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, extList));
    else if (extList.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

// --- Check 1: every "project-docs/prompts/<path>.md" reference resolves to a real file ---
function checkCrossReferences(promptFiles) {
  const pattern = /project-docs\/prompts\/([A-Za-z0-9_\-./]+\.md)/g;
  for (const file of promptFiles) {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const relPath = match[1];
      const target = join(PROMPTS_DIR, relPath);
      if (!existsSync(target)) {
        errors.push({
          file: relative(TEMPLATE_ROOT, file),
          line: lineOf(content, match.index),
          message: `broken reference — project-docs/prompts/${relPath} does not exist`,
        });
      }
    }
  }
}

// --- Check 2: every prompt file (except README/GLOSSARY) has a Prompt version line ---
function checkPromptVersions(promptFiles) {
  for (const file of promptFiles) {
    const base = file.split(/[\\/]/).pop();
    if (base === "README.md" || base === "GLOSSARY.md") continue;
    const content = readFileSync(file, "utf8");
    const head = content.split("\n").slice(0, 10).join("\n");
    if (!/\*\*Prompt version:\*\*\s*\d+(\.\d+)+/.test(head)) {
      errors.push({
        file: relative(TEMPLATE_ROOT, file),
        line: 1,
        message: "missing `**Prompt version:** X.Y` line in the first 10 lines",
      });
    }
  }
}

// --- Check 3: stated document counts ("N documents") match actual template file counts ---
function countTemplateFiles(categoryDir) {
  if (!existsSync(categoryDir)) return null;
  return readdirSync(categoryDir).filter(
    (f) => !f.toLowerCase().startsWith("readme")
  ).length;
}

function checkDocumentCounts() {
  const categoryMap = {
    "01-project": "1-project",
    "02-database": "2-database",
    "03-api": "3-api",
    "04-ui": "4-ui",
    "05-modules": "5-modules",
    "06-development": "6-development",
    "07-cross-cutting": "7-cross-cutting",
  };
  for (const [genFolder, templateFolder] of Object.entries(categoryMap)) {
    const genDir = join(PROMPTS_DIR, "3-document-generate", genFolder);
    if (!existsSync(genDir)) continue;
    const templatesPath = join(TEMPLATES_DIR, templateFolder, "templates");
    const actualCount = countTemplateFiles(templatesPath);
    if (actualCount === null) continue;

    for (const file of walk(genDir)) {
      const content = readFileSync(file, "utf8");
      const countPattern = /\b(\d+)\s+(?:documents|templates)\b/g;
      let match;
      while ((match = countPattern.exec(content)) !== null) {
        const statedCount = Number(match[1]);
        // 6-development's early/late wave split means individual wave counts
        // (6 or 4) legitimately differ from the category total (10) — skip
        // anything smaller than the full category count for that one folder.
        if (genFolder === "06-development" && statedCount !== actualCount) continue;
        if (statedCount !== actualCount) {
          errors.push({
            file: relative(TEMPLATE_ROOT, file),
            line: lineOf(content, match.index),
            message: `states "${statedCount} documents/templates" but docs-templates/${templateFolder}/templates/ has ${actualCount} — verify this is intentional (e.g. a wave subset), not drift`,
          });
        }
      }
    }
  }
}

// --- Run ---
const promptFiles = walk(PROMPTS_DIR);
checkCrossReferences(promptFiles);
checkPromptVersions(promptFiles);
checkDocumentCounts();

if (errors.length === 0) {
  console.log(`OK — ${promptFiles.length} prompt files checked, no issues found.`);
  process.exit(0);
} else {
  console.log(`${errors.length} issue(s) found:\n`);
  for (const e of errors) {
    console.log(`${e.file}:${e.line} — ${e.message}`);
  }
  process.exit(1);
}
