import type { BusinessCategory } from './BusinessCategory';

/**
 * The location a NearbyBusiness's distanceKm was measured against. Unlike the
 * general BusinessLocation entity, latitude/longitude are always present here —
 * the nearby-search endpoint only matches locations that have coordinates.
 */
export interface NearbyBusinessLocation {
  id: string;
  businessId: string;
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  ownerConfirmed: boolean;
}

export interface NearbyBusiness {
  id: string;
  name: string;
  categoryId: string | null;
  category: BusinessCategory | null;
  /** Relative path such as "/api/businesses/<id>/image", or null when there is no image. */
  imageUrl: string | null;
  location: NearbyBusinessLocation;
  distanceKm: number;
}
