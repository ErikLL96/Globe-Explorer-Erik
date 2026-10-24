import { describe, expect, it } from 'vitest';
import { computeStats, formatPercent } from './stats';
import { addDestination, removeDestination, updateDestination } from './destinations';
import { COUNTED_COUNTRIES, TOTAL_COUNTRIES, UN_MEMBER_STATES, toCountedCountry } from './countries';
import { findLocation } from '../data/cities';
import type { Destination, Location, TravelStatus } from './types';

function loc(id: string): Location {
  const l = findLocation(id);
  if (!l) throw new Error(`Missing test location ${id}`);
  return l;
}

function add(list: Destination[], id: string, status: TravelStatus): Destination[] {
  const r = addDestination(list, loc(id), status, '');
  if (!r.ok) throw new Error(`add failed for ${id}`);
  return r.destinations;
}

describe('195-country convention', () => {
  it('contains exactly 193 UN members + 2 observers', () => {
    expect(Object.keys(UN_MEMBER_STATES)).toHaveLength(193);
    expect(Object.keys(COUNTED_COUNTRIES)).toHaveLength(TOTAL_COUNTRIES);
    expect(TOTAL_COUNTRIES).toBe(195);
  });

  it('maps territories to their sovereign state and ignores non-counted regions', () => {
    expect(toCountedCountry('hk')).toBe('CN');
    expect(toCountedCountry('PR')).toBe('US');
    expect(toCountedCountry('NO')).toBe('NO');
    expect(toCountedCountry('AQ')).toBeNull();
    expect(toCountedCountry('XK')).toBeNull();
  });
});

describe('computeStats', () => {
  it('starts at zero', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ visitedCountryCount: 0, visitedCities: 0, wishlistCount: 0, worldExploredPercent: 0 });
  });

  it('Test 1–3: counts visited cities and unique countries', () => {
    let list = add([], 'no-oslo', 'visited');
    let s = computeStats(list);
    expect(s.visitedCountries).toEqual(['NO']);
    expect(s.visitedCities).toBe(1);
    expect(s.highlightedRegionCodes).toEqual(['NO']);

    list = add(list, 'jp-tokyo', 'wishlist');
    s = computeStats(list);
    expect(s.visitedCountries).toEqual(['NO']); // Japan is only on the wishlist
    expect(s.wishlistCount).toBe(1);

    list = add(list, 'no-bergen', 'visited');
    s = computeStats(list);
    expect(s.visitedCities).toBe(2);
    expect(s.visitedCountryCount).toBe(1); // still just Norway
  });

  it('Test 4: status change from wishlist to visited highlights the country', () => {
    let list = add(add([], 'no-oslo', 'visited'), 'jp-tokyo', 'wishlist');
    const tokyo = list.find((d) => d.locationId === 'jp-tokyo')!;
    const r = updateDestination(list, tokyo.id, { status: 'visited' });
    if (!r.ok) throw new Error('update failed');
    list = r.destinations;
    const s = computeStats(list);
    expect(s.visitedCountries).toEqual(['JP', 'NO']);
    expect(s.wishlistCount).toBe(0);
    expect(s.highlightedRegionCodes).toContain('JP');
  });

  it('Test 5: deleting the last visited city in a country removes its highlight', () => {
    let list = add(add(add([], 'no-oslo', 'visited'), 'no-bergen', 'visited'), 'jp-tokyo', 'visited');
    const oslo = list.find((d) => d.locationId === 'no-oslo')!;
    const bergen = list.find((d) => d.locationId === 'no-bergen')!;
    list = removeDestination(list, oslo.id);
    expect(computeStats(list).highlightedRegionCodes).toContain('NO'); // Bergen still visited
    list = removeDestination(list, bergen.id);
    const s = computeStats(list);
    expect(s.highlightedRegionCodes).toEqual(['JP']);
    expect(s.visitedCountryCount).toBe(1);
  });

  it('keeps a country visited when it also has wishlist cities', () => {
    const list = add(add([], 'jp-tokyo', 'visited'), 'jp-kyoto', 'wishlist');
    const s = computeStats(list);
    expect(s.visitedCountries).toEqual(['JP']);
    expect(s.wishlistCount).toBe(1);
  });

  it('counts a territory towards its sovereign state but highlights its own polygon', () => {
    const list = add(add([], 'hk-hong-kong', 'visited'), 'cn-beijing', 'visited');
    const s = computeStats(list);
    expect(s.visitedCountries).toEqual(['CN']);
    expect(s.visitedCountryCount).toBe(1);
    expect(s.highlightedRegionCodes).toEqual(['CN', 'HK']);
  });

  it('does not let regions outside the 195 raise the percentage', () => {
    const antarctica: Location = { id: 'custom:aq-mcmurdo', city: 'McMurdo', country: 'Antarctica', countryCode: 'AQ', latitude: -77.85, longitude: 166.67 };
    const r = addDestination([], antarctica, 'visited', '');
    if (!r.ok) throw new Error('add failed');
    const s = computeStats(r.destinations);
    expect(s.visitedCountryCount).toBe(0);
    expect(s.worldExploredPercent).toBe(0);
    expect(s.uncountedRegions).toEqual(['AQ']);
    expect(s.uncountedRegionNames).toEqual(['Antarctica']);
  });

  it('names custom regions that have no ISO code by their saved country name', () => {
    const somaliland: Location = { id: 'custom:ne-sol-hargeisa', city: 'Hargeisa', country: 'Somaliland', countryCode: 'NE-SOL', latitude: 9.56, longitude: 44.06 };
    const r = addDestination([], somaliland, 'visited', '');
    if (!r.ok) throw new Error('add failed');
    const s = computeStats(r.destinations);
    expect(s.visitedCountryCount).toBe(0);
    expect(s.highlightedRegionCodes).toEqual(['NE-SOL']);
    expect(s.uncountedRegionNames).toEqual(['Somaliland']);
  });

  it('computes world explored as visited / 195 × 100', () => {
    const ids = ['no-oslo', 'jp-tokyo', 'fr-paris', 'pe-lima', 'au-sydney', 'ke-nairobi', 'ca-toronto', 'br-sao-paulo'];
    const list = ids.reduce<Destination[]>((acc, id) => add(acc, id, 'visited'), []);
    const s = computeStats(list);
    expect(s.visitedCountryCount).toBe(8);
    expect(s.worldExploredPercent).toBeCloseTo((8 / 195) * 100, 10);
    expect(formatPercent(s.worldExploredPercent)).toBe('4.1%');
  });
});
