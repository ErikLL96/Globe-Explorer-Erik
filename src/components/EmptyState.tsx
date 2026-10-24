import { FlaskConical, Plus } from 'lucide-react';

interface EmptyStateProps {
  onAdd: () => void;
  onStartDemo: () => void;
}

export function EmptyState({ onAdd, onStartDemo }: EmptyStateProps) {
  return (
    <section className="empty" aria-labelledby="empty-title">
      <p className="eyebrow eyebrow--accent">Chapter one</p>
      <h2 id="empty-title" className="empty__title">Your adventure starts here.</h2>
      <p className="empty__text">Add your first destination to start mapping your world — places you’ve been, and places you dream of.</p>
      <div className="empty__actions">
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          <Plus size={18} aria-hidden="true" /> Add destination
        </button>
        <button type="button" className="btn btn--ghost" onClick={onStartDemo}>
          <FlaskConical size={16} aria-hidden="true" /> Try demo
        </button>
      </div>
      <p className="empty__fine">The demo uses a clearly labelled, fictional sample journey and never touches your own data.</p>
    </section>
  );
}
