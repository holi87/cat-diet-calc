import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const mainNav = [
  { to: '/', label: 'Dzisiaj', icon: '🏠' },
  { to: '/close-day', label: 'Kolacja', icon: '🍽️' },
  { to: '/weight', label: 'Waga', icon: '⚖️' },
];

const adminNav = [
  { to: '/admin/cats', label: 'Koty', icon: '🐱' },
  { to: '/admin/foods', label: 'Produkty', icon: '🥩' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [adminOpen, setAdminOpen] = useState(false);
  const location = useLocation();
  const isAdminActive = adminNav.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" onClick={() => setAdminOpen(false)}>
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 sticky top-0 z-10 shadow-sm">
        <span className="text-2xl">🐱</span>
        <h1 className="text-lg font-bold text-gray-800">CatCal</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        {/* Admin dropup */}
        {adminOpen && (
          <div className="absolute bottom-full right-0 mb-1 mr-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setAdminOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-50'
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
                  isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* Admin button */}
          <button
            onClick={(e) => { e.stopPropagation(); setAdminOpen((o) => !o); }}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              isAdminActive || adminOpen ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xl mb-0.5">⚙️</span>
            Admin
          </button>
        </div>
      </nav>
    </div>
  );
}
