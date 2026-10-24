import { describe, expect, it } from 'vitest';
import { addDestination, updateDestination } from './destinations';
import { groupTravelHistory } from './timeline';
import { parseStoredData, serialize } from './storage';
import { findLocation } from '../data/cities';
import { validatePhoto, MAX_PHOTO_BYTES } from './photos';

const oslo = findLocation('no-oslo')!;
const tokyo = findLocation('jp-tokyo')!;

describe('travel years and timeline', () => {
  it('creates a visit with year and sorts newest year first', () => {
    const first = addDestination([], oslo, 'visited', 'Nice trip', undefined, 2020);
    if (!first.ok) throw new Error();
    const second = addDestination(first.destinations, tokyo, 'visited', 'Another visit', undefined, 2025);
    if (!second.ok) throw new Error();
    expect(groupTravelHistory(second.destinations).map(g=>g.year)).toEqual([2025, 2020]);
    expect(groupTravelHistory(second.destinations)[0].destinations[0].city).toBe('Tokyo');
  });

  it('includes undated visited places but excludes wishlist entries', () => {
    const first = addDestination([], oslo, 'visited', '');
    if (!first.ok) throw new Error();
    const second = addDestination(first.destinations, tokyo, 'wishlist', '');
    if (!second.ok) throw new Error();
    expect(groupTravelHistory(second.destinations)).toMatchObject([{year: null, destinations: [{city: 'Oslo'}]}]);
  });

  it('rejects future and malformed years', () => {
    expect(addDestination([], oslo, 'visited', '', undefined, 3000).ok).toBe(false);
    expect(addDestination([], oslo, 'visited', '', undefined, 2020.5).ok).toBe(false);
    expect(addDestination([], oslo, 'wishlist', '', undefined, 2020).ok).toBe(false);
  });

  it('removes the year when status changes back to wishlist', () => {
    const added = addDestination([], oslo, 'visited', '', undefined, 2022);
    if (!added.ok) throw new Error();
    const updated = updateDestination(added.destinations, added.destination.id, {status:'wishlist'});
    if (!updated.ok) throw new Error();
    expect(updated.destination.travelYear).toBeNull();
    expect(groupTravelHistory(updated.destinations)).toEqual([]);
  });

  it('keeps previously saved destinations without a year', () => {
    const added = addDestination([], oslo, 'visited', 'Old memory');
    if (!added.ok) throw new Error();
    const legacy = JSON.parse(serialize(added.destinations));
    delete legacy.destinations[0].travelYear;
    const restored = parseStoredData(JSON.stringify(legacy));
    expect(restored.problem).toBeNull();
    expect(restored.destinations[0].travelYear).toBeNull();
    expect(restored.destinations[0].note).toBe('Old memory');
  });
});

describe('private photo rules', () => {
  it('accepts supported image formats and rejects oversized/non-image uploads', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: 2048 })).toBeNull();
    expect(validatePhoto({ type: 'image/png', size: 2048 })).toBeNull();
    expect(validatePhoto({ type: 'image/heic', size: 2048 })).not.toBeNull();
    expect(validatePhoto({ type: 'application/pdf', size: 2048 })).not.toBeNull();
    expect(validatePhoto({ type: 'image/webp', size: MAX_PHOTO_BYTES + 1 })).not.toBeNull();
  });
});
