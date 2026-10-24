import { CalendarDays, FlaskConical, LogOut, Plus } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  isDemo: boolean;
  onAdd: () => void;
  onTimeline: () => void;
  onStartDemo: () => void;
  onExitDemo: () => void;
}

export function Header({ isDemo, onAdd, onTimeline, onStartDemo, onExitDemo }: HeaderProps) {
  return (
    <header className="header">
      <a className="brand" href="./" aria-label="Globe Explorer home">
        <Logo />
        <span className="brand__text">
          <span className="brand__name">Globe Explorer</span>
          <span className="brand__tagline">Your world. Your story.</span>
        </span>
      </a>
      <div className="header__actions">
        <button type="button" className="btn btn--ghost" onClick={onTimeline} title="See travel timeline">
          <CalendarDays size={16} aria-hidden="true" /> <span className="btn__timeline-label">Timeline</span>
        </button>
        {isDemo ? (
          <button type="button" className="btn btn--ghost" onClick={onExitDemo} aria-label="Exit demo" title="Exit demo">
            <LogOut size={16} aria-hidden="true" />
            <span>Exit demo</span>
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={onStartDemo} aria-label="Try demo" title="Try demo with sample data">
            <FlaskConical size={16} aria-hidden="true" />
            <span>Try demo</span>
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          <Plus size={18} aria-hidden="true" />
          <span className="btn__label-long">Add destination</span>
          <span className="btn__label-short">Add</span>
        </button>
      </div>
    </header>
  );
}
