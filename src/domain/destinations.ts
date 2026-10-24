import type { Destination, Location, StatusFilter, TravelStatus } from './types';
import { normalizeCountryCode } from './countries';
import { foldText } from '../data/cities';

export const NOTE_MAX_LENGTH = 1500;
export const EARLIEST_TRAVEL_YEAR = 1900;

export function isValidTravelYear(value: unknown, currentYear = new Date().getFullYear()): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= EARLIEST_TRAVEL_YEAR && value <= currentYear;
}

export function validateTravelYear(year: number | null, status: TravelStatus): string | null {
  if (year === null) return null;
  if (status !== 'visited') return 'A travel year can only be added to visited destinations.';
  return isValidTravelYear(year) ? null : `Choose a year between ${EARLIEST_TRAVEL_YEAR} and ${new Date().getFullYear()}.`;
}
export const CITY_MAX_LENGTH = 80;

export function isTravelStatus(value: unknown): value is TravelStatus {
  return value === 'visited' || value === 'wishlist';
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Wrap any longitude into [-180, 180] — keeps points near the date line valid. */
export function wrapLongitude(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

export function validateNote(note: string): string | null {
  if (note.trim().length > NOTE_MAX_LENGTH) return `Keep notes to ${NOTE_MAX_LENGTH} characters or fewer.`;
  return null;
}

export function validateCustomCity(city: string): string | null {
  const trimmed = city.trim();
  if (!trimmed) return 'Give this place a name.';
  if (trimmed.length > CITY_MAX_LENGTH) return `Place names can be at most ${CITY_MAX_LENGTH} characters.`;
  return null;
}

/** Stable id for a user-pinned place: same name in the same country = same place. */
export function customLocationId(city: string, countryCode: string): string {
  const slug = foldText(city).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `custom:${normalizeCountryCode(countryCode).toLowerCase()}-${slug}`;
}

export function findByLocation(destinations: readonly Destination[], locationId: string): Destination | undefined {
  return destinations.find((d) => d.locationId === locationId);
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDestination(
  location: Location,
  status: TravelStatus,
  note: string,
  now: Date = new Date(),
  travelYear: number | null = null,
): Destination {
  const timestamp = now.toISOString();
  return {
    id: newId(),
    locationId: location.id,
    city: location.city,
    country: location.country,
    countryCode: normalizeCountryCode(location.countryCode),
    latitude: location.latitude,
    longitude: wrapLongitude(location.longitude),
    status,
    travelYear: status === 'visited' ? travelYear : null,
    note: note.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export type AddResult =
  | { ok: true; destinations: Destination[]; destination: Destination }
  | { ok: false; reason: 'duplicate'; existing: Destination }
  | { ok: false; reason: 'invalid'; message: string };

/** Adds a destination unless the same location is already saved (under any status). */
export function addDestination(
  destinations: readonly Destination[],
  location: Location,
  status: TravelStatus,
  note: string,
  now?: Date,
  travelYear: number | null = null,
): AddResult {
  const yearError = validateTravelYear(travelYear, status);
  if (yearError) return { ok: false, reason: 'invalid', message: yearError };
  const noteError = validateNote(note);
  if (noteError) return { ok: false, reason: 'invalid', message: noteError };
  if (!isValidLatitude(location.latitude) || !Number.isFinite(location.longitude)) {
    return { ok: false, reason: 'invalid', message: 'This place has invalid coordinates.' };
  }
  const existing = findByLocation(destinations, location.id);
  if (existing) return { ok: false, reason: 'duplicate', existing };
  const destination = createDestination(location, status, note, now, travelYear);
  return { ok: true, destinations: [...destinations, destination], destination };
}

export interface DestinationChanges {
  status?: TravelStatus;
  note?: string;
  travelYear?: number | null;
  location?: Location;
}

export type UpdateResult =
  | { ok: true; destinations: Destination[]; destination: Destination }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'duplicate'; existing: Destination }
  | { ok: false; reason: 'invalid'; message: string };

export function updateDestination(
  destinations: readonly Destination[],
  id: string,
  changes: DestinationChanges,
  now: Date = new Date(),
): UpdateResult {
  const current = destinations.find((d) => d.id === id);
  if (!current) return { ok: false, reason: 'not-found' };
  if (changes.note !== undefined) {
    const noteError = validateNote(changes.note);
    if (noteError) return { ok: false, reason: 'invalid', message: noteError };
  }
  const nextStatus = changes.status ?? current.status;
  const nextYear = nextStatus === 'wishlist' ? null : changes.travelYear !== undefined ? changes.travelYear : current.travelYear;
  const yearError = validateTravelYear(nextYear, nextStatus);
  if (yearError) return { ok: false, reason: 'invalid', message: yearError };
  if (changes.location && changes.location.id !== current.locationId) {
    const clash = findByLocation(destinations, changes.location.id);
    if (clash) return { ok: false, reason: 'duplicate', existing: clash };
  }
  const loc = changes.location;
  const updated: Destination = {
    ...current,
    ...(loc && {
      locationId: loc.id,
      city: loc.city,
      country: loc.country,
      countryCode: normalizeCountryCode(loc.countryCode),
      latitude: loc.latitude,
      longitude: wrapLongitude(loc.longitude),
    }),
    status: nextStatus,
    travelYear: nextYear,
    note: changes.note !== undefined ? changes.note.trim() : current.note,
    updatedAt: now.toISOString(),
  };
  return {
    ok: true,
    destination: updated,
    destinations: destinations.map((d) => (d.id === id ? updated : d)),
  };
}

export function removeDestination(destinations: readonly Destination[], id: string): Destination[] {
  return destinations.filter((d) => d.id !== id);
}

/**
 * Removes records that share a locationId, keeping one entry per place.
 * If the copies disagree, `visited` wins (you can't un-visit a place) and the newest note is kept.
 */
export function dedupeDestinations(destinations: readonly Destination[]): Destination[] {
  const byLocation = new Map<string, Destination>();
  for (const d of destinations) {
    const prev = byLocation.get(d.locationId);
    if (!prev) {
      byLocation.set(d.locationId, d);
      continue;
    }
    const newer = d.updatedAt > prev.updatedAt ? d : prev;
    byLocation.set(d.locationId, {
      ...prev,
      status: prev.status === 'visited' || d.status === 'visited' ? 'visited' : 'wishlist',
      note: newer.note || prev.note || d.note,
      travelYear: newer.status === 'visited' && newer.travelYear !== null ? newer.travelYear : (prev.travelYear ?? d.travelYear),
      updatedAt: newer.updatedAt,
    });
  }
  return [...byLocation.values()];
}

export function filterDestinations(
  destinations: readonly Destination[],
  filter: StatusFilter,
  query = '',
): Destination[] {
  const q = foldText(query);
  return destinations.filter(
    (d) =>
      (filter === 'all' || d.status === filter) &&
      (!q || foldText(d.city).includes(q) || foldText(d.country).includes(q) || foldText(d.note).includes(q)),
  );
}

/** Newest first — the order shown in the journey list. */
export function sortByRecent(destinations: readonly Destination[]): Destination[] {
  return [...destinations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
