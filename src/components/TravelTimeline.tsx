import { CalendarDays, MapPin, X } from 'lucide-react';
import type { Destination } from '../domain/types';
import { groupTravelHistory } from '../domain/timeline';

interface Props {
  destinations: readonly Destination[];
  onOpen: (destination: Destination) => void;
  onClose: () => void;
}

export function TravelTimeline({ destinations, onOpen, onClose }: Props) {
  const groups = groupTravelHistory(destinations);
  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <header className="journal__header">
        <div>
          <p className="eyebrow">Your journeys, through the years</p>
          <h2 id="timeline-title" className="form__title">Travel timeline</h2>
        </div>
        <button className="icon-btn icon-btn--plain" type="button" onClick={onClose} aria-label="Close timeline"><X size={18}/></button>
      </header>
      {groups.length === 0 ? (
        <p className="timeline__empty">No visited places yet. Add a destination and mark it as visited to start your story.</p>
      ) : (
        <>
          <p className="timeline__summary"><CalendarDays size={16} aria-hidden="true" /> {groups.reduce((n,g)=>n+g.destinations.length,0)} visited places · {groups.filter(g=>g.year!==null).length} recorded years</p>
          {groups.map(group => (
            <section key={group.year ?? 'undated'} className="timeline__group" aria-label={group.year === null ? 'Unknown year' : `Year ${group.year}`}>
              <h3 className="timeline__year">{group.year ?? 'Year not set'} <span>{group.destinations.length} {group.destinations.length === 1 ? 'place' : 'places'}</span></h3>
              <div className="timeline__entries">
                {group.destinations.map(d => (
                  <button key={d.id} className="timeline__entry" type="button" onClick={() => onOpen(d)}>
                    <span className="timeline__pin"><MapPin size={16}/></span>
                    <span className="timeline__entry-text"><strong>{d.city}</strong><span>{d.country}</span>{d.note && <small>{d.note}</small>}</span>
                    <span className="timeline__arrow" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
      <p className="timeline__footnote">Trips without a recorded year appear last. Edit a visited destination to add its year.</p>
    </section>
  );
}
