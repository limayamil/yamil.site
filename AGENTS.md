# Repository Guidelines

## Project Structure & Module Organization

This repository is a single-page Astro 7 portfolio. `src/pages/index.astro` is the entry point, wrapped by `src/layouts/Base.astro`. Reusable UI lives in `src/components/`; browser behavior is split between `src/scripts/motion.ts` and `src/scripts/veil.ts`. Keep profile and employment content in `src/data/*.ts`, and project cases in `src/data/projects.json`, whose schema is defined in `src/content.config.ts`. Shared helpers belong in `src/lib/`, while site-wide styles live in `src/styles/global.css`.

Static, deployable files go in `public/` (especially `public/media/` and `public/fonts/`). `docs/` contains design references and the case template. `procesar/` is source material and tooling for preparing assets; it is not shipped. Never edit generated `dist/` or `.astro/` output.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies.
- `npm run dev` starts Astro locally at `http://localhost:4321`.
- `npm run check` type-checks TypeScript and `.astro` files.
- `npm run build` creates the production site in `dist/` and validates content data.
- `npm run preview` serves the production build for final inspection.

## Coding Style & Naming Conventions

Follow the existing TypeScript/Astro style: two-space indentation, single quotes, semicolons, trailing commas in multiline structures, and strict typing. Use `PascalCase.astro` for components, `camelCase` for variables/functions, and kebab-case for media filenames and project slugs. Prefer typed data and build-time validation over hardcoded component copy. Every user-visible portfolio string should retain the `{ es, en }` bilingual shape. Keep runtime state in classes or `data-*` attributes rather than inline styles.

No formatter or linter is configured, so match adjacent code carefully. Review `CLAUDE.md` and `design.md` before changing layout, animation, contrast, accessibility, or responsive height behavior; they document measured constraints.

## Testing Guidelines

There is no automated test suite or coverage target. Before submitting, run `npm run check` and `npm run build`. For visual or interaction changes, also use `npm run preview` and verify both languages, keyboard navigation, responsive layouts, reduced motion, filters, and hash routes such as `#caso/<slug>` and `#recorrido`.

## Codex Desktop on Windows

This workspace can hit a Codex sandbox identity failure reported as `windows sandbox: CreateProcessWithLogonW failed: 5`. Treat that exact message as an environment limitation, not as a repository or command error.

- If a read-only or in-scope shell command fails with that exact error, retry it once with `sandbox_permissions: "require_escalated"`, a narrowly scoped justification, and the repository as `workdir`. Do not spend time retrying equivalent sandboxed commands.
- `apply_patch` and `view_image` may fail with the same error and do not expose an escalation option. Try `apply_patch` once. If it returns this exact identity failure, use an escalated, narrowly scoped Node mutation with explicit precondition checks, UTF-8 reads/writes, and immediate post-edit diff inspection. Prefer replacing one uniquely identified JSON object or exact text span; never rewrite unrelated entries.
- Before and after any fallback edit, inspect `git status --short` and the focused `git diff -- <file>`. Existing changes belong to the user. Finish with `git diff --check`, JSON/schema validation, and the normal Astro checks when code or content changed.
- Read text with explicit UTF-8 handling (for example, PowerShell `Get-Content -Encoding UTF8`) to avoid mojibake and check edited JSON for U+FFFD or `Ã`.
- If local image inspection is blocked, generate a temporary in-memory preview with `System.Drawing`, keep it around 400 px wide so Base64 output stays below the tool-output limit, and forward it as a `data:image/jpeg;base64,...` image. Do not modify or delete source assets.
- Use `-LiteralPath` for Windows paths containing spaces. Never include credentials or other secrets found in attachments in commands, documentation, diffs, or user-facing responses.

## Commit & Pull Request Guidelines

Recent history favors concise, imperative subjects, often with Conventional Commit prefixes such as `feat:`. Keep commits focused; examples include `feat: add project gallery` or `fix: preserve filter state`.

Pull requests should explain the user-facing change, identify affected data or design constraints, and report validation commands. Link relevant issues and include before/after screenshots for visual work. Do not commit secrets, `.env` files, dependencies, or generated build artifacts.
