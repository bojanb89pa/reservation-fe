/** BE message keys of an error on `PUT /admin/client-applications/{id}/integration` (422 unless noted). */
export enum ClientApplicationIntegrationErrorCode {
  /** 400: a `PARTNER_KEY` issuer has no key source, both, a relative `jwksUri` or a bad `inlineJwk`. */
  PARTNER_KEY_INVALID = 'error.client_application_integration.partner_key_invalid',
  ISSUER_INVALID = 'error.client_application_integration.issuer_invalid',
  ORIGIN_INVALID = 'error.client_application_integration.origin_invalid',
  SCOPE_UNSUPPORTED = 'error.client_application_integration.scope_unsupported',
}

export enum McpClientConsentErrorCode {
  /** 404: no consent for that client (missing, already revoked, or someone else's). Refresh the list. */
  CONSENT_NOT_FOUND = 'error.mcp.client_consent_not_found',
}

export enum ClientApplicationConsentErrorCode {
  /** BE `ErrorResponse.code` for a 422 when the location owner has not approved the partner. */
  CONSENT_NOT_APPROVED = 'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED',
}
