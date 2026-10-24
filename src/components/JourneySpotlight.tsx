import { useState } from 'react';
import { Compass, Plus, Shuffle } from 'lucide-react';
import type { Destination } from '../domain/types';

interface JourneySpotlightProps {
  wishlist: readonly Destination[];
  onFocus: (destination: Destination) => void;
  onAdd: () => void;
}

/** "Next adventure" card. Surprise me picks a different saved wishlist destination at random. */
export function JourneySpotlight({ wishlist, onFocus, onAdd }: JourneySpotlightProps) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (wishlist.length === 0) {
    return (
      <div className="spotlight spotlight--empty">
        <Compass size={20} aria-hidden="true" className="spotlight__icon" />
        <div className="spotlight__body">
          <p className="spotlight__label">Next adventure</p>
          <p className="spotlight__hint">Add a dream destination to your wishlist and we’ll help you pick where to go next.</p>
        </div>
        <button type="button" className="icon-btn" onClick={onAdd} aria-label="Add a wishlist destination">
          <Plus size={17} />
        </button>
      </div>
    );
  }

  // Default to the newest wishlist entry until the user asks for a surprise.
  const current = wishlist.find((d) => d.id === pickedId) ?? wishlist[0];

  const surprise = () => {
    const others = wishlist.filter((d) => d.id !== current.id);
    const next = others.length ? others[Math.floor(Math.random() * others.length)] : current;
    setPickedId(next.id);
    onFocus(next);
  };

  return (
    <div className="spotlight">
      <Compass size={20} aria-hidden="true" className="spotlight__icon" />
      <button type="button" className="spotlight__body spotlight__body--btn" onClick={() => onFocus(current)}>
        <span className="spotlight__label">Next adventure</span>
        <span key={current.id} className="spotlight__place">
          {current.city}, <span className="spotlight__country">{current.country}</span>
        </span>
      </button>
      <button type="button" className="btn btn--small btn--soft" onClick={surprise} aria-label="Surprise me: fly to a random wishlist destination">
        <Shuffle size={15} aria-hidden="true" />
        <span>Surprise me</span>
      </button>
    </div>
  );
}
