import { useState } from 'react';
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

export function AddMealForm({ foods, onSubmit, isLoading }: AddMealFormProps) {
  const [foodId, setFoodId] = useState('');
  const [grams, setGrams] = useState('');
  const [search, setSearch] = useState('');

  const filtered = foods.filter(
    (f) =>
      !f.archived &&
      f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedFood = foods.find((f) => f.id === foodId);
  const gramsNum = parseFloat(grams);
  const preview =
    selectedFood && gramsNum > 0
      ? Math.round((gramsNum * parseFloat(selectedFood.kcalPer100g)) / 100 * 10) / 10
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodId || !gramsNum || gramsNum <= 0) return;
    onSubmit(foodId, gramsNum);
    setGrams('');
    setSearch('');
    setFoodId('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Dodaj posiłek</h3>

      {/* Food search/select */}
      <div>
        <input
          type="text"
          placeholder="Szukaj produktu..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setFoodId(''); }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        {search && !foodId && (
          <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">Brak wyników</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFoodId(f.id); setSearch(f.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-gray-400">
                    {categoryLabel[f.category]} · {f.kcalPer100g} kcal/100g
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {foodId && selectedFood && (
          <div className="mt-1 text-xs text-gray-400">
            {categoryLabel[selectedFood.category]} · {selectedFood.kcalPer100g} kcal/100g
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
            min={1}
            step={1}
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
          {isLoading ? '...' : 'Dodaj'}
        </button>
      </div>
    </form>
  );
}
