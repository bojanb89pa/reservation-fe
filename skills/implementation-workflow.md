# FE Feature Implementation Workflow

## Layer Rules

### domain/

- TypeScript interfaces, types, enums ONLY
- No imports from other layers
- Mirrors BE domain DTOs exactly
- No React, no API calls, no state management

### application/

- Use case classes/functions
- State management logic (zustand/redux/etc.)
- Imports: domain/ only
- Forbidden: fetch/axios, React components, DOM

### infrastructure/

- API client calls (fetch/axios)
- localStorage, sessionStorage
- Imports: domain/ only
- Forbidden: React components, application/ logic

### ui/

- React components, pages, hooks
- Imports: domain/, application/, infrastructure/
- Forbidden: direct fetch/axios (use infrastructure/)
- Forbidden: business logic (use application/)

## Session Order

### Session 1 — Domain (INTERACTIVE, human approves)

Source of truth: fe-brief from BE API session

Create:

- TypeScript interfaces matching BE response DTOs exactly
- Error type enums matching BE error codes
- Request/Response types

### Sessions 2, 3, 4 — Parallel headless

Session 2 — application/
`claude -p --add-dir modules/domain --add-dir modules/application`

Session 3 — infrastructure/
`claude -p --add-dir modules/domain --add-dir modules/infrastructure`

Session 4 — ui/
`claude -p --add-dir modules/domain --add-dir modules/application --add-dir modules/infrastructure --add-dir modules/ui`

Note: ui sees all layers as read-only reference, writes only to ui/

## Pre-exit Checklist

- [ ] No fetch/axios in application/ or ui/
- [ ] No React imports in domain/, application/, infrastructure/
- [ ] All types match BE DTOs exactly
- [ ] No business logic in ui/ components
