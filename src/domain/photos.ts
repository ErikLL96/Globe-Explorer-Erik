/**
 * Private, local photo storage. Destination metadata remains in localStorage;
 * photos live in IndexedDB because localStorage has a tiny quota and only stores strings.
 * Nothing is uploaded to any server. Deleting browser site data deletes the pictures too.
 */
export interface JournalPhoto {
  id: string;
  destinationId: string;
  name: string;
  blob: Blob;
  addedAt: string;
}

export const MAX_PHOTOS_PER_DESTINATION = 6;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DATABASE_NAME = 'globe-explorer-journal';
const STORE_NAME = 'photos';

export function validatePhoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) return 'Use JPEG, PNG or WebP images (convert HEIC photos to JPEG first).';
  if (file.size > MAX_PHOTO_BYTES) return 'Choose a photo smaller than 8 MB.';
  if (file.size === 0) return 'This photo is empty.';
  return null;
}

function openPhotosDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Photo storage is unavailable in this browser.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('byDestination', 'destinationId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open photo storage.'));
    request.onblocked = () => reject(new Error('Photo storage is blocked by another open tab.'));
  });
}

async function withDb<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openPhotosDb();
  try { return await run(db); } finally { db.close(); }
}

export function listPhotos(destinationId: string): Promise<JournalPhoto[]> {
  return withDb((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const req = transaction.objectStore(STORE_NAME).index('byDestination').getAll(destinationId);
    req.onsuccess = () => resolve((req.result as JournalPhoto[]).sort((a, b) => a.addedAt.localeCompare(b.addedAt)));
    req.onerror = () => reject(req.error ?? new Error('Could not load photos.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not load photos.'));
  }));
}

export async function addPhoto(destinationId: string, file: File): Promise<void> {
  const invalid = validatePhoto(file);
  if (invalid) throw new Error(invalid);
  const photos = await listPhotos(destinationId);
  if (photos.length >= MAX_PHOTOS_PER_DESTINATION) throw new Error(`Maximum ${MAX_PHOTOS_PER_DESTINATION} photos per destination.`);
  const photo: JournalPhoto = {
    id: crypto.randomUUID(), destinationId, name: file.name, blob: file, addedAt: new Date().toISOString(),
  };
  await withDb((db) => new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this photo. Check browser storage space.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Photo saving was cancelled.'));
  }));
}

export function removePhoto(photoId: string): Promise<void> {
  return withDb((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(photoId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove this photo.'));
  }));
}

/** Remove orphaned photos when a *personal* destination is deleted, never for demo entries. */
export function removeDestinationPhotos(destinationId: string): Promise<void> {
  return withDb((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const keys = store.index('byDestination').getAllKeys(destinationId);
    keys.onsuccess = () => { for (const key of keys.result) store.delete(key); };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove old photos.'));
  }));
}
