import type { ResourceType } from './ResourceType';

export interface Resource {
  id: string | null;
  businessId: string;
  type: ResourceType;
  name: string;
}

export interface CreateResourceCommand {
  type: ResourceType;
  name: string;
}
