import { useCallback, useRef, useState } from 'react';

export type ToastTone = 'success' | 'celebrate' | 'info' | 'warning';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

/** Small notification queue: at most three toasts, each dismissing itself. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, tone, title, detail }]);
      window.setTimeout(() => dismiss(id), tone === 'warning' ? 7000 : 4200);
    },
    [dismiss],
  );

  return { toasts, notify, dismiss };
}
