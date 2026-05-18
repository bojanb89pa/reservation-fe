import { authAxiosClient, resourceAxiosClient } from '@infrastructure';
import {
  AuthApiRepository,
  BusinessApiRepository,
  ResourceApiRepository,
  ReservationApiRepository,
  ResourceAvailabilityRuleApiRepository,
} from '@infrastructure';
import {
  RegisterUseCaseImpl,
  GetAllBusinessesUseCaseImpl,
  SearchBusinessesUseCaseImpl,
  GetBusinessUseCaseImpl,
  CreateBusinessUseCaseImpl,
  GetAllResourcesUseCaseImpl,
  CreateResourceUseCaseImpl,
  CreateReservationUseCaseImpl,
  GetReservationUseCaseImpl,
  GetAvailabilityRulesUseCaseImpl,
  CreateAvailabilityRuleUseCaseImpl,
  DeleteAvailabilityRuleUseCaseImpl,
} from '@application';

// Re-export infrastructure primitives consumed only within this module's hooks/state.
// IMPORTANT: Only container/index.ts may import from @infrastructure.
// All other UI files that need these values must import from here.
export { env } from '@infrastructure';
export { tokenStorage } from '@infrastructure';

// ── Repositories ──────────────────────────────────────────────────────────────
export const authApiRepository = new AuthApiRepository(authAxiosClient);
const businessRepository = new BusinessApiRepository(resourceAxiosClient);
const resourceRepository = new ResourceApiRepository(resourceAxiosClient);
const reservationRepository = new ReservationApiRepository(resourceAxiosClient);
const availabilityRuleRepository = new ResourceAvailabilityRuleApiRepository(resourceAxiosClient);

// ── Use Cases ─────────────────────────────────────────────────────────────────
export const registerUseCase = new RegisterUseCaseImpl(authApiRepository);

export const getAllBusinessesUseCase = new GetAllBusinessesUseCaseImpl(businessRepository);
export const searchBusinessesUseCase = new SearchBusinessesUseCaseImpl(businessRepository);
export const getBusinessUseCase = new GetBusinessUseCaseImpl(businessRepository);
export const createBusinessUseCase = new CreateBusinessUseCaseImpl(businessRepository);

export const getAllResourcesUseCase = new GetAllResourcesUseCaseImpl(resourceRepository);
export const createResourceUseCase = new CreateResourceUseCaseImpl(resourceRepository);

export const createReservationUseCase = new CreateReservationUseCaseImpl(reservationRepository);
export const getReservationUseCase = new GetReservationUseCaseImpl(reservationRepository);

export const getAvailabilityRulesUseCase = new GetAvailabilityRulesUseCaseImpl(availabilityRuleRepository);
export const createAvailabilityRuleUseCase = new CreateAvailabilityRuleUseCaseImpl(availabilityRuleRepository);
export const deleteAvailabilityRuleUseCase = new DeleteAvailabilityRuleUseCaseImpl(availabilityRuleRepository);
