import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../api/client';
import { Food, FoodCategory } from '../types';

const categories: { value: FoodCategory; label: string }[] = [
  { value: 'BASE', label: 'Karma bazowa' },
  { value: 'KIBBLE', label: 'Karma sucha' },
  { value: 'WET_FOOD', label: 'Karma mokra' },
  { value: 'MEAT', label: 'Mięso' },
  { value: 'TREAT', label: 'Przysmak' },
];

const categoryLabel: Record<FoodCategory, string> = {
  BASE: 'Baza',
  KIBBLE: 'Karma',
  WET_FOOD: 'Mokra',
  MEAT: 'Mięso',
  TREAT: 'Przysmak',
};

const categoryColor: Record<FoodCategory, string> = {
  BASE: 'bg-green-100 text-green-700',
  KIBBLE: 'bg-amber-100 text-amber-800',
  WET_FOOD: 'bg-blue-100 text-blue-700',
  MEAT: 'bg-red-100 text-red-700',
  TREAT: 'bg-orange-100 text-orange-700',
};

export function FoodsAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('KIBBLE');
  const [kcal, setKcal] = useState('');

  const { data: foods = [], isLoading } = useQuery<Food[]>({
    queryKey: ['foods', { archived: showArchived }],
    queryFn: () => apiGet<Food[]>('/foods', showArchived ? { archived: 'true' } : {}),
  });

  const filtered = filterCategory
    ? foods.filter((f) => f.category === filterCategory)
    : foods;

  const { mutate: createFood, isPending: creating } = useMutation({
    mutationFn: () => apiPost('/foods', { name, category, kcalPer100g: parseFloat(kcal) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
      setName(''); setKcal(''); setCategory('KIBBLE'); setShowForm(false);
    },
  });

  const { mutate: updateFood, isPending: updating } = useMutation({
    mutationFn: () =>
      apiPut(`/foods/${editingFood!.id}`, { name, category, kcalPer100g: parseFloat(kcal) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
      setEditingFood(null); setName(''); setKcal(''); setCategory('KIBBLE'); setShowForm(false);
    },
  });

  const { mutate: archiveFood } = useMutation({
    mutationFn: (id: string) => apiPost(`/foods/${id}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  });

  function startEdit(food: Food) {
    setEditingFood(food);
    setName(food.name);
    setCategory(food.category as FoodCategory);
    setKcal(food.kcalPer100g);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !kcal) return;
    if (editingFood) updateFood();
    else createFood();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-gray-700">⚙️ Produkty</h2>
        <button
          onClick={() => { setShowForm(true); setEditingFood(null); setName(''); setKcal(''); setCategory('KIBBLE'); }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Dodaj
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">
            {editingFood ? 'Edytuj produkt' : 'Nowy produkt'}
          </h3>
          <input
            type="text"
            placeholder="Nazwa produktu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FoodCategory)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="kcal / 100g"
            value={kcal}
            min={0}
            step={0.1}
            onChange={(e) => setKcal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || !kcal || creating || updating}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm"
            >
              {editingFood ? 'Zapisz' : 'Dodaj'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingFood(null); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setFilterCategory('')}
          className={`text-xs px-3 py-1 rounded-full font-medium border ${!filterCategory ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-500 border-gray-200'}`}
        >
          Wszystkie
        </button>
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`text-xs px-3 py-1 rounded-full font-medium border ${filterCategory === c.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-xs px-3 py-1 rounded-full font-medium border ml-auto ${showArchived ? 'bg-gray-500 text-white border-gray-500' : 'bg-white text-gray-400 border-gray-200'}`}
        >
          {showArchived ? 'Ukryj zarchiwizowane' : 'Pokaż zarchiwizowane'}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-6">Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-6">Brak produktów.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((food) => (
            <div
              key={food.id}
              className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 ${food.archived ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${categoryColor[food.category as FoodCategory]}`}>
                {categoryLabel[food.category as FoodCategory]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm truncate">{food.name}</div>
                <div className="text-xs text-gray-400">{food.kcalPer100g} kcal/100g</div>
              </div>
              {!food.archived && (
                <>
                  <button
                    onClick={() => startEdit(food)}
                    className="text-gray-300 hover:text-brand-500 transition-colors"
                    title="Edytuj"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Archiwizować "${food.name}"?`)) archiveFood(food.id);
                    }}
                    className="text-gray-300 hover:text-orange-400 transition-colors"
                    title="Archiwizuj"
                  >
                    📦
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
