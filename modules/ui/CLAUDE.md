# UI Module

## Isolated context instructions

When working inside this module:
- Read ONLY this CLAUDE.md
- Do NOT read CLAUDE.md files from other modules
- Do NOT modify files outside `modules/ui/` unless explicitly requested
- Do NOT infer rules from sibling modules

---

## Purpose

This module contains the entire presentation layer — React components, hooks, pages, routing, and client-side state. It is the outermost layer of the application.

## Allowed

- React components (`.tsx`)
- Custom hooks (`use*.ts`)
- Pages and routing
- Presentation-only state (Zustand stores for UI concerns)
- CSS Modules
- `@tanstack/react-query` for async state management

## May depend on

- `@application` — use case implementations (via the composition root)
- `@domain` — domain types for TypeScript typing in hooks and components

## Composition root exception

`src/app/container/index.ts` is the **composition root** of the entire application. It is the only file in this module permitted to import from `@infrastructure`. This is architecturally intentional — the composition root wires infrastructure adapters to application use cases and re-exports the configured instances.

**All other UI files must NOT import from `@infrastructure` directly.** If a hook or store needs an infrastructure primitive (e.g., `env`, `tokenStorage`), it must import from `../app/container` (or `../../app/container`), not from `@infrastructure`.

## Forbidden (for all files except `app/container/index.ts`)

- Direct imports from `@infrastructure`
- Direct API calls (`axios`, `fetch`) outside the composition root
- Business logic inside components (validation, domain decisions)
- Direct repository access from components or hooks

## Dependency rule

This module's tsconfig references `domain`, `application`, and `infrastructure`. The infrastructure reference exists **solely** to enable the composition root. The architectural constraint "UI depends only on application" is enforced by convention for all files except `app/container/index.ts`.

## Public API

`src/index.ts` exports `App` — the root React component consumed by `src/main.tsx`.

## File structure

```
src/
  app/
    App.tsx               — root component
    container/
      index.ts            — composition root (ONLY file allowed to import @infrastructure)
    providers/
      QueryProvider.tsx   — React Query setup
  components/             — reusable UI components
    booking/
    business/
    dashboard/
    layout/
  hooks/                  — custom React hooks (import use cases from container)
  pages/                  — route-level page components
    dashboard/
  routes/                 — React Router setup and guards
  state/                  — Zustand stores (import tokenStorage from container, not @infrastructure)
  index.ts                — public API: exports App
```

## Rules

- Components are thin — they trigger use cases and render results
- Hooks wrap use case calls via `@tanstack/react-query`; they do not contain business logic
- UI never accesses repositories directly
- Routing guards use the `useAuthStore` — never call auth API directly
- All domain types used in components come from `@domain`
