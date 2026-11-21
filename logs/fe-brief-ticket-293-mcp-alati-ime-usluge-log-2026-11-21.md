# FE brief — ticket #293 (MCP tools: service name, PENDING_APPROVAL, call log)

## API changes
None for the web frontend. No REST endpoint, request/response DTO or status code was added or changed.

Changes are limited to the MCP server (`POST /api/mcp`, consumed by AI assistants, not by the FE):
- `create_reservation` / `cancel_reservation` results now always include `service` (service name).
- Tool descriptions explain `PENDING_APPROVAL` and the `get_free_slots` slot `status` values (`AVAILABLE`, `PENDING`).
- Each tool call writes one INFO log line (tool, origin_client, outcome, duration_ms).

## TypeScript interfaces
No new or changed interfaces.

## Error codes
Unchanged.

## Suggested FE work
No FE feature required. Suggested feature name: `none`. Suggested command: none.
