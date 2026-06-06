export interface BusinessLocation {
  id: string;
  businessId: string;
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  ownerConfirmed: boolean;
}

export interface UpdateBusinessLocationFromPlaceCommand {
  placeId: string;
  sessionToken?: string;
}

export interface CreateBusinessLocationCommand {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  phone?: string;
  email?: string;
  website?: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
}
