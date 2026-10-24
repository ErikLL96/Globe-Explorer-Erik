import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, Crosshair, MapPin, Search, Star, Trash2, X } from 'lucide-react';
import type { Destination, Location, TravelStatus } from '../domain/types';
import {
  customLocationId,
  findByLocation,
  NOTE_MAX_LENGTH,
  validateCustomCity,
  validateNote,
  EARLIEST_TRAVEL_YEAR,
  validateTravelYear,
} from '../domain/destinations';
import { searchLocations } from '../data/cities';
import { formatCoordinates } from '../utils/format';
import type { PickedPoint } from './globe/TravelGlobe';

export type FormMode =
  | { type: 'add'; pinned?: PickedPoint }
  | { type: 'edit'; destination: Destination };

export interface FormSubmit {
  location: Location;
  status: TravelStatus;
  note: string;
  travelYear: number | null;
}

interface DestinationFormProps {
  mode: FormMode;
  destinations: readonly Destination[];
  onCancel: () => void;
  onSubmit: (values: FormSubmit) => string | null;
  onEditExisting: (destination: Destination) => void;
  onPickOnGlobe: () => void;
  onDelete: (destination: Destination) => void;
}

const NOTE_PLACEHOLDERS: Record<TravelStatus, string> = {
  visited: 'Spent a weekend exploring the old town…',
  wishlist: 'Dream destination for the northern lights…',
};

function initialLocation(mode: FormMode): Location | null {
  if (mode.type === 'edit') {
    const d = mode.destination;
    return { id: d.locationId, city: d.city, country: d.country, countryCode: d.countryCode, latitude: d.latitude, longitude: d.longitude };
  }
  return null;
}

