import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, MapPin, Pencil, Trash2, X } from 'lucide-react';
import type { Destination } from '../domain/types';
import { addPhoto, announcePhotosChanged, listPhotos, MAX_PHOTOS_PER_DESTINATION, removePhoto, type JournalPhoto } from '../domain/photos';


function LocalPhoto({ photo, onRemove, readOnly }: {
  photo: JournalPhoto;
  onRemove: (id: string) => void;
  readOnly: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const url = URL.createObjectURL(photo.blob);
    image.src = url;

    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [photo.blob]);

  return (
    <figure className="journal__photo">
      <img
        ref={imageRef}
        alt={photo.name || 'Travel photo'}
        loading="lazy"
      />
      {!readOnly && (
        <button
          type="button"
          className="journal__remove"
          onClick={() => onRemove(photo.id)}
          aria-label={`Remove photo ${photo.name}`}
          title="Remove photo"
        >
          <Trash2 size={15} />
        </button>
      )}
    </figure>
  );
}


interface Props {
  destination: Destination;
  isDemo: boolean;
  onClose: () => void;
  onEdit: (d: Destination) => void;
  onShowOnGlobe: (d: Destination) => void;
}

export function TravelJournal({ destination: d, isDemo, onClose, onEdit, onShowOnGlobe }: Props) {
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reload = useCallback(async () => setPhotos(await listPhotos(d.id)), [d.id]);
  useEffect(() => {
    let live = true;
    listPhotos(d.id).then(items => { if (live) { setPhotos(items); setError(null); } })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not access photos.'); });
    return () => { live = false; };
  }, [d.id]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || isDemo) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of files) await addPhoto(d.id, file);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save photos.');
      try { await reload(); } catch { /* report the original error */ }
    } finally { announcePhotosChanged(d.id); setBusy(false); }
  }

  async function handleRemove(photoId: string) {
    if (isDemo) return;
    setBusy(true);
    try { await removePhoto(photoId); await reload(); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete photo.'); }
    finally { announcePhotosChanged(d.id); setBusy(false); }
  }

  return <article className="journal" aria-labelledby="journal-title">
    <header className="journal__header">
      <div><p className="eyebrow">Your travel journal</p><h2 id="journal-title" className="form__title">{d.city}</h2><p className="muted">{d.country}{d.travelYear ? ` · ${d.travelYear}` : ''}</p></div>
      <button type="button" className="icon-btn icon-btn--plain" onClick={onClose} aria-label="Close journal"><X size={18}/></button>
    </header>

    <div className="journal__memory">
      <h3>Travel memories</h3>
      {d.note ? <p className="journal__note">{d.note}</p> : <p className="muted">No memory yet. Use Edit to write about your trip.</p>}
    </div>

    <section className="journal__photos" aria-label="Trip photos">
      <div className="journal__photos-top"><h3><Camera size={17} aria-hidden="true" /> Photo diary</h3><span>{photos.length}/{MAX_PHOTOS_PER_DESTINATION}</span></div>
      {photos.length > 0 ? <div className="journal__grid">{photos.map(photo => <LocalPhoto key={photo.id} photo={photo} readOnly={isDemo || busy} onRemove={handleRemove}/>)}</div>
        : <p className="journal__empty">No photos yet. Add a favorite memory from this trip.</p>}
      {!isDemo && <>
        <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} aria-label="Select travel photos" />
        <button type="button" className="btn btn--soft" disabled={busy || photos.length >= MAX_PHOTOS_PER_DESTINATION} onClick={()=>fileRef.current?.click()}>
          <ImagePlus size={16} aria-hidden="true" /> {busy ? 'Saving…' : 'Add photos'}
        </button>
        <p className="journal__storage">Up to {MAX_PHOTOS_PER_DESTINATION} JPEG, PNG or WebP photos (max 8 MB each). Stored only in this browser using IndexedDB; clearing site data removes them. Photos are not synced or backed up.</p>
      </>}
      {isDemo && <p className="journal__storage">Demo mode is read-only. Exit the demo to add your own photos.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>

    <footer className="journal__actions">
      <button type="button" className="btn btn--ghost" onClick={()=>onShowOnGlobe(d)}><MapPin size={16}/> Show on globe</button>
      <button type="button" className="btn btn--primary" onClick={()=>onEdit(d)}><Pencil size={16}/> Edit story & year</button>
    </footer>
  </article>;
}
