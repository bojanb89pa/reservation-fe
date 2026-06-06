export interface PlaceAutocompleteSuggestion {
  placeId: string;
  displayName: string;
  address: string | null;
}

export interface PlaceDetails {
  placeId: string;
  name: string | null;
  formattedAddress: string | null;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
}
