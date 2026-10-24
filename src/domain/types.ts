export type TravelStatus = 'visited' | 'wishlist';

/** A place from the curated dataset (or a custom pin) — pure geography, no user data. */
export interface Location {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

/** A user-saved destination. `locationId` is the stable key used for duplicate detection. */
export interface Destination {
  id: string;
  locationId: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  status: TravelStatus;
  note: string;
  /** Optional year of the actual visit, not the record creation date. */
  travelYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export type StatusFilter = 'all' | TravelStatus;

export interface DestinationDraft {
  location: Location;
  status: TravelStatus;
  note: string;
  travelYear?: number | null;
}
