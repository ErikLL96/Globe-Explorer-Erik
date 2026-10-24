import type { ReactNode } from 'react';
import { Check, ChevronUp, LocateFixed, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import type { Destination, StatusFilter } from '../domain/types';

interface SidebarProps {
  destinations: readonly Destination[];
  visibleDestinations: readonly Destination[];
  filter: StatusFilter;
  query: string;
  selectedId: string | null;
  sheetOpen: boolean;
  spotlight: ReactNode;
  onFilterChange: (filter: StatusFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (destination: Destination) => void;
  onEdit: (destination: Destination) => void;
  onDelete: (destination: Destination) => void;
  onAdd: () => void;
  onToggleSheet: () => void;
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visited', label: 'Visited' },
  { value: 'wishlist', label: 'Wishlist' },
];

export function StatusIcon({ status, size = 14 }: { status: Destination['status']; size?: number }) {
  return (
    <span className={`status-dot status-dot--${status}`} aria-hidden="true">
      {status === 'visited' ? <Check size={size} strokeWidth={3} /> : <Star size={size} strokeWidth={2.5} />}
    </span>
  );
}

export function DestinationSidebar({
  destinations,
  visibleDestinations,
  filter,
  query,
  selectedId,
  sheetOpen,
  spotlight,
  onFilterChange,
  onQueryChange,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
  onToggleSheet,
}: SidebarProps) {
  const counts = {
    all: destinations.length,
    visited: destinations.filter((d) => d.status === 'visited').length,
    wishlist: destinations.filter((d) => d.status === 'wishlist').length,
  };

  return (
    <aside className={`sidebar ${sheetOpen ? 'is-open' : ''}`} aria-label="My journey">
      <button type="button" className="sidebar__handle" onClick={onToggleSheet} aria-expanded={sheetOpen} aria-controls="journey-panel">
        <span className="sidebar__grip" aria-hidden="true" />
        <span>
          My Journey <span className="muted">· {counts.all} {counts.all === 1 ? 'place' : 'places'}</span>
        </span>
        <ChevronUp size={18} className="sidebar__chevron" aria-hidden="true" />
      </button>

      <div className="sidebar__panel" id="journey-panel">
        <div className="sidebar__head">
          <div>
            <p className="eyebrow">Travel journal</p>
            <h2 className="sidebar__title">My Journey</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onAdd} aria-label="Add destination" title="Add destination">
            <Plus size={18} />
          </button>
        </div>

        {spotlight}

        <div className="sidebar__tools">
          <div className="input-icon input-icon--compact">
            <Search size={15} aria-hidden="true" />
            <input
              id="journey-search"
              className="input"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search your places"
              aria-label="Search saved destinations"
            />
          </div>
          <div className="segmented" role="group" aria-label="Filter by travel status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`segmented__btn ${filter === f.value ? 'is-active' : ''}`}
                aria-pressed={filter === f.value}
                onClick={() => onFilterChange(f.value)}
              >
                {f.label} <span className="segmented__count">{counts[f.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {destinations.length === 0 ? (
          <div className="sidebar__empty">
            <p>No places yet. Every journey starts with a single pin.</p>
            <button type="button" className="btn btn--primary btn--small" onClick={onAdd}>
              <Plus size={16} aria-hidden="true" /> Add your first destination
            </button>
          </div>
        ) : visibleDestinations.length === 0 ? (
          <p className="sidebar__empty">No destinations match this filter.</p>
        ) : (
          <ul className="journey-list">
            {visibleDestinations.map((d) => (
              <li key={d.id} className={`journey-row ${d.id === selectedId ? 'is-selected' : ''}`}>
                <button type="button" className="journey-row__main" onClick={() => onSelect(d)} aria-current={d.id === selectedId ? 'true' : undefined}>
                  <StatusIcon status={d.status} />
                  <span className="journey-row__text">
                    <span className="journey-row__city">{d.city}</span>
                    <span className="journey-row__meta">
                      {d.country}{d.status === 'visited' && d.travelYear ? ` · ${d.travelYear}` : ''}
                      <span className="sr-only">, {d.status === 'visited' ? 'visited' : 'wishlist'}</span>
                    </span>
                    {d.note && <span className="journey-row__note">“{d.note}”</span>}
                  </span>
                </button>
                <span className="journey-row__actions">
                  <button type="button" className="icon-btn icon-btn--plain" onClick={() => onSelect(d)} aria-label={`Show ${d.city} on the globe`} title="Show on globe">
                    <LocateFixed size={16} />
                  </button>
                  <button type="button" className="icon-btn icon-btn--plain" onClick={() => onEdit(d)} aria-label={`Edit ${d.city}`} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="icon-btn icon-btn--plain icon-btn--danger" onClick={() => onDelete(d)} aria-label={`Delete ${d.city}`} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
