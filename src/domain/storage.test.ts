import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, loadDestinations, parseStoredData, saveDestinations, serialize, STORAGE_KEY } from './storage';
import { addDestination } from './destinations';
import { findLocation } from '../data/cities';
import { buildDemoDestinations } from './demo';

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

function sample() {
  const r = addDestination([], findLocation('no-oslo')!, 'visited', 'Spent a weekend exploring the old town.');
  if (!r.ok) throw new Error();
  return r.destinations;
}

describe('persistence', () => {
  it('Test 7: round-trips destinations and notes', () => {
    const storage = new MemoryStorage();
    const list = sample();
    expect(saveDestinations(list, storage)).toBe(true);
    const loaded = loadDestinations(storage);
    expect(loaded.problem).toBeNull();
    expect(loaded.destinations).toEqual(list);
  });

  it('does not rewrite storage when nothing changed', () => {
    const storage = new MemoryStorage();
    const list = sample();
    saveDestinations(list, storage);
    let writes = 0;
    const original = storage.setItem.bind(storage);
    storage.setItem = (k, v) => {
      writes++;
      original(k, v);
    };
    saveDestinations(list, storage);
    expect(writes).toBe(0);
  });

  it('returns an empty list for a fresh install', () => {
    expect(loadDestinations(new MemoryStorage())).toEqual({ destinations: [], problem: null });
  });

  it('Test 10: survives malformed JSON and keeps a backup', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const loaded = loadDestinations(storage);
    expect(loaded).toEqual({ destinations: [], problem: 'malformed' });
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
  });

  it('drops invalid records but keeps valid ones', () => {
    const valid = sample()[0];
    const raw = JSON.stringify({
      version: 1,
      destinations: [valid, { ...valid, id: 'x', latitude: 999 }, { ...valid, id: 'y', status: 'maybe' }, null, 'junk'],
    });
    const result = parseStoredData(raw);
    expect(result.problem).toBe('invalid-records');
    expect(result.destinations).toEqual([valid]);
  });

  it('removes duplicate records on load', () => {
    const valid = sample()[0];
    const raw = JSON.stringify({ version: 1, destinations: [valid, { ...valid, id: 'copy' }] });
    expect(parseStoredData(raw).destinations).toHaveLength(1);
  });

  it('treats unexpected shapes as malformed', () => {
    expect(parseStoredData('42').problem).toBe('malformed');
    expect(parseStoredData('{"foo":1}').problem).toBe('malformed');
  });

  it('serializes with a version', () => {
    expect(JSON.parse(serialize([]))).toEqual({ version: 1, destinations: [] });
  });

  it('copes with storage that throws', () => {
    const broken = new MemoryStorage();
    broken.getItem = () => {
      throw new Error('SecurityError');
    };
    broken.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    expect(loadDestinations(broken).destinations).toEqual([]);
    expect(saveDestinations(sample(), broken)).toBe(false);
  });
});

describe('demo data', () => {
  it('is clearly labelled sample data with no duplicates', () => {
    const demo = buildDemoDestinations();
    expect(demo.length).toBeGreaterThan(5);
    expect(new Set(demo.map((d) => d.locationId)).size).toBe(demo.length);
    expect(demo.every((d) => d.note.startsWith('Sample'))).toBe(true);
  });
});