export function DestinationForm({
  mode,
  destinations,
  onCancel,
  onSubmit,
  onEditExisting,
  onPickOnGlobe,
  onDelete,
}: DestinationFormProps) {
  const ids = useId();
  const editing = mode.type === 'edit' ? mode.destination : null;
  const pinned = mode.type === 'add' ? mode.pinned : undefined;

  const [location, setLocation] = useState<Location | null>(() => initialLocation(mode));
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [customName, setCustomName] = useState('');
  const [status, setStatus] = useState<TravelStatus>(editing?.status ?? 'visited');
  const [note, setNote] = useState(editing?.note ?? '');
  const [yearInput, setYearInput] = useState(editing?.travelYear?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const changeRef = useRef<HTMLButtonElement>(null);
  const results = useMemo(() => searchLocations(query), [query]);
  const listOpen = !location && !pinned && query.trim().length > 0;

  // The place the user is about to save, including a custom pin once it has a name.
  const candidate: Location | null = useMemo(() => {
    if (location) return location;
    if (pinned && pinned.countryCode && customName.trim()) {
      return {
        id: customLocationId(customName, pinned.countryCode),
        city: customName.trim(),
        country: pinned.country ?? pinned.countryCode,
        countryCode: pinned.countryCode,
        latitude: pinned.latitude,
        longitude: pinned.longitude,
      };
    }
    return null;
  }, [location, pinned, customName]);

  const duplicate = candidate ? findByLocation(destinations, candidate.id) : undefined;
  const isDuplicate = duplicate !== undefined && duplicate.id !== editing?.id;
  const noteError = validateNote(note);
  const parsedYear = yearInput.trim() === '' ? null : Number(yearInput);
  const yearError = status === 'visited' && yearInput.trim() !== ''
    ? validateTravelYear(parsedYear, status) : null;
  const customNameError = pinned && touched ? validateCustomCity(customName) : null;

  const choose = (loc: Location) => {
    setLocation(loc);
    setQuery('');
    setError(null);
    // The search box unmounts; keep keyboard focus inside the form.
    requestAnimationFrame(() => changeRef.current?.focus());
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!listOpen || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[Math.min(activeIndex, results.length - 1)]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (pinned && !location) {
      const nameError = validateCustomCity(customName);
      if (nameError) return setError(nameError);
    }
    if (!candidate) return setError('Choose a destination first.');
    if (isDuplicate) return setError(`${candidate.city} is already in your journey.`);
    if (noteError) return setError(noteError);
    if (yearError) return setError(yearError);
    const failure = onSubmit({ location: candidate, status, note, travelYear: status === 'visited' ? parsedYear : null });
    if (failure) setError(failure);
  };

  const titleId = 'form-title';
  const listId = `${ids}-results`;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <header className="form__header">
        <div>
          <p className="eyebrow">{editing ? 'Edit destination' : 'New destination'}</p>
          <h2 id={titleId} className="form__title">
            {editing ? `${editing.city}, ${editing.country}` : 'Where in the world?'}
          </h2>
        </div>
        <button type="button" className="icon-btn icon-btn--plain" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
      </header>

      <fieldset className="form__section">
        <legend className="form__label">Destination</legend>

        {location ? (
          <div className="place-chip">
            <MapPin size={18} aria-hidden="true" className="place-chip__icon" />
            <div className="place-chip__text">
              <strong>{location.city}</strong>
              <span>
                {location.country} · <span className="mono">{formatCoordinates(location.latitude, location.longitude)}</span>
              </span>
            </div>
            <button ref={changeRef} type="button" className="btn btn--small btn--ghost" onClick={() => setLocation(null)} aria-label={`Change destination (currently ${location.city})`}>
              Change
            </button>
          </div>
        ) : pinned ? (
          <div className="pin-fields">
            <div className="place-chip place-chip--pin">
              <Crosshair size={18} aria-hidden="true" className="place-chip__icon" />
              <div className="place-chip__text">
                <strong>{pinned.country ?? 'Unknown region'}</strong>
                <span className="mono">{formatCoordinates(pinned.latitude, pinned.longitude)}</span>
              </div>
              <button type="button" className="btn btn--small btn--ghost" onClick={onPickOnGlobe}>
                Re-pin
              </button>
            </div>
            <label className="form__label form__label--sub" htmlFor={`${ids}-custom`}>
              Name this place
            </label>
            <input
              id={`${ids}-custom`}
              className="input"
              value={customName}
              maxLength={80}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Lofoten Islands"
              aria-invalid={customNameError ? true : undefined}
              data-autofocus
            />
            {customNameError && <p className="field-error">{customNameError}</p>}
          </div>
        ) : (
          <div className="combo">
            <div className="input-icon">
              <Search size={17} aria-hidden="true" />
              <input
                className="input"
                role="combobox"
                aria-label="Search cities or countries"
                aria-expanded={listOpen}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={listOpen && results.length ? `${listId}-${activeIndex}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKey}
                placeholder="Search a city or country, e.g. Kyoto"
                autoComplete="off"
                data-autofocus
              />
            </div>
            {listOpen && (
              <ul className="combo__list" id={listId} role="listbox" aria-label="Matching destinations">
                {results.length === 0 && (
                  <li className="combo__empty" role="presentation">
                    No curated city matches “{query.trim()}”. You can drop a pin on the globe instead.
                  </li>
                )}
                {results.map((loc, i) => {
                  const saved = findByLocation(destinations, loc.id);
                  return (
                    <li
                      key={loc.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      className={`combo__option ${i === activeIndex ? 'is-active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => choose(loc)}
                    >
                      <span className="combo__city">{loc.city}</span>
                      <span className="combo__country">{loc.country}</span>
                      {saved && <span className={`tag tag--${saved.status}`}>{saved.status === 'visited' ? 'Visited' : 'Wishlist'}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {!editing && (
              <button type="button" className="link-btn" onClick={onPickOnGlobe}>
                <Crosshair size={15} aria-hidden="true" /> Can’t find it? Drop a pin on the globe
              </button>
            )}
          </div>
        )}

        {isDuplicate && duplicate && (
          <div className="notice" role="alert">
            <p>
              <strong>{duplicate.city}</strong> is already in your journey as{' '}
              {duplicate.status === 'visited' ? 'visited' : 'a wishlist destination'}.
            </p>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => onEditExisting(duplicate)}>
              Edit it instead
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="form__section">
        <legend className="form__label">Travel status</legend>
        <div className="status-choice">
          {(['visited', 'wishlist'] as const).map((value) => (
            <label key={value} className={`status-option status-option--${value} ${status === value ? 'is-checked' : ''}`}>
              <input type="radio" name={`${ids}-status`} value={value} checked={status === value} onChange={() => setStatus(value)} />
              <span className="status-option__icon" aria-hidden="true">
                {value === 'visited' ? <Check size={16} /> : <Star size={16} />}
              </span>
              <span className="status-option__text">
                <strong>{value === 'visited' ? 'Visited' : 'Want to visit'}</strong>
                <span>{value === 'visited' ? 'I’ve been here' : 'On my wishlist'}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {status === 'visited' && (
        <div className="form__section">
          <label className="form__label" htmlFor={`${ids}-year`}>
            Year visited <span className="muted">(optional)</span>
          </label>
          <input id={`${ids}-year`} className="input" type="number" inputMode="numeric"
            min={EARLIEST_TRAVEL_YEAR} max={new Date().getFullYear()} step="1"
            value={yearInput} onChange={(e) => setYearInput(e.target.value)}
            placeholder="e.g. 2024" aria-invalid={yearError ? true : undefined} />
          {yearError && <p className="field-error">{yearError}</p>}
        </div>
      )}

      <div className="form__section">
        <label className="form__label" htmlFor={`${ids}-note`}>
          {status === 'visited' ? 'A travel memory' : 'Why you want to go'} <span className="muted">(optional)</span>
        </label>
        <textarea
          id={`${ids}-note`}
          className="input textarea"
          rows={5}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={NOTE_PLACEHOLDERS[status]}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={`${ids}-count`}
        />
        <p id={`${ids}-count`} className={`counter ${noteError ? 'counter--over' : ''}`}>
          {note.trim().length} / {NOTE_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <p className="field-error form__error" role="alert">
          {error}
        </p>
      )}

      <footer className="form__footer">
        {editing && (
          <button type="button" className="btn btn--danger-ghost" onClick={() => onDelete(editing)}>
            <Trash2 size={16} aria-hidden="true" /> Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={isDuplicate}>
          {editing ? 'Save changes' : 'Add to my journey'}
        </button>
      </footer>
    </form>
  );
}
