import { authAxiosClient, resourceAxiosClient } from '@infrastructure';
import {
  AuthApiRepository,
  BusinessApiRepository,
  BusinessMembershipApiRepository,
  BusinessCategoryApiRepository,
  BusinessServiceApiRepository,
  BusinessLocationApiRepository,
  BusinessLocationResourceApiRepository,
  BusinessLocationServiceApiRepository,
  ResourceApiRepository,
  ReservationApiRepository,
  ResourceAvailabilityRuleApiRepository,
  ResourceSlotApiRepository,
  PlaceApiRepository,
  DiscoverySearchApiRepository,
} from '@infrastructure';
import {
  RegisterUseCaseImpl,
  GetMyBusinessesUseCaseImpl,
  GetAllBusinessesForAdminUseCaseImpl,
  SearchBusinessesUseCaseImpl,
  ActivateBusinessUseCaseImpl,
  RejectBusinessUseCaseImpl,
  GetBusinessUseCaseImpl,
  GetBusinessesByCategoryUseCaseImpl,
  SubmitBusinessUseCaseImpl,
  CreateBusinessByAdminUseCaseImpl,
  AddBusinessMemberUseCaseImpl,
  RemoveBusinessMemberUseCaseImpl,
  ListBusinessMembersUseCaseImpl,
  GetAllResourcesUseCaseImpl,
  CreateResourceUseCaseImpl,
  GetResourceSlotsUseCaseImpl,
  CreateReservationUseCaseImpl,
  GetAllReservationsUseCaseImpl,
  GetReservationUseCaseImpl,
  ApproveReservationUseCaseImpl,
  RejectReservationUseCaseImpl,
  GetAvailabilityRulesUseCaseImpl,
  CreateAvailabilityRuleUseCaseImpl,
  DeleteAvailabilityRuleUseCaseImpl,
  ListBusinessCategoriesUseCaseImpl,
  GetBusinessCategoryUseCaseImpl,
  CreateBusinessCategoryUseCaseImpl,
  UpdateBusinessCategoryUseCaseImpl,
  UpdateBusinessCategoryAppearanceUseCaseImpl,
  DeleteBusinessCategoryUseCaseImpl,
  SetBusinessCategoryUseCaseImpl,
  CreateBusinessServiceUseCaseImpl,
  ListBusinessServicesUseCaseImpl,
  UpdateBusinessServiceUseCaseImpl,
  DeleteBusinessServiceUseCaseImpl,
  CreateBusinessLocationUseCaseImpl,
  ListBusinessLocationsUseCaseImpl,
  GetBusinessLocationUseCaseImpl,
  UpdateLocationFromPlaceUseCaseImpl,
  ConfirmLocationUseCaseImpl,
  DiscoverySearchUseCaseImpl,
  SearchPlacesUseCaseImpl,
  GetPlaceDetailsUseCaseImpl,
  AddResourceToLocationUseCaseImpl,
  ListLocationResourcesUseCaseImpl,
  RemoveResourceFromLocationUseCaseImpl,
  AddServiceToLocationUseCaseImpl,
  ListLocationServicesUseCaseImpl,
  RemoveServiceFromLocationUseCaseImpl,
} from '@application';

// Re-export infrastructure primitives consumed only within this module's hooks/state.
// IMPORTANT: Only container/index.ts may import from @infrastructure.
// All other UI files that need these values must import from here.
export { env } from '@infrastructure';
export { tokenStorage } from '@infrastructure';

// ── Repositories ──────────────────────────────────────────────────────────────
export const authApiRepository = new AuthApiRepository(authAxiosClient);
const businessRepository = new BusinessApiRepository(resourceAxiosClient);
const businessCategoryRepository = new BusinessCategoryApiRepository(resourceAxiosClient);
const businessMembershipRepository = new BusinessMembershipApiRepository(resourceAxiosClient);
const resourceRepository = new ResourceApiRepository(resourceAxiosClient);
const reservationRepository = new ReservationApiRepository(resourceAxiosClient);
const availabilityRuleRepository = new ResourceAvailabilityRuleApiRepository(resourceAxiosClient);
const resourceSlotRepository = new ResourceSlotApiRepository(resourceAxiosClient);
const businessServiceRepository = new BusinessServiceApiRepository(resourceAxiosClient);
const businessLocationRepository = new BusinessLocationApiRepository(resourceAxiosClient);
const businessLocationResourceRepository = new BusinessLocationResourceApiRepository(
  resourceAxiosClient,
);
const businessLocationServiceRepository = new BusinessLocationServiceApiRepository(
  resourceAxiosClient,
);
const placeRepository = new PlaceApiRepository(resourceAxiosClient);
const discoverySearchRepository = new DiscoverySearchApiRepository(resourceAxiosClient);

// ── Use Cases ─────────────────────────────────────────────────────────────────
export const registerUseCase = new RegisterUseCaseImpl(authApiRepository);

