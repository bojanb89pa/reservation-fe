# Domain Module

## Isolated context instructions

When working inside this module:
- Read ONLY this CLAUDE.md
- Do NOT read CLAUDE.md files from other modules
- Do NOT modify files outside `modules/domain/` unless explicitly requested
- Do NOT infer rules from sibling modules

---

## Purpose

This module contains the pure business domain. It has zero dependencies on any other module and no knowledge of how it is deployed, presented, or persisted.

## Allowed

- Entities (plain TypeScript interfaces/classes)
- Value objects
- Domain services
- Repository interfaces (contracts only — no implementations)
- Domain events
- Enums and constants
- Pure validation logic with no side effects

## Forbidden

- React or any UI framework
- Browser APIs (`window`, `document`, `localStorage`, `fetch`)
- HTTP clients (`axios`, `fetch`)
- Database logic or ORM
- Infrastructure implementations
- Imports from `@application`, `@infrastructure`, or `@ui`

## Dependency rule

**This module has NO dependencies on any other module.**

No `references` array in tsconfig.json points outward. Any import that is not relative (within this module) or from a standard library/language is forbidden.

## Public API

All exports must go through `src/index.ts`. Never add a deep import path to a cross-module consumer. If a type needs to be used by another module, it must be exported from `src/index.ts`.

## File structure

```
src/
  entities/       — domain entities and value objects
  errors/         — domain-specific error types
  repositories/   — repository interfaces (no implementations)
  types/          — shared primitive types (pagination, etc.)
  use-cases/      — use case interfaces (contracts only)
  index.ts        — public API, all exports
```

## Rules

- Keep domain pure — no side effects
- Framework independent
- No business logic that depends on delivery mechanism
- Entities are plain data or contain only self-contained invariant logic
- Repository interfaces express intent in domain language, not persistence language
