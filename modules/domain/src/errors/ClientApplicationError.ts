/** BE message keys of a 422 on `PUT /admin/client-applications/{id}/integration`. */
export enum ClientApplicationIntegrationErrorCode {
  ISSUER_INVALID = 'error.client_application_integration.issuer_invalid',
  ORIGIN_INVALID = 'error.client_application_integration.origin_invalid',
  SCOPE_UNSUPPORTED = 'error.client_application_integration.scope_unsupported',
}

export enum ClientApplicationConsentErrorCode {
  /** BE `ErrorResponse.code` for a 422 when the location owner has not approved the partner. */
  CONSENT_NOT_APPROVED = 'CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED',
}
