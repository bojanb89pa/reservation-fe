import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchNearbyBusinessesUseCaseImpl } from '../business/SearchNearbyBusinessesUseCaseImpl';
import type { NearbyBusinessRepository, NearbyBusiness, PageResponse, NearbyBusinessSearchFilter } from '@domain';

const nearbyBusiness: NearbyBusiness = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Coffee Shop',
  categoryId: 'category-001',
  category: {
    id: 'category-001',
    name: 'Cafes',
  } as any,
  imageUrl: '/api/businesses/550e8400-e29b-41d4-a716-446655440000/image',
  location: {
    id: 'location-001',
    businessId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Main Location',
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'Springfield',
    postalCode: '12345',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    phone: '555-0123',
    email: 'info@coffeeshop.com',
    website: 'https://coffeeshop.com',
    googlePlaceId: 'place-001',
    googleMapsUrl: 'https://maps.google.com/...',
    ownerConfirmed: true,
  },
  distanceKm: 2.5,
};

const pageResponse: PageResponse<NearbyBusiness> = {
  content: [nearbyBusiness],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  nextCursor: null,
  prevCursor: null,
  hasNext: false,
  hasPrevious: false,
};

const filter: NearbyBusinessSearchFilter = {
  latitude: 40.7128,
  longitude: -74.006,
  categoryId: 'category-001',
};
const pageRequest = { page: 0, size: 20 };

let mockRepo: NearbyBusinessRepository;

beforeEach(() => {
  mockRepo = {
    search: vi.fn().mockResolvedValue(pageResponse),
  };
});

describe('SearchNearbyBusinessesUseCaseImpl', () => {
  it('delegates to the repository and returns whatever it resolves, unmodified', async () => {
    const useCase = new SearchNearbyBusinessesUseCaseImpl(mockRepo);

    const result = await useCase.execute(filter, pageRequest);

    expect(mockRepo.search).toHaveBeenCalledWith(filter, pageRequest);
    expect(result).toEqual(pageResponse);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('search failed');
    mockRepo.search = vi.fn().mockRejectedValue(failure);
    const useCase = new SearchNearbyBusinessesUseCaseImpl(mockRepo);

    await expect(useCase.execute(filter, pageRequest)).rejects.toBe(failure);
  });
});
