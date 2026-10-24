import type { Destination, TravelStatus } from './types';
import { createDestination } from './destinations';
import { findLocation } from '../data/cities';

/**
 * Fictional sample journey for the "Try demo" mode.
 * Demo data lives only in memory and is never written to the user's saved collection.
 */
const SAMPLE: [locationId: string, status: TravelStatus, note: string][] = [
  ['no-oslo', 'visited', 'Sample memory: a slow morning by the fjord with cardamom buns.'],
  ['pt-lisbon', 'visited', 'Sample memory: rode tram 28 up to the miradouros at sunset.'],
  ['jp-kyoto', 'visited', 'Sample memory: temple gardens in the early autumn light.'],
  ['ma-marrakesh', 'visited', 'Sample memory: lost (happily) in the souks.'],
  ['pe-cusco', 'visited', 'Sample memory: acclimatising before the trek.'],
  ['nz-queenstown', 'wishlist', 'Sample dream: hike the Routeburn Track.'],
  ['is-reykjavik', 'wishlist', 'Sample dream: chase the northern lights.'],
  ['ar-ushuaia', 'wishlist', 'Sample dream: the end of the world.'],
  ['fj-suva', 'wishlist', 'Sample dream: island-hopping right by the date line.'],
];

export function buildDemoDestinations(now: Date = new Date()): Destination[] {
  return SAMPLE.flatMap(([locationId, status, note], i) => {
    const location = findLocation(locationId);
    if (!location) return [];
    // Stagger timestamps so the list has a natural order.
    return [createDestination(location, status, note, new Date(now.getTime() - i * 60_000), status === 'visited' ? [2025, 2024, 2023, 2022, 2020][i] ?? null : null)];
  });
}
