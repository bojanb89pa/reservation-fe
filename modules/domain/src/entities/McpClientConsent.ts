/** A signed-in user's consent for an MCP (CIMD) client, i.e. a connected AI application. */
export interface McpClientConsent {
  /** https URL of the client's metadata document. */
  clientId: string;
  /** External text (e.g. "Claude"). Render as plain text. */
  clientName: string;
  /** e.g. "claude.ai". */
  clientHost: string;
  /** Approved scopes, sorted. */
  scopes: string[];
  /** ISO-8601 instant. */
  grantedAt: string | null;
}
