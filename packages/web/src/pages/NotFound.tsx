import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🙀</div>
      <div className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
        Nie znaleziono strony
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
        Ten adres nie istnieje w aplikacji.
      </p>
      <Link
        to="/"
        className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2 rounded-lg text-sm"
      >
        Wróć do „Dzisiaj"
      </Link>
    </div>
  );
}
