import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { apiGet, apiPost } from '../api/client';
import { Cat, WeightEntry } from '../types';

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

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
  const selectedCat = cats.find((c) => c.id === catId);

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

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    return entries.map((e) => ({
      fullDate: e.date,
      label: formatDateLabel(e.date),
      weightKg: parseFloat(e.weightKg),
    }));
  }, [entries]);

  const targetWeightKg = selectedCat?.targetWeightKg
    ? parseFloat(selectedCat.targetWeightKg)
    : null;

  return (
    <div>
      <h2 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-4">⚖️ Waga</h2>

      {cats.length > 1 && (
        <div className="mb-4">
          <label htmlFor="weight-cat-select" className="text-xs font-medium text-gray-500 dark:text-gray-400">Kot</label>
          <select
            id="weight-cat-select"
            value={catId ?? ''}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          >
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Weight chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Wykres wagi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={45}
              />
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0)} kg`, 'Waga']}
                labelFormatter={(label) => String(label ?? '')}
              />
              {targetWeightKg && (
                <ReferenceLine
                  y={targetWeightKg}
                  stroke="#22c55e"
                  strokeDasharray="6 4"
                  label={{
                    value: `Cel: ${targetWeightKg} kg`,
                    position: 'right',
                    fontSize: 10,
                    fill: '#22c55e',
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weightKg"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 4, fill: '#f97316' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); addWeight(); }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Dodaj pomiar</h3>
        <div>
          <label htmlFor="weight-date" className="text-xs font-medium text-gray-500 dark:text-gray-400">Data</label>
          <input
            id="weight-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="weight-kg" className="text-xs font-medium text-gray-500 dark:text-gray-400">Waga (kg)</label>
          <input
            id="weight-kg"
            type="number"
            placeholder="np. 4.25"
            value={weightKg}
            min={0.1}
            step={0.01}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="weight-note" className="text-xs font-medium text-gray-500 dark:text-gray-400">Notatka (opcjonalnie)</label>
          <input
            id="weight-note"
            type="text"
            placeholder="np. po jedzeniu"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
        </div>
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
          <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">Brak pomiarów.</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{e.date}</div>
                {e.note && <div className="text-xs text-gray-400 dark:text-gray-500">{e.note}</div>}
              </div>
              <div className="text-xl font-bold text-brand-600">{e.weightKg} kg</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
