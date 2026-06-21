// Entities
export type { AuthSession, AuthCredentials } from './entities/AuthSession';
export type {
  BusinessService,
  DurationUnit,
  CreateBusinessServiceCommand,
  UpdateBusinessServiceCommand,
} from './entities/BusinessService';
export type {
  BusinessCategory,
  CreateBusinessCategoryCommand,
  UpdateBusinessCategoryCommand,
  UpdateBusinessCategoryAppearanceCommand,
} from './entities/BusinessCategory';
export { DEFAULT_CATEGORY_SYMBOL, DEFAULT_CATEGORY_COLOR } from './entities/BusinessCategory';
export type {
  LocalizedBusinessCategory,
  BusinessCategoryTranslation,
  CreateLocalizedBusinessCategoryCommand,
  UpdateLocalizedBusinessCategoryCommand,
  UpsertTranslationCommand,
} from './entities/LocalizedBusinessCategory';
export type {
  Business,
  BusinessStatus,
  SubmitBusinessCommand,
  CreateBusinessByAdminCommand,
  SetBusinessCategoryCommand,
} from './entities/Business';
export type {
  BusinessMembership,
  BusinessMemberRole,
  AddMemberCommand,
  RemoveMemberCommand,
} from './entities/BusinessMembership';
export type {
  BusinessLocation,
  CreateBusinessLocationCommand,
  UpdateBusinessLocationFromPlaceCommand,
} from './entities/BusinessLocation';
export type { PlaceAutocompleteSuggestion, PlaceDetails } from './entities/Place';
export type {
  BusinessLocationResource,
  AddResourceToLocationCommand,
} from './entities/BusinessLocationResource';
export type {
  BusinessLocationService,
  AddServiceToLocationCommand,
} from './entities/BusinessLocationService';
export type {
  Reservation,
  ReservationStatus,
  ReservationServiceInfo,
  ReservationResourceInfo,
  ReservationBusinessInfo,
  CreateReservationCommand,
} from './entities/Reservation';
export type { SearchResult } from './entities/SearchResult';
export type { Resource, CreateResourceCommand } from './entities/Resource';
export type {
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
  DayOfWeek,
} from './entities/ResourceAvailabilityRule';
export { DAY_LABELS, DAYS_ORDERED } from './entities/ResourceAvailabilityRule';
export type { ResourceSlot, ResourceSlotStatus } from './entities/ResourceSlot';
export type { AvailabilityBlock } from './entities/AvailabilityBlock';
export type { ResourceType } from './entities/ResourceType';
export type { Role } from './entities/Role';
export type { User, UserRegistration } from './entities/User';

// Errors
export {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
  UnprocessableEntityError,
} from './errors/DomainError';
export { PlaceErrorCode } from './errors/PlaceError';

// Repository interfaces
export type { AuthRepository } from './repositories/AuthRepository';
export type { BusinessCategoryRepository } from './repositories/BusinessCategoryRepository';
export type { LocalizedBusinessCategoryRepository } from './repositories/LocalizedBusinessCategoryRepository';
export type { BusinessRepository } from './repositories/BusinessRepository';
export type { BusinessMembershipRepository } from './repositories/BusinessMembershipRepository';
export type { BusinessServiceRepository } from './repositories/BusinessServiceRepository';
export type { ReservationRepository } from './repositories/ReservationRepository';
export type { ResourceAvailabilityRuleRepository } from './repositories/ResourceAvailabilityRuleRepository';
export type { ResourceRepository } from './repositories/ResourceRepository';
export type { ResourceSlotRepository } from './repositories/ResourceSlotRepository';
export type { AvailabilityBlockRepository } from './repositories/AvailabilityBlockRepository';
export type { BusinessLocationRepository } from './repositories/BusinessLocationRepository';
export type { PlaceRepository } from './repositories/PlaceRepository';
export type { DiscoverySearchRepository } from './repositories/DiscoverySearchRepository';
export type { BusinessLocationResourceRepository } from './repositories/BusinessLocationResourceRepository';
export type { BusinessLocationServiceRepository } from './repositories/BusinessLocationServiceRepository';

