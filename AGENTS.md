# Repository Guidelines

## Project Structure & Module Organization
- `app/` maps App Router segments; folders like `(marketing)`, `(app)`, and `(auth)` separate public pages, product dashboards, and access flows. Route UI stays in `page.tsx`.
- `components/` hosts reusable UI. Primitives live under `components/ui/`; domain widgets (tenders, forms, marketing) sit alongside them. Use PascalCase filenames.
- `lib/` stores framework-neutral helpers (`utils.ts`, `cn.ts`), business logic (`entitlements.ts`), and local mocks. Keep new integrations here to lighten routes.
- `public/` contains static assets. Global styling resides in `app/globals.css` and design tokens in `app/styles/tokens.css`; extend those instead of creating scattered overrides.

## Build, Test, and Development Commands
- `npm install` prepares dependencies (use Node 18 LTS or newer).
- `npm run dev` starts the local server at `http://localhost:3000` with mocked data.
- `npm run build` compiles the production bundle and surfaces type or route errors.
- `npm run start` serves the optimized build; run it before tagging releases.
- `npm run lint` executes Next.js ESLint rules; gate pull requests on a clean run.

## Coding Style & Naming Conventions
- TypeScript is mandatory; avoid `any`, prefer explicit interfaces, and keep shared types near the code that owns them.
- Routes stay kebab-case to mirror URLs; React components/hooks use PascalCase; utilities remain camelCase.
- Prettier with the Tailwind plugin formats code. Group utility classes logically (layout → spacing → color) and review ESLint autofixes before committing.

## Testing Guidelines
- Automated tests are pending. Introduce React Testing Library for components and Playwright for multi-step flows.
- Store specs as `*.test.tsx` beside the source or under `tests/`. Cover authentication, workspace modals, and pricing logic first.
- Pair UI assertions with accessibility checks (e.g., `@testing-library/jest-dom`) and treat `npm run lint` as the minimum pre-merge gate.

## Commit & Pull Request Guidelines
- Current history favors sentence-case summaries with context after a colon (`Initial commit: Bidwizer V4 - Tender management platform`). Mirror that structure and stay imperative.
- Keep commits focused; separate feature work, refactors, and formatting-only edits to ease review.
- Pull requests need a clear purpose, linked task or issue, testing notes, and before/after visuals when UI changes. Highlight environment or schema updates explicitly.

## Environment & Configuration Tips
- Copy `.env.local.example` to `.env.local`, provide values such as `NEXT_PUBLIC_FX_USD_LKR`, and keep the file out of version control.
- Document new configuration keys in `README.md` and guard usage with safe fallbacks (`process.env.KEY ?? default`).
