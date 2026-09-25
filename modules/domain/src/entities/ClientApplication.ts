export type ClientApplicationScope =
  | { type: 'SINGLE_LOCATION'; locationId: string }
  | { type: 'MULTIPLE_LOCATIONS'; businessId: string; locationIds: string[] }
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
