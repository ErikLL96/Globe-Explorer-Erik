import type { Destination } from './types';
import { normalizeCountryCode } from './countries';

/** How a country polygon is coloured on the globe. */
export type CountryStatus = 'visited' | 'wishlist' | 'none';

export interface CountryStatuses {
  /** Polygon codes with at least one visited destination. */
  visited: string[];
  /** Polygon codes with wishlist destinations and nothing visited — a visit always wins. */
  wishlist: string[];
}

/**
 * Derives each country's map status from the saved destinations.
 * Codes are the raw polygon codes (territories such as Hong Kong keep their own polygon),
 * matching the `iso` property of the bundled country shapes.
 */
export function computeCountryStatuses(destinations: readonly Destination[]): CountryStatuses {
  const visited = new Set<string>();
  const wishlist = new Set<string>();
  for (const d of destinations) {
    (d.status === 'visited' ? visited : wishlist).add(normalizeCountryCode(d.countryCode));
  }
  return {
    visited: [...visited].sort(),
    wishlist: [...wishlist].filter((code) => !visited.has(code)).sort(),
  };
}

export function countryStatusOf(statuses: CountryStatuses, code: string): CountryStatus {
  const iso = normalizeCountryCode(code);
  if (statuses.visited.includes(iso)) return 'visited';
  if (statuses.wishlist.includes(iso)) return 'wishlist';
  return 'none';
}
