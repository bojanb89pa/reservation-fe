/**
 * Composition Root — wires infrastructure adapters to use case implementations.
 * All external dependencies are created once here; use cases receive interfaces only.
 */
import { authAxiosClient } from '@infrastructure/api/authAxiosClient';
import { resourceAxiosClient } from '@infrastructure/api/resourceAxiosClient';

import { AuthApiRepository } from '@infrastructure/repositories/AuthApiRepository';
import { BusinessApiRepository } from '@infrastructure/repositories/BusinessApiRepository';
import { ResourceApiRepository } from '@infrastructure/repositories/ResourceApiRepository';
import { ReservationApiRepository } from '@infrastructure/repositories/ReservationApiRepository';
import { ResourceAvailabilityRuleApiRepository } from '@infrastructure/repositories/ResourceAvailabilityRuleApiRepository';

import { RegisterUseCaseImpl } from '@application/use-cases/auth/RegisterUseCaseImpl';
import { GetAllBusinessesUseCaseImpl } from '@application/use-cases/business/GetAllBusinessesUseCaseImpl';
import { GetBusinessUseCaseImpl } from '@application/use-cases/business/GetBusinessUseCaseImpl';
import { CreateBusinessUseCaseImpl } from '@application/use-cases/business/CreateBusinessUseCaseImpl';
import { GetAllResourcesUseCaseImpl } from '@application/use-cases/resource/GetAllResourcesUseCaseImpl';
import { CreateResourceUseCaseImpl } from '@application/use-cases/resource/CreateResourceUseCaseImpl';
import { CreateReservationUseCaseImpl } from '@application/use-cases/reservation/CreateReservationUseCaseImpl';
import { GetReservationUseCaseImpl } from '@application/use-cases/reservation/GetReservationUseCaseImpl';
import { GetAvailabilityRulesUseCaseImpl } from '@application/use-cases/availabilityrule/GetAvailabilityRulesUseCaseImpl';
import { CreateAvailabilityRuleUseCaseImpl } from '@application/use-cases/availabilityrule/CreateAvailabilityRuleUseCaseImpl';
import { DeleteAvailabilityRuleUseCaseImpl } from '@application/use-cases/availabilityrule/DeleteAvailabilityRuleUseCaseImpl';

// ── Repositories ──────────────────────────────────────────────────────────────
export const authApiRepository = new AuthApiRepository(authAxiosClient);
const businessRepository = new BusinessApiRepository(resourceAxiosClient);
const resourceRepository = new ResourceApiRepository(resourceAxiosClient);
const reservationRepository = new ReservationApiRepository(resourceAxiosClient);
const availabilityRuleRepository = new ResourceAvailabilityRuleApiRepository(resourceAxiosClient);

// ── Use Cases ─────────────────────────────────────────────────────────────────
export const registerUseCase = new RegisterUseCaseImpl(authApiRepository);

export const getAllBusinessesUseCase = new GetAllBusinessesUseCaseImpl(businessRepository);
export const getBusinessUseCase = new GetBusinessUseCaseImpl(businessRepository);
export const createBusinessUseCase = new CreateBusinessUseCaseImpl(businessRepository);

export const getAllResourcesUseCase = new GetAllResourcesUseCaseImpl(resourceRepository);
export const createResourceUseCase = new CreateResourceUseCaseImpl(resourceRepository);

export const createReservationUseCase = new CreateReservationUseCaseImpl(reservationRepository);
export const getReservationUseCase = new GetReservationUseCaseImpl(reservationRepository);

export const getAvailabilityRulesUseCase = new GetAvailabilityRulesUseCaseImpl(availabilityRuleRepository);
export const createAvailabilityRuleUseCase = new CreateAvailabilityRuleUseCaseImpl(availabilityRuleRepository);
export const deleteAvailabilityRuleUseCase = new DeleteAvailabilityRuleUseCaseImpl(availabilityRuleRepository);
