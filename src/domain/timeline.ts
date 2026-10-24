import type { Destination } from './types';

export interface TimelineGroup { year: number | null; destinations: Destination[] }

/** Chronological by known year (newest first), with undated entries in a separate final group. */
export function groupTravelHistory(destinations: readonly Destination[]): TimelineGroup[] {
  const groups = new Map<number | null, Destination[]>();
  for (const destination of destinations) {
    if (destination.status !== 'visited') continue;
    const year = destination.travelYear ?? null;
    const group = groups.get(year) ?? [];
    group.push(destination);
    groups.set(year, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a === null ? 1 : b === null ? -1 : b - a)
    .map(([year, entries]) => ({ year, destinations: entries.sort((a, b) => a.city.localeCompare(b.city)) }));
}
