import type { Toast } from '../hooks/useToasts';
import { CircleCheck, Info, Sparkles, TriangleAlert, X } from 'lucide-react';

const ICONS = { success: CircleCheck, celebrate: Sparkles, info: Info, warning: TriangleAlert };

export function ToastRegion({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <Icon size={18} className="toast__icon" aria-hidden="true" />
            <div className="toast__body">
              <strong>{t.title}</strong>
              {t.detail && <span>{t.detail}</span>}
            </div>
            <button type="button" className="toast__close" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
