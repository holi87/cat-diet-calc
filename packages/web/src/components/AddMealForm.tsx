import { useState, useEffect, useRef } from 'react';
import { Food } from '../types';

interface AddMealFormProps {
  foods: Food[];
  onSubmit: (foodId: string, grams: number) => void;
  isLoading?: boolean;
}

const categoryLabel: Record<string, string> = {
  KIBBLE: 'Karma',
  WET_FOOD: 'Mokra',
  MEAT: 'Mięso',
  TREAT: 'Przysmak',
};

const categoryColor: Record<string, string> = {
  KIBBLE: 'text-yellow-700 bg-yellow-100',
  WET_FOOD: 'text-blue-700 bg-blue-100',
  MEAT: 'text-red-700 bg-red-100',
  TREAT: 'text-purple-700 bg-purple-100',
};

export function AddMealForm({ foods, onSubmit, isLoading }: AddMealFormProps) {
  const [foodId, setFoodId] = useState('');
  const [grams, setGrams] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFoods = foods.filter((f) => !f.archived);

  // Auto-select "Karma standardowa" on first load, fallback to first food
  useEffect(() => {
    if (!foodId && activeFoods.length > 0) {
      const karma = activeFoods.find((f) =>
        f.name.toLowerCase().includes('karma standardowa'),
      );
      setFoodId(karma?.id ?? activeFoods[0].id);
    }
  }, [activeFoods, foodId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedFood = activeFoods.find((f) => f.id === foodId);
  const gramsNum = parseFloat(grams);
  const preview =
    selectedFood && gramsNum > 0
      ? Math.round(((gramsNum * parseFloat(selectedFood.kcalPer100g)) / 100) * 10) / 10
      : null;

  const getDefaultFoodId = () => {
    const karma = activeFoods.find((f) =>
      f.name.toLowerCase().includes('karma standardowa'),
    );
    return karma?.id ?? activeFoods[0]?.id ?? '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodId || !gramsNum || gramsNum <= 0) return;
    onSubmit(foodId, gramsNum);
    setGrams('');
    setFoodId(getDefaultFoodId()); // always reset to Karma standardowa
  };

  const colorCls = selectedFood
    ? (categoryColor[selectedFood.category] ?? 'text-gray-600 bg-gray-100')
    : '';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Dodaj posiłek</h3>

      {/* Food selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-brand-400 hover:border-gray-300 transition-colors"
        >
          {selectedFood ? (
            <>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${colorCls}`}>
                {categoryLabel[selectedFood.category] ?? selectedFood.category}
              </span>
              <span className="flex-1 text-gray-800 font-medium">{selectedFood.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {selectedFood.kcalPer100g} kcal/100g
              </span>
            </>
          ) : (
            <span className="flex-1 text-gray-400">Wybierz produkt…</span>
          )}
          <span className={`text-gray-400 text-xs transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {/* Dropdown list */}
        {dropdownOpen && (
          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {activeFoods.map((f) => {
              const isSelected = f.id === foodId;
              const clr = categoryColor[f.category] ?? 'text-gray-600 bg-gray-100';
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFoodId(f.id); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                    isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${clr}`}>
                    {categoryLabel[f.category] ?? f.category}
                  </span>
                  <span className={`flex-1 text-sm ${isSelected ? 'text-brand-700 font-semibold' : 'text-gray-700'}`}>
                    {f.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{f.kcalPer100g} kcal/100g</span>
                  {isSelected && <span className="text-brand-500 text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grams + submit */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            placeholder="Gramatura (g)"
            value={grams}
            min={0.1}
            step={0.1}
            onChange={(e) => setGrams(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {preview !== null && (
            <div className="text-xs text-gray-400 mt-0.5">≈ {preview} kcal</div>
          )}
        </div>
        <button
          type="submit"
          disabled={!foodId || !gramsNum || gramsNum <= 0 || isLoading}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {isLoading ? '…' : 'Dodaj'}
        </button>
      </div>
    </form>
  );
}
