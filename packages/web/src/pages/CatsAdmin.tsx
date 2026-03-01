import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../api/client';
import { Cat } from '../types';

export function CatsAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');

  const { data: cats = [], isLoading } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  const { mutate: createCat, isPending: creating } = useMutation({
    mutationFn: () => apiPost('/cats', { name, dailyKcalTarget: parseInt(kcal) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      setName(''); setKcal(''); setShowForm(false);
    },
  });

  const { mutate: updateCat, isPending: updating } = useMutation({
    mutationFn: (data: Partial<Pick<Cat, 'name' | 'dailyKcalTarget'>>) =>
      apiPut(`/cats/${editingCat!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      setEditingCat(null); setName(''); setKcal(''); setShowForm(false);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: (cat: Cat) => apiPut(`/cats/${cat.id}`, { active: !cat.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cats'] }),
  });

  function startEdit(cat: Cat) {
    setEditingCat(cat);
    setName(cat.name);
    setKcal(String(cat.dailyKcalTarget));
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !kcal) return;
    if (editingCat) {
      updateCat({ name, dailyKcalTarget: parseInt(kcal) });
    } else {
      createCat();
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-gray-700">🐱 Koty</h2>
        <button
          onClick={() => { setShowForm(true); setEditingCat(null); setName(''); setKcal(''); }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Dodaj kota
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">
            {editingCat ? 'Edytuj kota' : 'Nowy kot'}
          </h3>
          <input
            type="text"
            placeholder="Imię kota"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            type="number"
            placeholder="Limit kcal/dzień"
            value={kcal}
            min={1}
            onChange={(e) => setKcal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || !kcal || creating || updating}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm"
            >
              {editingCat ? 'Zapisz' : 'Dodaj'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingCat(null); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-6">Ładowanie...</div>
      ) : cats.length === 0 ? (
        <div className="text-center text-gray-400 py-6">Brak kotów. Dodaj pierwszego!</div>
      ) : (
        <div className="space-y-2">
          {cats.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{cat.name}</div>
                <div className="text-xs text-gray-400">Limit: {cat.dailyKcalTarget} kcal/dzień</div>
              </div>
              <button
                onClick={() => toggleActive(cat)}
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  cat.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cat.active ? 'aktywny' : 'nieaktywny'}
              </button>
              <button
                onClick={() => startEdit(cat)}
                className="text-gray-400 hover:text-brand-500 transition-colors text-sm"
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
