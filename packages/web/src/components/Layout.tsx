import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CHANGELOG } from '../changelog';
import { OfflineBanner } from './OfflineBanner';

const APP_VERSION = '1.4.0';

function useIosInstallBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (isIOS && !isStandalone && !dismissed) setShow(true);
  }, []);
  const dismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    setShow(false);
  };
  return { show, dismiss };
}

const mainNav = [
  { to: '/', label: 'Dzisiaj', icon: '🏠' },
  { to: '/close-day', label: 'Kolacja', icon: '🍽️' },
  { to: '/weight', label: 'Waga', icon: '⚖️' },
];

const moreNav = [
  { to: '/history', label: 'Historia', icon: '📊' },
  { to: '/admin/cats', label: 'Koty', icon: '🐱' },
  { to: '/admin/foods', label: 'Produkty', icon: '🥩' },
];

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">🐱</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">CatCal</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">wersja {APP_VERSION}</p>

        <div className="bg-brand-50 rounded-xl px-5 py-4 mb-4">
          <p className="text-sm text-brand-700 font-medium leading-relaxed">
            Aplikacja dedykowana dla najwspanialszej na świecie
          </p>
          <p className="text-lg font-bold text-brand-600 mt-1">Juli S. 💛</p>
          <p className="text-xs text-brand-500 mt-2 leading-relaxed">
            Opiekunki Myszy<br />i cudownej Partnerki życiowej
          </p>
        </div>

        {/* Changelog — ostatnie 3 wersje, od najnowszej */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 mb-5 text-left">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Historia zmian
          </p>
          <div className="max-h-40 overflow-y-auto space-y-3 pr-1">
            {[...CHANGELOG].reverse().slice(0, 3).map((entry) => (
              <div key={entry.version}>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">v{entry.version}</p>
                <ul className="space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('catcal-theme', next ? 'dark' : 'light');
  };
  const location = useLocation();
  const isMoreActive = moreNav.some((i) => location.pathname.startsWith(i.to));
  const { show: showIosBanner, dismiss: dismissIosBanner } = useIosInstallBanner();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" onClick={() => setMoreOpen(false)}>
      {/* Offline banner */}
      <OfflineBanner />

      {/* Top bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2 sticky top-0 z-10 shadow-sm dark:shadow-gray-900/30">
        <span className="text-2xl">🐱</span>
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex-1">CatCal</h1>
        <button
          onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:text-gray-500 dark:hover:text-brand-400 dark:hover:bg-gray-700 transition-colors"
          aria-label="Zmień motyw"
        >
          {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:text-gray-500 dark:hover:text-brand-400 dark:hover:bg-gray-700 transition-colors"
          aria-label="Informacje o aplikacji"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {children}

        {/* Footer version */}
        <p className="text-center text-gray-300 dark:text-gray-600 text-xs mt-8 mb-2 select-none">
          CatCal v{APP_VERSION}
        </p>
      </main>

      {/* iOS PWA install banner */}
      {showIosBanner && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-2">
          <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3">
            <span className="text-3xl mt-0.5">🐱</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dodaj CatCal do ekranu głównego</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Dotknij <span className="inline-block align-middle">⎙</span> „Udostępnij", a następnie „Dodaj do ekranu głównego"
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissIosBanner(); }}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none mt-0.5 flex-shrink-0"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Admin dropup */}
        {moreOpen && (
          <div className="absolute bottom-full right-0 mb-1 mr-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            {moreNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="max-w-lg mx-auto flex">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={(e) => { e.stopPropagation(); setMoreOpen((o) => !o); }}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              isMoreActive || moreOpen ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="text-xl mb-0.5">📋</span>
            Więcej
          </button>
        </div>
      </nav>

      {/* Info modal */}
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