// Types
export type { PageRequest, PageResponse } from './types/Page';
export type { BusinessSearchFilter } from './types/BusinessSearchFilter';
export type { DiscoverySearchQuery } from './types/DiscoverySearchQuery';

// Use case interfaces
export type { LoginUseCase } from './use-cases/auth/LoginUseCase';
export type { RegisterUseCase } from './use-cases/auth/RegisterUseCase';
export type { CreateAvailabilityRuleUseCase } from './use-cases/availabilityrule/CreateAvailabilityRuleUseCase';
export type { DeleteAvailabilityRuleUseCase } from './use-cases/availabilityrule/DeleteAvailabilityRuleUseCase';
export type { GetAvailabilityRulesUseCase } from './use-cases/availabilityrule/GetAvailabilityRulesUseCase';
export type { GetMyBusinessesUseCase } from './use-cases/business/GetMyBusinessesUseCase';
export type { GetAllBusinessesForAdminUseCase } from './use-cases/business/GetAllBusinessesForAdminUseCase';
export type { SearchBusinessesUseCase } from './use-cases/business/SearchBusinessesUseCase';
export type { GetBusinessesByCategoryUseCase } from './use-cases/business/GetBusinessesByCategoryUseCase';
export type { GetBusinessUseCase } from './use-cases/business/GetBusinessUseCase';
export type { AddBusinessMemberUseCase } from './use-cases/business/AddBusinessMemberUseCase';
export type { RemoveBusinessMemberUseCase } from './use-cases/business/RemoveBusinessMemberUseCase';
export type { ListBusinessMembersUseCase } from './use-cases/business/ListBusinessMembersUseCase';
export type { SubmitBusinessUseCase } from './use-cases/business/SubmitBusinessUseCase';
export type { CreateBusinessByAdminUseCase } from './use-cases/business/CreateBusinessByAdminUseCase';
export type { ActivateBusinessUseCase } from './use-cases/business/ActivateBusinessUseCase';
export type { RejectBusinessUseCase } from './use-cases/business/RejectBusinessUseCase';
export type { DeleteBusinessUseCase } from './use-cases/business/DeleteBusinessUseCase';
export type { SetBusinessCategoryUseCase } from './use-cases/business/SetBusinessCategoryUseCase';
export type { CreateBusinessServiceUseCase } from './use-cases/business-service/CreateBusinessServiceUseCase';
export type { ListBusinessServicesUseCase } from './use-cases/business-service/ListBusinessServicesUseCase';
export type { GetBusinessServiceUseCase } from './use-cases/business-service/GetBusinessServiceUseCase';
export type { UpdateBusinessServiceUseCase } from './use-cases/business-service/UpdateBusinessServiceUseCase';
export type { DeleteBusinessServiceUseCase } from './use-cases/business-service/DeleteBusinessServiceUseCase';
export type { CreateBusinessLocationUseCase } from './use-cases/business-location/CreateBusinessLocationUseCase';
export type { ListBusinessLocationsUseCase } from './use-cases/business-location/ListBusinessLocationsUseCase';
export type { GetBusinessLocationUseCase } from './use-cases/business-location/GetBusinessLocationUseCase';
export type { UpdateLocationFromPlaceUseCase } from './use-cases/business-location/UpdateLocationFromPlaceUseCase';
export type { ConfirmLocationUseCase } from './use-cases/business-location/ConfirmLocationUseCase';
export type { DiscoverySearchUseCase } from './use-cases/discovery/DiscoverySearchUseCase';
export type { SearchPlacesUseCase } from './use-cases/place/SearchPlacesUseCase';
export type { GetPlaceDetailsUseCase } from './use-cases/place/GetPlaceDetailsUseCase';
export type { CreateReservationUseCase } from './use-cases/reservation/CreateReservationUseCase';
export type { GetAllReservationsUseCase } from './use-cases/reservation/GetAllReservationsUseCase';
export type { GetReservationUseCase } from './use-cases/reservation/GetReservationUseCase';
export type { ApproveReservationUseCase } from './use-cases/reservation/ApproveReservationUseCase';
export type { RejectReservationUseCase } from './use-cases/reservation/RejectReservationUseCase';
export type { CreateResourceUseCase } from './use-cases/resource/CreateResourceUseCase';
export type { GetAllResourcesUseCase } from './use-cases/resource/GetAllResourcesUseCase';
export type { GetResourceSlotsUseCase } from './use-cases/resource/GetResourceSlotsUseCase';
export type { GetAvailabilityBlocksUseCase } from './use-cases/resource/GetAvailabilityBlocksUseCase';
export type { AddResourceToLocationUseCase } from './use-cases/business-location-resource/AddResourceToLocationUseCase';
export type { ListLocationResourcesUseCase } from './use-cases/business-location-resource/ListLocationResourcesUseCase';
export type { RemoveResourceFromLocationUseCase } from './use-cases/business-location-resource/RemoveResourceFromLocationUseCase';
export type { AddServiceToLocationUseCase } from './use-cases/business-location-service/AddServiceToLocationUseCase';
export type { ListLocationServicesUseCase } from './use-cases/business-location-service/ListLocationServicesUseCase';
export type { RemoveServiceFromLocationUseCase } from './use-cases/business-location-service/RemoveServiceFromLocationUseCase';
export type { ListBusinessCategoriesUseCase } from './use-cases/business-category/ListBusinessCategoriesUseCase';
export type { GetBusinessCategoryUseCase } from './use-cases/business-category/GetBusinessCategoryUseCase';
export type { CreateBusinessCategoryUseCase } from './use-cases/business-category/CreateBusinessCategoryUseCase';
export type { UpdateBusinessCategoryUseCase } from './use-cases/business-category/UpdateBusinessCategoryUseCase';
export type { UpdateBusinessCategoryAppearanceUseCase } from './use-cases/business-category/UpdateBusinessCategoryAppearanceUseCase';
export type { DeleteBusinessCategoryUseCase } from './use-cases/business-category/DeleteBusinessCategoryUseCase';
export type { ListLocalizedBusinessCategoriesUseCase } from './use-cases/localized-business-category/ListLocalizedBusinessCategoriesUseCase';
export type { GetLocalizedBusinessCategoryUseCase } from './use-cases/localized-business-category/GetLocalizedBusinessCategoryUseCase';
export type { CreateLocalizedBusinessCategoryUseCase } from './use-cases/localized-business-category/CreateLocalizedBusinessCategoryUseCase';
export type { UpdateLocalizedBusinessCategoryUseCase } from './use-cases/localized-business-category/UpdateLocalizedBusinessCategoryUseCase';
export type { UpsertLocalizedBusinessCategoryTranslationUseCase } from './use-cases/localized-business-category/UpsertLocalizedBusinessCategoryTranslationUseCase';

// Business contact info
export type {
  BusinessContactInfo,
  ContactInfoType,
  AddContactInfoCommand,
  UpdateContactInfoCommand,
  RemoveContactInfoCommand,
} from './entities/BusinessContactInfo';
export type { BusinessContactInfoRepository } from './repositories/BusinessContactInfoRepository';
export type { ListContactInfoUseCase } from './use-cases/business-contact-info/ListContactInfoUseCase';
export type { AddContactInfoUseCase } from './use-cases/business-contact-info/AddContactInfoUseCase';
export type { UpdateContactInfoUseCase } from './use-cases/business-contact-info/UpdateContactInfoUseCase';
export type { RemoveContactInfoUseCase } from './use-cases/business-contact-info/RemoveContactInfoUseCase';
