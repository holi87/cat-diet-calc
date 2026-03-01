import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../api/client';
import { Cat, Food, DaySummary } from '../types';
import { DaySummaryCard } from '../components/DaySummaryCard';
import { FeedEntryList } from '../components/FeedEntryList';
import { AddMealForm } from '../components/AddMealForm';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export function Today() {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [date, setDate] = useState(todayDate());
  const qc = useQueryClient();

  // Load cats
  const { data: cats = [] } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  // Auto-select first cat
  useEffect(() => {
    if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
  }, [cats, selectedCatId]);

  const catId = selectedCatId ?? cats[0]?.id;

  // Load foods
  const { data: foods = [] } = useQuery<Food[]>({
    queryKey: ['foods', { archived: false }],
    queryFn: () => apiGet<Food[]>('/foods'),
  });

  // Load day summary
  const { data: summary, isLoading: summaryLoading } = useQuery<DaySummary>({
    queryKey: ['day-summary', catId, date],
    queryFn: () => apiGet<DaySummary>('/day-summary', { catId: catId!, date }),
    enabled: !!catId,
  });

  // Add meal
  const { mutate: addMeal, isPending: addingMeal } = useMutation({
    mutationFn: ({ foodId, grams }: { foodId: string; grams: number }) =>
      apiPost('/feed-entries', { catId, foodId, grams }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-summary', catId, date] }),
  });

  // Delete entry
  const { mutate: deleteEntry, isPending: deletingEntry } = useMutation({
    mutationFn: (id: string) => apiDelete(`/feed-entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-summary', catId, date] }),
  });

  return (
    <div>
      {/* Cat + date selectors */}
      <div className="flex gap-2 mb-4">
        {cats.length > 1 && (
          <select
            value={catId ?? ''}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Day summary */}
      {summaryLoading ? (
        <div className="text-center text-gray-400 py-6">Ładowanie...</div>
      ) : summary ? (
        <>
          <DaySummaryCard
            totalKcal={summary.totalKcal}
            dailyKcalTarget={summary.dailyKcalTarget}
            remainingKcal={summary.remainingKcal}
          />

          {/* Feed entries */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Posiłki dnia</h2>
            <FeedEntryList
              entries={summary.entries}
              onDelete={(id) => deleteEntry(id)}
              isDeleting={deletingEntry}
            />
          </div>

          {/* Add meal form */}
          <AddMealForm
            foods={foods}
            onSubmit={(foodId, grams) => addMeal({ foodId, grams })}
            isLoading={addingMeal}
          />

          {/* Close day CTA */}
          <Link
            to="/close-day"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            🍽️ Domknij dzień (kolacja) →
          </Link>
        </>
      ) : (
        <div className="text-center text-gray-400 py-6">
          {cats.length === 0 ? 'Dodaj kota w panelu Admin' : 'Wybierz kota'}
        </div>
      )}
    </div>
  );
}
