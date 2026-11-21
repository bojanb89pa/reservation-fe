import type { McpClientConsent } from '../entities/McpClientConsent';

/** Current user's consents for MCP (CIMD) clients. */
export interface McpClientConsentRepository {
  getMine(): Promise<McpClientConsent[]>;
  /**
   * Deletes the consent and invalidates the client's tokens for this user.
   * Rejects with `NotFoundError` when the consent does not exist (BE 404 `error.mcp.client_consent_not_found`).
   */
  revoke(clientId: string): Promise<void>;
}
