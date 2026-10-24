import { describe, expect, it } from 'vitest';
import {
  addDestination,
  customLocationId,
  dedupeDestinations,
  filterDestinations,
  NOTE_MAX_LENGTH,
  updateDestination,
  validateCustomCity,
  validateNote,
  wrapLongitude,
} from './destinations';
import { CURATED_LOCATIONS, findLocation, searchLocations } from '../data/cities';
import { COUNTED_COUNTRIES, TERRITORY_SOVEREIGN } from './countries';
import type { Destination } from './types';

const oslo = findLocation('no-oslo')!;
const tokyo = findLocation('jp-tokyo')!;

describe('curated dataset', () => {
  it('has a broad, unique selection of real places', () => {
    expect(CURATED_LOCATIONS.length).toBeGreaterThanOrEqual(80);
    expect(new Set(CURATED_LOCATIONS.map((l) => l.id)).size).toBe(CURATED_LOCATIONS.length);
    for (const l of CURATED_LOCATIONS) {
      expect(l.latitude).toBeGreaterThanOrEqual(-90);
      expect(l.latitude).toBeLessThanOrEqual(90);
      expect(l.longitude).toBeGreaterThanOrEqual(-180);
      expect(l.longitude).toBeLessThanOrEqual(180);
      // Every curated country code is either one of the 195 or a mapped territory.
      expect(l.countryCode in COUNTED_COUNTRIES || l.countryCode in TERRITORY_SOVEREIGN).toBe(true);
    }
  });

  it('spot-checks known coordinates', () => {
    expect(oslo.latitude).toBeCloseTo(59.9, 0);
    expect(oslo.longitude).toBeCloseTo(10.75, 0);
    expect(tokyo.longitude).toBeCloseTo(139.7, 0);
  });
});

describe('searchLocations', () => {
  it('is case- and accent-insensitive and searches countries', () => {
    expect(searchLocations('OSLO')[0].id).toBe('no-oslo');
    expect(searchLocations('zurich')[0].city).toBe('Zürich');
    expect(searchLocations('norway').map((l) => l.id)).toEqual(expect.arrayContaining(['no-oslo', 'no-bergen']));
  });

  it('returns same-named cities in different countries', () => {
    const results = searchLocations('cordoba');
    expect(results.map((l) => l.country).sort()).toEqual(['Argentina', 'Spain']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchLocations('   ')).toEqual([]);
  });
});

describe('addDestination', () => {
  it('Test 6: prevents duplicates by locationId, regardless of status', () => {
    const first = addDestination([], oslo, 'visited', 'Weekend in the old town');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = addDestination(first.destinations, oslo, 'wishlist', '');
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe('duplicate');
    if (again.reason === 'duplicate') expect(again.existing.id).toBe(first.destination.id);
  });

  it('trims notes and rejects notes that are too long', () => {
    const ok = addDestination([], oslo, 'visited', '  hello  ');
    expect(ok.ok && ok.destination.note).toBe('hello');
    const tooLong = addDestination([], oslo, 'visited', 'x'.repeat(NOTE_MAX_LENGTH + 1));
    expect(tooLong.ok).toBe(false);
  });

  it('does not mutate the input array', () => {
    const list: Destination[] = [];
    addDestination(list, oslo, 'visited', '');
    expect(list).toHaveLength(0);
  });
});

describe('updateDestination', () => {
  it('changes status and note immutably', () => {
    const added = addDestination([], tokyo, 'wishlist', '');
    if (!added.ok) throw new Error();
    const r = updateDestination(added.destinations, added.destination.id, { status: 'visited', note: 'Ramen!' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.destination).toMatchObject({ status: 'visited', note: 'Ramen!' });
    expect(added.destination.status).toBe('wishlist');
  });

  it('refuses to change the place to one already saved', () => {
    const a = addDestination([], tokyo, 'wishlist', '');
    if (!a.ok) throw new Error();
    const b = addDestination(a.destinations, oslo, 'visited', '');
    if (!b.ok) throw new Error();
    const r = updateDestination(b.destinations, a.destination.id, { location: oslo });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('duplicate');
  });
});

describe('dedupeDestinations', () => {
  it('merges copies of the same place, preferring visited', () => {
    const a = addDestination([], oslo, 'wishlist', 'old');
    if (!a.ok) throw new Error();
    const copy: Destination = { ...a.destination, id: 'other', status: 'visited', note: 'new', updatedAt: '2999-01-01T00:00:00.000Z' };
    const merged = dedupeDestinations([a.destination, copy]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ status: 'visited', note: 'new' });
  });
});

describe('filterDestinations', () => {
  it('Test 8: filters by status and text', () => {
    const a = addDestination([], oslo, 'visited', '');
    if (!a.ok) throw new Error();
    const b = addDestination(a.destinations, tokyo, 'wishlist', 'cherry blossoms');
    if (!b.ok) throw new Error();
    const list = b.destinations;
    expect(filterDestinations(list, 'all')).toHaveLength(2);
    expect(filterDestinations(list, 'visited').map((d) => d.city)).toEqual(['Oslo']);
    expect(filterDestinations(list, 'wishlist').map((d) => d.city)).toEqual(['Tokyo']);
    expect(filterDestinations(list, 'all', 'japan').map((d) => d.city)).toEqual(['Tokyo']);
    expect(filterDestinations(list, 'all', 'blossom').map((d) => d.city)).toEqual(['Tokyo']);
  });
});

describe('validation helpers', () => {
  it('validates notes and custom names', () => {
    expect(validateNote('fine')).toBeNull();
    expect(validateNote('x'.repeat(NOTE_MAX_LENGTH + 1))).not.toBeNull();
    expect(validateCustomCity('  ')).not.toBeNull();
    expect(validateCustomCity('Lofoten')).toBeNull();
  });

  it('builds stable custom ids', () => {
    expect(customLocationId('Svolvær ', 'no')).toBe(customLocationId('svolvær', 'NO'));
  });

  it('wraps longitudes around the date line', () => {
    expect(wrapLongitude(181)).toBe(-179);
    expect(wrapLongitude(-181)).toBe(179);
    expect(wrapLongitude(180)).toBe(180);
    expect(wrapLongitude(-180)).toBe(-180);
    expect(wrapLongitude(10)).toBe(10);
  });
});
