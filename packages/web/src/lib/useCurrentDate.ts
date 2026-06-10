import { useEffect, useState } from 'react';
import { localDateStr } from './dates';

/**
 * Today's local date string, refreshed when the app regains focus or
 * visibility — a PWA resumed from memory the next morning must not keep
 * operating on yesterday's date.
 */
export function useCurrentDate(): string {
  const [today, setToday] = useState(() => localDateStr());

  useEffect(() => {
    const update = () => setToday(localDateStr());
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return today;
}
