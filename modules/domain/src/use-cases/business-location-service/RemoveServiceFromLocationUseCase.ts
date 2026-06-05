export interface RemoveServiceFromLocationUseCase {
  execute(businessId: string, locationId: string, serviceId: string): Promise<void>;
}
