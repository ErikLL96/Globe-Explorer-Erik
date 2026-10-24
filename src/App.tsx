import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, FlaskConical, TriangleAlert, X } from 'lucide-react';
import type { Destination, StatusFilter } from './domain/types';
import { filterDestinations, sortByRecent } from './domain/destinations';
import { computeStats, formatPercent, type TravelStats } from './domain/stats';
import { computeCountryStatuses } from './domain/countryStatus';
import { TOTAL_COUNTRIES, countryName, toCountedCountry } from './domain/countries';
import { useDestinations } from './hooks/useDestinations';
import { Header } from './components/Header';
import { TravelGlobe, type FocusRequest, type PickedPoint } from './components/globe/TravelGlobe';
import { DestinationSidebar } from './components/DestinationSidebar';
import { DestinationForm, type FormMode, type FormSubmit } from './components/DestinationForm';
import { DestinationDetails } from './components/DestinationDetails';
import { WorldPassport } from './components/WorldPassport';
import { JourneySpotlight } from './components/JourneySpotlight';
import { EmptyState } from './components/EmptyState';
import { Modal } from './components/Modal';
import { ToastRegion } from './components/Toasts';
import { useToasts } from './hooks/useToasts';
import { TravelTimeline } from './components/TravelTimeline';
import { TravelJournal } from './components/TravelJournal';
import { removeDestinationPhotos } from './domain/photos';

