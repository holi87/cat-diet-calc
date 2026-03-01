import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dzisiaj', icon: '🏠' },
  { to: '/close-day', label: 'Kolacja', icon: '🍽️' },
  { to: '/admin/cats', label: 'Koty', icon: '🐱' },
  { to: '/admin/foods', label: 'Produkty', icon: '⚙️' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
