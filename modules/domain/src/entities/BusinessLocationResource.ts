import type { Resource } from './Resource';

export interface BusinessLocationResource {
  locationId: string;
  resourceId: string;
  resource: Resource | null;
}

export interface AddResourceToLocationCommand {
  resourceId: string;
}
