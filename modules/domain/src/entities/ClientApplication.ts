export type ClientApplicationScope =
  | { type: 'SINGLE_LOCATION'; locationId: string }
  | { type: 'MULTIPLE_LOCATIONS'; businessId: string; locationIds: string[] }
  /** Locations from different businesses, for partners working with several businesses. */
  | { type: 'LOCATION_LIST'; locationIds: string[] }
  | { type: 'CATEGORY'; categoryId: string };

export interface ClientApplication {
  id: string;
  name: string;
  scope: ClientApplicationScope;
  enabled: boolean;
}

export interface CreateClientApplicationCommand {
  name: string;
  scope: ClientApplicationScope;
}

/** Admin switches a partner on or off. Existing reservations and consents stay untouched. */
export interface SetClientApplicationEnabledCommand {
  clientApplicationId: string;
  enabled: boolean;
}

/** Business owner's decision on a partner for one location. */
export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REVOKED';

export interface ClientApplicationLocationConsent {
  id: string;
  clientApplicationId: string;
  locationId: string;
  status: ConsentStatus;
  decidedByUserId: string | null;
  /** ISO-8601 */
  decidedAt: string | null;
  /** ISO-8601 */
  createdAt: string;
}

/** Admin detail: the application with consent statuses for every location in its scope. */
export interface ClientApplicationDetail extends ClientApplication {
  consents: ClientApplicationLocationConsent[];
}

export interface OwnerClientApplicationConsentLocation {
  id: string;
  businessId: string;
  name: string | null;
  addressLine1: string | null;
  city: string | null;
}

/** A consent as seen by the owner of the location's business. */
export interface OwnerClientApplicationConsent {
  id: string;
  status: ConsentStatus;
  decidedByUserId: string | null;
  /** ISO-8601 */
  decidedAt: string | null;
  /** ISO-8601 */
  createdAt: string;
  clientApplication: ClientApplication;
  location: OwnerClientApplicationConsentLocation;
}
