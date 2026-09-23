// Tanki omotači oko REST endpoint-a koje seed-demo.ts koristi. Oblici tela su
// izvedeni iz modules/domain/src (ugovori) i modules/infrastructure/src
// (stvarni axios pozivi) — videti fajl:linija reference u komentarima ispod.
// Namerno se ne uvozi @domain/@infrastructure (e2e/ je odvojen TS projekat,
// bez alias-a na module — isti pristup kao u e2e/specs/*.spec.ts).

import type { APIResponse } from '@playwright/test';
import type { ApiClient } from '../fixtures/api';

export async function assertOk(response: APIResponse, label: string): Promise<void> {
  if (!response.ok()) {
    throw new Error(`${label}: HTTP ${response.status()} ${await response.text()}`);
  }
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  enabled: boolean | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BusinessDto {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DELETED';
  ownerId: string | null;
  categoryId: string | null;
}

export interface BusinessCategoryDto {
  id: string;
  name: string;
  parentId: string | null;
}

export interface BusinessLocationDto {
  id: string;
  addressLine1: string | null;
  ownerConfirmed: boolean;
}

export interface BusinessServiceDto {
  id: string;
  name: string;
}

export interface ResourceDto {
  id: string;
  name: string;
  type: string;
}

export interface AvailabilityRuleDto {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface ResourceSlotDto {
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'PENDING' | 'CONFIRMED';
}

export interface ReservationDto {
  id: string;
  resourceId: string;
  serviceId: string;
  startTime: string;
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  business: { id: string; name: string } | null;
}

/** `/auth/users/admin/accounts?search=<email>` — pretraga admin naloga (koristi se i za ownerId, videti fe-brief #103). */
export async function findUserByEmail(admin: ApiClient, email: string): Promise<UserDto | null> {
  const response = await admin.auth.get('users/admin/accounts', { params: { search: email, size: 10 } });
  await assertOk(response, `GET /auth/users/admin/accounts?search=${email}`);
  const page = (await response.json()) as PageResponseDto<UserDto>;
  return page.content.find((u) => u.email === email) ?? null;
}

/** `POST /auth/users/admin/accounts` — modules/infrastructure/src/repositories/UserApiRepository.ts:58. */
export async function createUserByAdmin(
  admin: ApiClient,
  data: { email: string; password: string; firstName: string; lastName: string },
): Promise<UserDto> {
  const response = await admin.auth.post('users/admin/accounts', {
    data: { ...data, roles: ['ROLE_USER'] },
  });
  await assertOk(response, `POST /auth/users/admin/accounts (${data.email})`);
  return (await response.json()) as UserDto;
}

/** `PATCH /auth/users/admin/accounts/{id}/status` — sili ACTIVE kad admin-kreiran nalog nije odmah aktivan. */
export async function activateUserByAdmin(admin: ApiClient, id: string): Promise<UserDto> {
  const response = await admin.auth.patch(`users/admin/accounts/${id}/status`, {
    data: { status: 'ACTIVE' },
  });
  await assertOk(response, `PATCH /auth/users/admin/accounts/${id}/status`);
  return (await response.json()) as UserDto;
}

/** `GET /businesses/search` — modules/infrastructure/src/repositories/BusinessApiRepository.ts:32. */
export async function findBusinessByName(admin: ApiClient, name: string): Promise<BusinessDto | null> {
  const response = await admin.get('/businesses/search', { params: { search: name, page: 0, size: 50 } });
  await assertOk(response, `GET /businesses/search?search=${name}`);
  const page = (await response.json()) as PageResponseDto<BusinessDto>;
  return page.content.find((b) => b.name === name) ?? null;
}

/** `POST /businesses/admin` — odmah aktivan biznis (videti e2e/specs/prikaz-adrese-lokacije.spec.ts:72). */
export async function createBusinessByAdmin(
  admin: ApiClient,
  data: { name: string; ownerId: string; location: LocationCommand },
): Promise<BusinessDto> {
  const response = await admin.post('/businesses/admin', { data });
  await assertOk(response, `POST /businesses/admin (${data.name})`);
  return (await response.json()) as BusinessDto;
}

export async function fetchCategories(admin: ApiClient): Promise<BusinessCategoryDto[]> {
  const response = await admin.get('/business-categories', { headers: { 'Accept-Language': 'en' } });
  await assertOk(response, 'GET /business-categories');
  return (await response.json()) as BusinessCategoryDto[];
}

export async function setBusinessCategory(admin: ApiClient, businessId: string, categoryId: string): Promise<void> {
  const response = await admin.put(`/businesses/${businessId}/category`, { data: { categoryId } });
  await assertOk(response, `PUT /businesses/${businessId}/category`);
}

export interface LocationCommand {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

export async function listLocations(client: ApiClient, businessId: string): Promise<BusinessLocationDto[]> {
  const response = await client.get(`/businesses/${businessId}/locations`);
  await assertOk(response, `GET /businesses/${businessId}/locations`);
  return (await response.json()) as BusinessLocationDto[];
}

export async function createLocation(
  ownerApi: ApiClient,
  businessId: string,
  data: LocationCommand,
): Promise<BusinessLocationDto> {
  const response = await ownerApi.post(`/businesses/${businessId}/locations`, { data });
  await assertOk(response, `POST /businesses/${businessId}/locations (${data.name})`);
  return (await response.json()) as BusinessLocationDto;
}

export async function confirmLocation(ownerApi: ApiClient, businessId: string, locationId: string): Promise<void> {
  const response = await ownerApi.post(`/businesses/${businessId}/locations/${locationId}/confirm`);
  await assertOk(response, `POST /businesses/${businessId}/locations/${locationId}/confirm`);
}

export async function listServices(client: ApiClient, businessId: string): Promise<BusinessServiceDto[]> {
  const response = await client.get(`/businesses/${businessId}/services`);
  await assertOk(response, `GET /businesses/${businessId}/services`);
  return (await response.json()) as BusinessServiceDto[];
}

export interface ServiceCommand {
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: string;
  durationStep: number;
}

export async function createService(
  ownerApi: ApiClient,
  businessId: string,
  data: ServiceCommand,
): Promise<BusinessServiceDto> {
  const response = await ownerApi.post(`/businesses/${businessId}/services`, { data });
  await assertOk(response, `POST /businesses/${businessId}/services (${data.name})`);
  return (await response.json()) as BusinessServiceDto;
}

export async function listLocationServiceIds(
  client: ApiClient,
  businessId: string,
  locationId: string,
): Promise<string[]> {
  const response = await client.get(`/businesses/${businessId}/locations/${locationId}/services`);
  await assertOk(response, `GET /businesses/${businessId}/locations/${locationId}/services`);
  const links = (await response.json()) as Array<{ serviceId: string }>;
  return links.map((l) => l.serviceId);
}

export async function addServiceToLocation(
  ownerApi: ApiClient,
  businessId: string,
  locationId: string,
  serviceId: string,
): Promise<void> {
  const response = await ownerApi.post(`/businesses/${businessId}/locations/${locationId}/services`, {
    data: { serviceId },
  });
  await assertOk(response, `POST /businesses/${businessId}/locations/${locationId}/services (${serviceId})`);
}

export async function listResources(client: ApiClient, businessId: string): Promise<ResourceDto[]> {
  const response = await client.get(`/businesses/${businessId}/resources`, { params: { page: 0, size: 100 } });
  await assertOk(response, `GET /businesses/${businessId}/resources`);
  const page = (await response.json()) as PageResponseDto<ResourceDto>;
  return page.content;
}

/** `POST /businesses/{id}/resources` — telo nosi i `id`/`businessId`, ne samo komandu (modules/infrastructure/src/repositories/ResourceApiRepository.ts:29). */
export async function createResource(
  ownerApi: ApiClient,
  businessId: string,
  data: { name: string; type: string },
): Promise<ResourceDto> {
  const response = await ownerApi.post(`/businesses/${businessId}/resources`, {
    data: { id: null, businessId, ...data },
  });
  await assertOk(response, `POST /businesses/${businessId}/resources (${data.name})`);
  return (await response.json()) as ResourceDto;
}

export async function listLocationResourceIds(
  client: ApiClient,
  businessId: string,
  locationId: string,
): Promise<string[]> {
  const response = await client.get(`/businesses/${businessId}/locations/${locationId}/resources`);
  await assertOk(response, `GET /businesses/${businessId}/locations/${locationId}/resources`);
  const links = (await response.json()) as Array<{ resourceId: string }>;
  return links.map((l) => l.resourceId);
}

export async function addResourceToLocation(
  ownerApi: ApiClient,
  businessId: string,
  locationId: string,
  resourceId: string,
): Promise<void> {
  const response = await ownerApi.post(`/businesses/${businessId}/locations/${locationId}/resources`, {
    data: { resourceId },
  });
  await assertOk(response, `POST /businesses/${businessId}/locations/${locationId}/resources (${resourceId})`);
}

export async function listAvailabilityRules(client: ApiClient, resourceId: string): Promise<AvailabilityRuleDto[]> {
  const response = await client.get(`/resources/${resourceId}/availability-rules`);
  await assertOk(response, `GET /resources/${resourceId}/availability-rules`);
  return (await response.json()) as AvailabilityRuleDto[];
}

/** `POST /resources/{id}/availability-rules` — telo nosi i `id`/`resourceId`, ne samo komandu (modules/infrastructure/src/repositories/ResourceAvailabilityRuleApiRepository.ts:20). */
export async function createAvailabilityRule(
  ownerApi: ApiClient,
  resourceId: string,
  data: { dayOfWeek: string; startTime: string; endTime: string },
): Promise<void> {
  const response = await ownerApi.post(`/resources/${resourceId}/availability-rules`, {
    data: { id: null, resourceId, ...data },
  });
  await assertOk(response, `POST /resources/${resourceId}/availability-rules (${data.dayOfWeek})`);
}

export async function fetchSlots(
  client: ApiClient,
  resourceId: string,
  serviceId: string,
  from: string,
  to: string,
): Promise<ResourceSlotDto[]> {
  const response = await client.get(`/resources/${resourceId}/slots`, { params: { serviceId, from, to } });
  await assertOk(response, `GET /resources/${resourceId}/slots?serviceId=${serviceId}&from=${from}&to=${to}`);
  return (await response.json()) as ResourceSlotDto[];
}

export async function listMyReservations(userApi: ApiClient): Promise<ReservationDto[]> {
  const response = await userApi.get('/reservations');
  await assertOk(response, 'GET /reservations');
  return (await response.json()) as ReservationDto[];
}

/** `POST /resources/{id}/reservations` — telo nosi i `id`/`userId`/`resourceId`, ne samo komandu (modules/infrastructure/src/repositories/ReservationApiRepository.ts:13). */
export async function createReservation(
  userApi: ApiClient,
  resourceId: string,
  data: { serviceId: string; startTime: string; endTime: string },
): Promise<ReservationDto> {
  const response = await userApi.post(`/resources/${resourceId}/reservations`, {
    data: { id: null, userId: null, resourceId, ...data },
  });
  await assertOk(response, `POST /resources/${resourceId}/reservations`);
  return (await response.json()) as ReservationDto;
}
