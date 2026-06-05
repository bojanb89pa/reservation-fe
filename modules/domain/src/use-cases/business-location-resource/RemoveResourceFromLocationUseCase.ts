export interface RemoveResourceFromLocationUseCase {
  execute(businessId: string, locationId: string, resourceId: string): Promise<void>;
}
