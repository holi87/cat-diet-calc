import { useEffect, useState } from 'react';
import { setToastListener } from '../lib/toast';

interface Toast {
  id: number;
  message: string;
}

let nextToastId = 0;

/** Renders global error toasts above the bottom navigation. */
export function ErrorToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToastListener((message) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { id, message }]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 5000);
    });
    return () => setToastListener(null);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="bg-red-600 text-white text-sm font-medium rounded-xl px-4 py-3 shadow-lg pointer-events-auto"
        >
          ⚠️ {t.message}
        </div>
      ))}
    </div>
  );
}
