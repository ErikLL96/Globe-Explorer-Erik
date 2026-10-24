import { describe, expect, it } from 'vitest';
import { computeCountryStatuses, countryStatusOf } from './countryStatus';
import { addDestination, removeDestination, updateDestination } from './destinations';
import { computeStats } from './stats';
import { loadDestinations, saveDestinations, STORAGE_KEY } from './storage';
import { buildDemoDestinations } from './demo';
import { findLocation } from '../data/cities';
import type { Destination, TravelStatus } from './types';

function add(list: Destination[], id: string, status: TravelStatus): Destination[] {
  const location = findLocation(id);
  if (!location) throw new Error(`Missing test location ${id}`);
  const r = addDestination(list, location, status, '');
  if (!r.ok) throw new Error(`add failed for ${id}`);
  return r.destinations;
}

const statusOf = (list: Destination[], code: string) => countryStatusOf(computeCountryStatuses(list), code);
const idOf = (list: Destination[], locationId: string) => list.find((d) => d.locationId === locationId)!.id;

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

describe('country status colours', () => {
  it('1: no saved destinations leaves every country neutral', () => {
    expect(computeCountryStatuses([])).toEqual({ visited: [], wishlist: [] });
    expect(statusOf([], 'NO')).toBe('none');
  });

  it('2: one visited destination makes its country visited', () => {
    const list = add([], 'no-oslo', 'visited');
    expect(statusOf(list, 'NO')).toBe('visited');
    expect(statusOf(list, 'SE')).toBe('none');
  });

  it('3: one wishlist destination makes its country wishlist', () => {
    const list = add([], 'jp-kyoto', 'wishlist');
    expect(statusOf(list, 'JP')).toBe('wishlist');
  });

  it('4: visited wins over wishlist in the same country, and both markers remain', () => {
    const list = add(add([], 'es-madrid', 'visited'), 'es-barcelona', 'wishlist');
    const statuses = computeCountryStatuses(list);
    expect(countryStatusOf(statuses, 'ES')).toBe('visited');
    expect(statuses.wishlist).not.toContain('ES');
    // One marker per destination, each keeping its own status.
    expect(list.filter((d) => d.countryCode === 'ES').map((d) => d.status).sort()).toEqual(['visited', 'wishlist']);
    expect(computeStats(list)).toMatchObject({ visitedCountryCount: 1, visitedCities: 1, wishlistCount: 1 });
  });

  it('5: removing the last visited destination falls back to wishlist', () => {
    let list = add(add([], 'es-madrid', 'visited'), 'es-barcelona', 'wishlist');
    list = removeDestination(list, idOf(list, 'es-madrid'));
    expect(statusOf(list, 'ES')).toBe('wishlist');
  });

  it('5b: changing the last visited destination to wishlist falls back to wishlist', () => {
    let list = add([], 'no-oslo', 'visited');
    const r = updateDestination(list, idOf(list, 'no-oslo'), { status: 'wishlist' });
    if (!r.ok) throw new Error('update failed');
    list = r.destinations;
    expect(statusOf(list, 'NO')).toBe('wishlist');
  });

  it('6: removing every destination in a country makes it neutral again', () => {
    let list = add(add(add([], 'es-madrid', 'visited'), 'es-barcelona', 'wishlist'), 'no-oslo', 'visited');
    list = removeDestination(list, idOf(list, 'es-madrid'));
    list = removeDestination(list, idOf(list, 'es-barcelona'));
    expect(statusOf(list, 'ES')).toBe('none');
    expect(statusOf(list, 'NO')).toBe('visited');
  });

  it('keeps territories on their own polygon (Hong Kong is not China)', () => {
    const list = add([], 'hk-hong-kong', 'visited');
    expect(statusOf(list, 'HK')).toBe('visited');
    expect(statusOf(list, 'CN')).toBe('none');
  });

  it('7: demo mode colours the sample journey without touching saved data', () => {
    const storage = new MemoryStorage();
    const personal = add([], 'jp-kyoto', 'wishlist');
    saveDestinations(personal, storage);
    const saved = storage.getItem(STORAGE_KEY);

    const demo = computeCountryStatuses(buildDemoDestinations());
    expect(demo.visited).toEqual(['JP', 'MA', 'NO', 'PE', 'PT']);
    expect(demo.wishlist).toEqual(['AR', 'FJ', 'IS', 'NZ']);

    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    expect(statusOf(loadDestinations(storage).destinations, 'JP')).toBe('wishlist');
  });

  it('8: colours survive a storage reload', () => {
    const storage = new MemoryStorage();
    const list = add(add(add([], 'no-oslo', 'visited'), 'no-bergen', 'wishlist'), 'jp-kyoto', 'wishlist');
    saveDestinations(list, storage);
    const reloaded = loadDestinations(storage).destinations;
    expect(computeCountryStatuses(reloaded)).toEqual({ visited: ['NO'], wishlist: ['JP'] });
    expect(reloaded.map((d) => [d.locationId, d.status])).toEqual(list.map((d) => [d.locationId, d.status]));
  });
});