export default function App() {
  const journey = useDestinations();
  const { destinations, stats, isDemo } = journey;
  const { toasts, notify, dismiss } = useToasts();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [overviewRequest, setOverviewRequest] = useState(0);
  const [form, setForm] = useState<FormMode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Destination | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadProblemVisible, setLoadProblemVisible] = useState(journey.loadProblem !== null);

  const visibleDestinations = useMemo(() => sortByRecent(filterDestinations(destinations, filter, query)), [destinations, filter, query]);
  const markerDestinations = useMemo(() => filterDestinations(destinations, filter), [destinations, filter]);
  const wishlist = useMemo(() => sortByRecent(destinations.filter((d) => d.status === 'wishlist')), [destinations]);
  const countryStatuses = useMemo(() => computeCountryStatuses(destinations), [destinations]);
  const latestVisited = useMemo(() => sortByRecent(destinations.filter((d) => d.status === 'visited'))[0] ?? null, [destinations]);
  const selected = destinations.find((d) => d.id === selectedId) ?? null;
  const journalDestination = destinations.find((d) => d.id === journalId) ?? null;

  const focusOn = useCallback((d: Destination) => {
    setSelectedId(d.id);
    setFocusRequest({ longitude: d.longitude, latitude: d.latitude, nonce: Date.now() });
    setSheetOpen(false);
  }, []);

  /** Feedback after a destination becomes visited: new country, or another stamp. */
  const celebrate = useCallback(
    (d: Destination, before: TravelStats, after: TravelStats) => {
      const counted = toCountedCountry(d.countryCode);
      const isNewCountry = after.visitedCountryCount > before.visitedCountryCount && counted;
      if (isNewCountry) {
        notify(
          'celebrate',
          `New country unlocked: ${countryName(counted)}`,
          `${after.visitedCountryCount} of ${TOTAL_COUNTRIES} countries · ${formatPercent(after.worldExploredPercent)} of the world explored`,
        );
      } else {
        notify('success', 'Another place added to your story.', `${d.city}, ${d.country} is now in your passport.`);
      }
    },
    [notify],
  );

  const handleSubmit = (values: FormSubmit): string | null => {
    if (!form) return null;
    if (form.type === 'add') {
      const result = journey.add(values.location, values.status, values.note, values.travelYear);
      if (!result.ok) return result.reason === 'duplicate' ? `${values.location.city} is already in your journey.` : result.message;
      setForm(null);
      focusOn(result.destination);
      if (result.destination.status === 'visited') celebrate(result.destination, stats, computeStats(result.destinations));
      else notify('info', 'Added to your wishlist', `${result.destination.city}, ${result.destination.country} — something to look forward to.`);
      return null;
    }
    const current = form.destination;
    const result = journey.update(current.id, {
      status: values.status,
      note: values.note,
      travelYear: values.travelYear,
      location: values.location.id !== current.locationId ? values.location : undefined,
    });
    if (!result.ok) {
      if (result.reason === 'duplicate') return `${result.existing.city} is already in your journey.`;
      return result.reason === 'invalid' ? result.message : 'This destination no longer exists.';
    }
    setForm(null);
    focusOn(result.destination);
    if (current.status !== 'visited' && result.destination.status === 'visited') {
      celebrate(result.destination, stats, computeStats(result.destinations));
    } else {
      notify('success', 'Destination updated', `${result.destination.city}, ${result.destination.country}`);
    }
    return null;
  };

  const markVisited = (d: Destination) => {
    const result = journey.update(d.id, { status: 'visited' });
    if (result.ok) celebrate(result.destination, stats, computeStats(result.destinations));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    journey.remove(pendingDelete.id);
    if (!isDemo) void removeDestinationPhotos(pendingDelete.id).catch(() =>
      notify('warning', 'Could not remove saved photos', 'Browser storage may still contain photos for this place.'));
    if (journalId === pendingDelete.id) setJournalId(null);
    if (selectedId === pendingDelete.id) setSelectedId(null);
    notify('info', `Removed ${pendingDelete.city}`, 'Your statistics and map have been updated.');
    setPendingDelete(null);
    // The deleted row (and its button) is gone; give keyboard users a sensible place to continue.
    requestAnimationFrame(() => {
      const search = document.getElementById('journey-search');
      if (search && search.offsetParent !== null && getComputedStyle(search).visibility !== 'hidden') search.focus();
      else document.querySelector<HTMLElement>('.sidebar__handle')?.focus();
    });
  };

  const requestDelete = (d: Destination) => {
    setForm(null);
    setPendingDelete(d);
  };

  const startPick = () => {
    setForm(null);
    setSheetOpen(false);
    setPickMode(true);
  };

  const handlePick = (point: PickedPoint) => {
    if (!point.countryCode) {
      notify('warning', 'That looks like open water', 'Pick a spot on land to drop your pin.');
      return;
    }
    setPickMode(false);
    setForm({ type: 'add', pinned: point });
  };

  useEffect(() => {
    if (!pickMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickMode]);

  const startDemo = () => {
    journey.startDemo();
    setSelectedId(null);
    setJournalId(null);
    setTimelineOpen(false);
    setOverviewRequest((n) => n + 1);
    setFilter('all');
    notify('info', 'Demo mode', 'Exploring a fictional sample journey. Your own data is untouched.');
  };

  const exitDemo = () => {
    setJournalId(null);
    setTimelineOpen(false);
    journey.exitDemo();
    setSelectedId(null);
    setOverviewRequest((n) => n + 1);
    notify('info', 'Back to your journey', 'Demo changes were discarded.');
  };

  const openAdd = () => {
    setPickMode(false);
    setForm({ type: 'add' });
  };

  const showEmpty = destinations.length === 0 && !isDemo && !pickMode;

  return (
    <div className="app">
      <a className="skip-link" href="#journey-panel">Skip to your journey list</a>
      <Header isDemo={isDemo} onAdd={openAdd} onTimeline={() => setTimelineOpen(true)} onStartDemo={startDemo} onExitDemo={exitDemo} />

      <main className="stage">
        <div className="stage__globe">
          <TravelGlobe
            destinations={markerDestinations}
            countryStatuses={countryStatuses}
            selectedId={selectedId}
            focusRequest={focusRequest}
            overviewRequest={overviewRequest}
            pickMode={pickMode}
            onSelect={(id) => {
              const d = destinations.find((x) => x.id === id);
              if (d) focusOn(d);
            }}
            onPick={handlePick}
            onBackgroundClick={() => setSelectedId(null)}
          />

          <div className="hud hud--left">
            <WorldPassport stats={stats} latestVisited={latestVisited} />
            <div className="banners">
              {isDemo && (
                <div className="banner banner--demo" role="status">
                  <FlaskConical size={16} aria-hidden="true" />
                  <span>
                    <strong>Demo mode</strong> — a fictional sample journey. Changes here aren’t saved.
                  </span>
                  <button type="button" className="btn btn--small btn--ghost" onClick={exitDemo}>Exit demo</button>
                </div>
              )}
              {pickMode && (
                <div className="banner banner--pick" role="status">
                  <Crosshair size={16} aria-hidden="true" />
                  <span>Click anywhere on land to drop a pin.</span>
                  <button type="button" className="btn btn--small btn--ghost" onClick={() => setPickMode(false)}>Cancel</button>
                </div>
              )}
              {loadProblemVisible && (
                <div className="banner banner--warning" role="alert">
                  <TriangleAlert size={16} aria-hidden="true" />
                  <span>Some saved data couldn’t be read. We loaded what we could and kept a backup copy in this browser.</span>
                  <button type="button" className="icon-btn icon-btn--plain icon-btn--tiny" onClick={() => setLoadProblemVisible(false)} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {selected && !pickMode && (
            <div className="hud hud--details">
              <DestinationDetails
                destination={selected}
                onClose={() => setSelectedId(null)}
                onEdit={(d) => setForm({ type: 'edit', destination: d })}
                onMarkVisited={markVisited}
                onJournal={(d) => setJournalId(d.id)}
              />
            </div>
          )}

          {showEmpty && <EmptyState onAdd={openAdd} onStartDemo={startDemo} />}

          {destinations.length > 0 && (
            <ul className="legend" aria-label="Map legend">
              <li><span className="legend__swatch legend__swatch--visited" aria-hidden="true" /> Visited</li>
              <li><span className="legend__swatch legend__swatch--wishlist" aria-hidden="true" /> Wishlist</li>
              <li className="legend__sep" aria-hidden="true" />
              <li><span className="legend__swatch legend__swatch--country-visited" aria-hidden="true" /> Visited country</li>
              <li><span className="legend__swatch legend__swatch--country-wishlist" aria-hidden="true" /> Wishlist country</li>
              <li><span className="legend__swatch legend__swatch--country-none" aria-hidden="true" /> Unexplored</li>
            </ul>
          )}

          <ToastRegion toasts={toasts} onDismiss={dismiss} />
        </div>

        <DestinationSidebar
          destinations={destinations}
          visibleDestinations={visibleDestinations}
          filter={filter}
          query={query}
          selectedId={selectedId}
          sheetOpen={sheetOpen}
          spotlight={<JourneySpotlight wishlist={wishlist} onFocus={focusOn} onAdd={openAdd} />}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
          onSelect={focusOn}
          onEdit={(d) => setForm({ type: 'edit', destination: d })}
          onDelete={requestDelete}
          onAdd={openAdd}
          onToggleSheet={() => setSheetOpen((open) => !open)}
        />
      </main>

      <Modal open={timelineOpen} onClose={() => setTimelineOpen(false)} labelledBy="timeline-title" className="modal--timeline">
        {timelineOpen && <TravelTimeline destinations={destinations} onClose={() => setTimelineOpen(false)} onOpen={(d) => {
          setTimelineOpen(false);
          focusOn(d);
          setJournalId(d.id);
        }} />}
      </Modal>

      <Modal open={journalDestination !== null} onClose={() => setJournalId(null)} labelledBy="journal-title" className="modal--journal">
        {journalDestination && <TravelJournal key={journalDestination.id} destination={journalDestination} isDemo={isDemo}
          onClose={() => setJournalId(null)}
          onEdit={(d) => { setJournalId(null); setForm({ type: 'edit', destination: d }); }}
          onShowOnGlobe={(d) => { setJournalId(null); focusOn(d); }} />}
      </Modal>

      <Modal open={form !== null} onClose={() => setForm(null)} labelledBy="form-title" className="modal--form">
        {form && (
          <DestinationForm
            key={form.type === 'edit' ? form.destination.id : `add-${form.pinned?.longitude ?? 'search'}`}
            mode={form}
            destinations={destinations}
            onCancel={() => setForm(null)}
            onSubmit={handleSubmit}
            onEditExisting={(d) => setForm({ type: 'edit', destination: d })}
            onPickOnGlobe={startPick}
            onDelete={requestDelete}
          />
        )}
      </Modal>

      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} labelledBy="confirm-title" className="modal--confirm">
        {pendingDelete && (
          <div className="confirm">
            <h2 id="confirm-title" className="confirm__title">Remove {pendingDelete.city}?</h2>
            <p className="confirm__text">
              {pendingDelete.city}, {pendingDelete.country}
              {pendingDelete.note ? ' and its travel note' : ''} will be removed from your journey. This can’t be undone.
            </p>
            <div className="confirm__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPendingDelete(null)} data-autofocus>Keep it</button>
              <button type="button" className="btn btn--danger" onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
