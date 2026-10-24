import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Destination, Location, TravelStatus } from '../domain/types';
import {
  addDestination,
  removeDestination,
  updateDestination,
  type AddResult,
  type DestinationChanges,
  type UpdateResult,
} from '../domain/destinations';
import { loadDestinations, parseStoredData, saveDestinations, STORAGE_KEY } from '../domain/storage';
import { buildDemoDestinations } from '../domain/demo';
import { computeStats } from '../domain/stats';

/**
 * Owns the user's travel collection.
 * - The personal collection is loaded from and saved to localStorage.
 * - Demo mode swaps in a separate, in-memory sample collection that is never saved,
 *   so fictional data can't mix with the real one.
 */
export function useDestinations() {
  const [initial] = useState(() => loadDestinations());
  const [personal, setPersonal] = useState<Destination[]>(initial.destinations);
  const [demo, setDemo] = useState<Destination[] | null>(null);

  useEffect(() => {
    // Nothing to save until the collection actually changes; writing the freshly loaded state
    // back could overwrite a newer version saved by another tab in the meantime.
    if (personal !== initial.destinations) saveDestinations(personal);
  }, [personal, initial]);

  // Another tab changed the journey: adopt its version instead of overwriting it on our next save.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const parsed = parseStoredData(event.newValue);
      if (parsed.problem !== 'malformed') setPersonal(parsed.destinations);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isDemo = demo !== null;
  const destinations = demo ?? personal;
  const setActive = isDemo ? (setDemo as (list: Destination[]) => void) : setPersonal;
  const stats = useMemo(() => computeStats(destinations), [destinations]);

  const add = useCallback(
    (location: Location, status: TravelStatus, note: string, travelYear: number | null = null): AddResult => {
      const result = addDestination(destinations, location, status, note, undefined, travelYear);
      if (result.ok) setActive(result.destinations);
      return result;
    },
    [destinations, setActive],
  );

  const update = useCallback(
    (id: string, changes: DestinationChanges): UpdateResult => {
      const result = updateDestination(destinations, id, changes);
      if (result.ok) setActive(result.destinations);
      return result;
    },
    [destinations, setActive],
  );

  const remove = useCallback(
    (id: string) => setActive(removeDestination(destinations, id)),
    [destinations, setActive],
  );

  const startDemo = useCallback(() => setDemo(buildDemoDestinations()), []);
  const exitDemo = useCallback(() => setDemo(null), []);

  return {
    destinations,
    stats,
    isDemo,
    personalCount: personal.length,
    loadProblem: initial.problem,
    add,
    update,
    remove,
    startDemo,
    exitDemo,
  };
}
