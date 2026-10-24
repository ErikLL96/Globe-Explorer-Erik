import type { Location } from '../domain/types';
import { countryName } from '../domain/countries';
import generated from './cities.generated.json';

/**
 * Curated destinations. Coordinates come from Natural Earth populated places
 * (see scripts/build-geodata.mjs) — they are never typed by hand.
 */
export const CURATED_LOCATIONS: readonly Location[] = generated
  .map((c) => ({ ...c, country: countryName(c.countryCode) }))
  .sort((a, b) => a.city.localeCompare(b.city));

const byId = new Map(CURATED_LOCATIONS.map((l) => [l.id, l]));

export function findLocation(id: string): Location | undefined {
  return byId.get(id);
}

/** Lower-case and strip accents so "zurich" finds "Zürich" and "SAO" finds "São Paulo". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Case- and accent-insensitive search over city and country names; city-prefix matches first. */
export function searchLocations(query: string, locations: readonly Location[] = CURATED_LOCATIONS, limit = 8): Location[] {
  const q = foldText(query);
  if (!q) return [];
  const scored: { loc: Location; score: number }[] = [];
  for (const loc of locations) {
    const city = foldText(loc.city);
    const country = foldText(loc.country);
    let score = -1;
    if (city.startsWith(q)) score = 0;
    else if (city.includes(q)) score = 1;
    else if (country.startsWith(q)) score = 2;
    else if (country.includes(q) || loc.countryCode.toLowerCase() === q) score = 3;
    if (score >= 0) scored.push({ loc, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.loc.city.localeCompare(b.loc.city))
    .slice(0, limit)
    .map((s) => s.loc);
}
