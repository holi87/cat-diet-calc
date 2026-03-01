import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import { Cat, DaySummary } from '../types';
import { DaySummaryCard } from '../components/DaySummaryCard';
import { CloseDayCalc } from '../components/CloseDayCalc';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export function CloseDayPage() {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [date] = useState(todayDate());

  const { data: cats = [] } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  useEffect(() => {
    if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
  }, [cats, selectedCatId]);

  const catId = selectedCatId ?? cats[0]?.id;

  const { data: summary } = useQuery<DaySummary>({
    queryKey: ['day-summary', catId, date],
    queryFn: () => apiGet<DaySummary>('/day-summary', { catId: catId!, date }),
    enabled: !!catId,
  });

  return (
    <div>
      <h2 className="text-base font-bold text-gray-700 mb-4">🍽️ Domknięcie dnia</h2>

      {cats.length > 1 && (
        <select
          value={catId ?? ''}
          onChange={(e) => setSelectedCatId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {summary && catId ? (
        <>
          <DaySummaryCard
            totalKcal={summary.totalKcal}
            dailyKcalTarget={summary.dailyKcalTarget}
            remainingKcal={summary.remainingKcal}
          />
          <CloseDayCalc catId={catId} date={date} summary={summary} />
        </>
      ) : (
        <div className="text-center text-gray-400 py-6">Ładowanie...</div>
      )}
    </div>
  );
}
