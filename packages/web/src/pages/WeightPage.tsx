import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api/client';
import { Cat, WeightEntry } from '../types';

export function WeightPage() {
  const qc = useQueryClient();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');

  const { data: cats = [] } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  useEffect(() => {
    if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
  }, [cats, selectedCatId]);

  const catId = selectedCatId ?? cats[0]?.id;

  const { data: entries = [] } = useQuery<WeightEntry[]>({
    queryKey: ['weight-entries', catId],
    queryFn: () => apiGet<WeightEntry[]>('/weight-entries', { catId: catId! }),
    enabled: !!catId,
  });

  const { mutate: addWeight, isPending: isLoading } = useMutation({
    mutationFn: () =>
      apiPost('/weight-entries', { catId, date, weightKg: parseFloat(weightKg), note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-entries', catId] });
      setWeightKg(''); setNote('');
    },
  });

  return (
    <div>
      <h2 className="text-base font-bold text-gray-700 mb-4">⚖️ Waga</h2>

      {cats.length > 1 && (
        <select
          value={catId ?? ''}
          onChange={(e) => setSelectedCatId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); addWeight(); }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-gray-600">Dodaj pomiar</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          type="number"
          placeholder="Waga (kg)"
          value={weightKg}
          min={0.1}
          step={0.01}
          onChange={(e) => setWeightKg(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          type="text"
          placeholder="Notatka (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="submit"
          disabled={!weightKg || isLoading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm"
        >
          Zapisz
        </button>
      </form>

      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">Brak pomiarów.</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-800">{e.date}</div>
                {e.note && <div className="text-xs text-gray-400">{e.note}</div>}
              </div>
              <div className="text-xl font-bold text-brand-600">{e.weightKg} kg</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
