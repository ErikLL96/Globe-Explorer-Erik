import type { Destination } from './types';
import { TOTAL_COUNTRIES, normalizeCountryCode, toCountedCountry } from './countries';

export interface TravelStats {
  /** Unique counted (195-convention) countries with at least one visited destination. */
  visitedCountries: string[];
  visitedCountryCount: number;
  /** Unique visited destinations. */
  visitedCities: number;
  wishlistCount: number;
  /** (visitedCountryCount / 195) × 100 — share of countries, not of land area. */
  worldExploredPercent: number;
  /** Raw polygon codes to highlight on the globe (territories keep their own polygon). */
  highlightedRegionCodes: string[];
  /** Visited regions that don't count towards the 195 (e.g. Antarctica), as codes and display names. */
  uncountedRegions: string[];
  uncountedRegionNames: string[];
}

export function computeStats(destinations: readonly Destination[]): TravelStats {
  const visited = destinations.filter((d) => d.status === 'visited');
  const counted = new Set<string>();
  const highlighted = new Set<string>();
  const uncounted = new Map<string, string>();

  for (const d of visited) {
    const raw = normalizeCountryCode(d.countryCode);
    highlighted.add(raw);
    const country = toCountedCountry(raw);
    if (country) counted.add(country);
    // Use the saved display name: custom pins can carry codes with no ISO name (e.g. Natural Earth "NE-SOL").
    else if (!uncounted.has(raw)) uncounted.set(raw, d.country);
  }

  const visitedCities = new Set(visited.map((d) => d.locationId)).size;
  const wishlistCount = new Set(destinations.filter((d) => d.status === 'wishlist').map((d) => d.locationId)).size;

  return {
    visitedCountries: [...counted].sort(),
    visitedCountryCount: counted.size,
    visitedCities,
    wishlistCount,
    worldExploredPercent: (counted.size / TOTAL_COUNTRIES) * 100,
    highlightedRegionCodes: [...highlighted].sort(),
    uncountedRegions: [...uncounted.keys()].sort(),
    uncountedRegionNames: [...uncounted.values()].sort(),
  };
}

/** "4.1%" — one decimal place. */
export function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}
