import type { Destination } from './types';
import { dedupeDestinations, isTravelStatus, isValidLatitude, isValidLongitude, isValidTravelYear, NOTE_MAX_LENGTH } from './destinations';
import { normalizeCountryCode } from './countries';

/** Versioned key — bump the version if the stored shape ever changes. */
export const STORAGE_KEY = 'globe-explorer:v1';
export const BACKUP_KEY = 'globe-explorer:v1:unreadable-backup';

interface StoredData {
  version: 1;
  destinations: Destination[];
}

export interface LoadResult {
  destinations: Destination[];
  /** Set when stored data existed but could not be (fully) read. */
  problem: 'malformed' | 'invalid-records' | null;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Returns a clean Destination, or null if the record can't be trusted. */
export function sanitizeDestination(value: unknown): Destination | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.locationId) ||
    !isNonEmptyString(r.city) ||
    !isNonEmptyString(r.country) ||
    !isNonEmptyString(r.countryCode) ||
    !isValidLatitude(r.latitude) ||
    !isValidLongitude(r.longitude) ||
    !isTravelStatus(r.status)
  ) {
    return null;
  }
  const now = new Date().toISOString();
  return {
    id: r.id,
    locationId: r.locationId,
    city: r.city.trim(),
    country: r.country.trim(),
    countryCode: normalizeCountryCode(r.countryCode),
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
    note: typeof r.note === 'string' ? r.note.slice(0, NOTE_MAX_LENGTH) : '',
    travelYear: r.status === 'visited' && isValidTravelYear(r.travelYear) ? r.travelYear : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

/** Parses stored JSON defensively. Never throws. */
export function parseStoredData(raw: string | null): LoadResult {
  if (raw === null || raw === '') return { destinations: [], problem: null };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { destinations: [], problem: 'malformed' };
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as StoredData).destinations)
      ? (data as StoredData).destinations
      : null;
  if (!list) return { destinations: [], problem: 'malformed' };

  const valid = list.map(sanitizeDestination).filter((d): d is Destination => d !== null);
  const deduped = dedupeDestinations(valid);
  return {
    destinations: deduped,
    problem: valid.length !== list.length ? 'invalid-records' : null,
  };
}

export function serialize(destinations: readonly Destination[]): string {
  const data: StoredData = { version: 1, destinations: [...destinations] };
  return JSON.stringify(data);
}

/** Storage access can throw (private mode, disabled storage) — callers get safe fallbacks. */
function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadDestinations(storage: Storage | null = safeStorage()): LoadResult {
  if (!storage) return { destinations: [], problem: null };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { destinations: [], problem: null };
  }
  const result = parseStoredData(raw);
  if (result.problem && raw) {
    // Keep the original text so nothing is silently lost before we overwrite the key.
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      /* best effort */
    }
  }
  return result;
}

export function saveDestinations(destinations: readonly Destination[], storage: Storage | null = safeStorage()): boolean {
  if (!storage) return false;
  try {
    const next = serialize(destinations);
    // Skip identical writes so tabs syncing via the 'storage' event don't echo each other.
    if (storage.getItem(STORAGE_KEY) !== next) storage.setItem(STORAGE_KEY, next);
    return true;
  } catch {
    return false;
  }
}
