# Application Module

## Isolated context instructions

When working inside this module:
- Read ONLY this CLAUDE.md
- Do NOT read CLAUDE.md files from other modules
- Do NOT modify files outside `modules/application/` unless explicitly requested
- Do NOT infer rules from sibling modules

---

## Purpose

This module contains use cases — the orchestration layer that coordinates domain objects to fulfill application requirements. It is the boundary between what the system does and how it does it.

## Allowed

- Use case implementations (`*UseCaseImpl`)
- Orchestration of domain objects and repository interfaces
- DTO mapping (if needed between domain and external representation)
- Application services that coordinate multiple domain operations
- Command/query handlers

## May depend on

- `@domain` — entities, repository interfaces, use case interfaces, types

## Forbidden

- React or any UI framework
- Browser APIs (`window`, `document`, `localStorage`, `fetch`)
- Direct HTTP calls (`axios`, `fetch`)
- Infrastructure implementations (repository classes, API clients)
- Imports from `@infrastructure` or `@ui`

## Dependency rule

This module may only import from `@domain`. The `references` array in tsconfig.json points only to `../domain`.

All imports from the domain must go through `@domain` (the index). Never use deep paths like `@domain/entities/Foo`.

## Public API

All exports must go through `src/index.ts`. Use case implementations are exported so the infrastructure/UI composition root can wire them.

## File structure

```
src/
  use-cases/
    auth/
    availabilityrule/
    business/
    reservation/
    resource/
    __tests__/
  index.ts        — public API, all exports
```

## Rules

- Use cases receive repository interfaces via constructor injection — never import concrete implementations
- No framework logic inside use cases
- No UI concerns or presentation state
- Each use case does one thing — single-responsibility
- Tests mock repository interfaces, not implementations