export const getMyBusinessesUseCase = new GetMyBusinessesUseCaseImpl(businessRepository);
export const getAllBusinessesForAdminUseCase = new GetAllBusinessesForAdminUseCaseImpl(
  businessRepository,
);
export const searchBusinessesUseCase = new SearchBusinessesUseCaseImpl(businessRepository);
export const activateBusinessUseCase = new ActivateBusinessUseCaseImpl(businessRepository);
export const rejectBusinessUseCase = new RejectBusinessUseCaseImpl(businessRepository);
export const getBusinessUseCase = new GetBusinessUseCaseImpl(businessRepository);
export const getBusinessesByCategoryUseCase = new GetBusinessesByCategoryUseCaseImpl(
  businessRepository,
);
export const submitBusinessUseCase = new SubmitBusinessUseCaseImpl(businessRepository);
export const createBusinessByAdminUseCase = new CreateBusinessByAdminUseCaseImpl(
  businessRepository,
);

export const listBusinessMembersUseCase = new ListBusinessMembersUseCaseImpl(
  businessMembershipRepository,
);
export const addBusinessMemberUseCase = new AddBusinessMemberUseCaseImpl(
  businessMembershipRepository,
);
export const removeBusinessMemberUseCase = new RemoveBusinessMemberUseCaseImpl(
  businessMembershipRepository,
);

export const getAllResourcesUseCase = new GetAllResourcesUseCaseImpl(resourceRepository);
export const createResourceUseCase = new CreateResourceUseCaseImpl(resourceRepository);
export const getResourceSlotsUseCase = new GetResourceSlotsUseCaseImpl(resourceSlotRepository);

export const createReservationUseCase = new CreateReservationUseCaseImpl(reservationRepository);
export const getAllReservationsUseCase = new GetAllReservationsUseCaseImpl(reservationRepository);
export const getReservationUseCase = new GetReservationUseCaseImpl(reservationRepository);
export const approveReservationUseCase = new ApproveReservationUseCaseImpl(reservationRepository);
export const rejectReservationUseCase = new RejectReservationUseCaseImpl(reservationRepository);

export const getAvailabilityRulesUseCase = new GetAvailabilityRulesUseCaseImpl(
  availabilityRuleRepository,
);
export const createAvailabilityRuleUseCase = new CreateAvailabilityRuleUseCaseImpl(
  availabilityRuleRepository,
);
export const deleteAvailabilityRuleUseCase = new DeleteAvailabilityRuleUseCaseImpl(
  availabilityRuleRepository,
);

export const listBusinessCategoriesUseCase = new ListBusinessCategoriesUseCaseImpl(
  businessCategoryRepository,
);
export const getBusinessCategoryUseCase = new GetBusinessCategoryUseCaseImpl(
  businessCategoryRepository,
);
export const createBusinessCategoryUseCase = new CreateBusinessCategoryUseCaseImpl(
  businessCategoryRepository,
);
export const updateBusinessCategoryUseCase = new UpdateBusinessCategoryUseCaseImpl(
  businessCategoryRepository,
);
export const updateBusinessCategoryAppearanceUseCase =
  new UpdateBusinessCategoryAppearanceUseCaseImpl(businessCategoryRepository);
export const deleteBusinessCategoryUseCase = new DeleteBusinessCategoryUseCaseImpl(
  businessCategoryRepository,
);
export const setBusinessCategoryUseCase = new SetBusinessCategoryUseCaseImpl(businessRepository);

export const createBusinessLocationUseCase = new CreateBusinessLocationUseCaseImpl(
  businessLocationRepository,
);
export const listBusinessLocationsUseCase = new ListBusinessLocationsUseCaseImpl(
  businessLocationRepository,
);
export const getBusinessLocationUseCase = new GetBusinessLocationUseCaseImpl(
  businessLocationRepository,
);
export const updateLocationFromPlaceUseCase = new UpdateLocationFromPlaceUseCaseImpl(
  businessLocationRepository,
);
export const confirmLocationUseCase = new ConfirmLocationUseCaseImpl(businessLocationRepository);

export const discoverySearchUseCase = new DiscoverySearchUseCaseImpl(discoverySearchRepository);

export const searchPlacesUseCase = new SearchPlacesUseCaseImpl(placeRepository);
export const getPlaceDetailsUseCase = new GetPlaceDetailsUseCaseImpl(placeRepository);

export const addResourceToLocationUseCase = new AddResourceToLocationUseCaseImpl(
  businessLocationResourceRepository,
);
export const listLocationResourcesUseCase = new ListLocationResourcesUseCaseImpl(
  businessLocationResourceRepository,
);
export const removeResourceFromLocationUseCase = new RemoveResourceFromLocationUseCaseImpl(
  businessLocationResourceRepository,
);

export const addServiceToLocationUseCase = new AddServiceToLocationUseCaseImpl(
  businessLocationServiceRepository,
);
export const listLocationServicesUseCase = new ListLocationServicesUseCaseImpl(
  businessLocationServiceRepository,
);
export const removeServiceFromLocationUseCase = new RemoveServiceFromLocationUseCaseImpl(
  businessLocationServiceRepository,
);

export const listBusinessServicesUseCase = new ListBusinessServicesUseCaseImpl(
  businessServiceRepository,
);
export const createBusinessServiceUseCase = new CreateBusinessServiceUseCaseImpl(
  businessServiceRepository,
);
export const updateBusinessServiceUseCase = new UpdateBusinessServiceUseCaseImpl(
  businessServiceRepository,
);
export const deleteBusinessServiceUseCase = new DeleteBusinessServiceUseCaseImpl(
  businessServiceRepository,
);
