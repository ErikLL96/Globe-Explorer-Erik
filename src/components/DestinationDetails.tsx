import { BookOpen, Check, Pencil, X } from 'lucide-react';
import type { Destination } from '../domain/types';
import { formatCoordinates, formatMonthYear } from '../utils/format';
import { StatusIcon } from './DestinationSidebar';

interface DestinationDetailsProps {
  destination: Destination;
  onClose: () => void;
  onEdit: (destination: Destination) => void;
  onMarkVisited: (destination: Destination) => void;
  onJournal: (destination: Destination) => void;
}

/** Journal-style card for the destination selected on the globe or in the list. */
export function DestinationDetails({ destination: d, onClose, onEdit, onMarkVisited, onJournal }: DestinationDetailsProps) {
  const visited = d.status === 'visited';
  return (
    <article className={`details details--${d.status}`} aria-labelledby="details-title" aria-live="polite">
      <div className="details__top">
        <span className={`badge badge--${d.status}`}>
          <StatusIcon status={d.status} size={12} />
          {visited ? 'Visited' : 'Want to visit'}
        </span>
        <button type="button" className="icon-btn icon-btn--plain icon-btn--tiny" onClick={onClose} aria-label="Close details">
          <X size={16} />
        </button>
      </div>
      <h2 id="details-title" className="details__city">{d.city}</h2>
      <p className="details__country">{d.country}{visited && d.travelYear ? ` · Visited ${d.travelYear}` : ''}</p>
      <p className="details__coords mono">{formatCoordinates(d.latitude, d.longitude)}</p>

      {d.note ? (
        <blockquote className="details__note">
          <p>{d.note}</p>
          <footer>{visited ? (d.travelYear ? `Travel memory · ${d.travelYear}` : 'Travel memory') : 'Why I want to go'} · Edited {formatMonthYear(d.updatedAt)}</footer>
        </blockquote>
      ) : (
        <p className="details__no-note">No note yet — add a memory or a reason to go.</p>
      )}

      <div className="details__actions">
        <button type="button" className="btn btn--small btn--ghost" onClick={() => onEdit(d)}>
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
        {visited && (
          <button type="button" className="btn btn--small btn--visited" onClick={() => onJournal(d)}>
            <BookOpen size={15} aria-hidden="true" /> Travel journal
          </button>
        )}
        {!visited && (
          <button type="button" className="btn btn--small btn--visited" onClick={() => onMarkVisited(d)}>
            <Check size={15} aria-hidden="true" /> Mark as visited
          </button>
        )}
      </div>
    </article>
  );
}
