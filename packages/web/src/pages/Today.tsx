import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../api/client';
import { Cat, Food, DaySummary } from '../types';
import { DaySummaryCard } from '../components/DaySummaryCard';
import { FeedEntryList } from '../components/FeedEntryList';
import { AddMealForm } from '../components/AddMealForm';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { DayNoteInput } from '../components/DayNoteInput';
import { localDateStr } from '../lib/dates';
import { useCurrentDate } from '../lib/useCurrentDate';

export function Today() {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const currentDay = useCurrentDate();
  const [date, setDate] = useState(currentDay);
  const qc = useQueryClient();

  // Follow the calendar day unless the user picked another date manually —
  // a PWA resumed next morning must show the new day, not yesterday's.
  const prevDayRef = useRef(currentDay);
  useEffect(() => {
    if (currentDay !== prevDayRef.current && date === prevDayRef.current) {
      setDate(currentDay);
    }
    prevDayRef.current = currentDay;
  }, [currentDay, date]);

  // Load cats
  const { data: cats = [], isError: catsError } = useQuery<Cat[]>({
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
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery<DaySummary>({
    queryKey: ['day-summary', catId, date],
    queryFn: () => apiGet<DaySummary>('/day-summary', { catId: catId!, date }),
    enabled: !!catId,
  });

  const invalidateDayData = () => {
    qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
    qc.invalidateQueries({ queryKey: ['history'] });
  };

  // Add meal — when browsing another day, the entry must land on that day
  const { mutate: addMeal, isPending: addingMeal } = useMutation({
    mutationFn: (data: { foodId: string; grams?: number; pieces?: number }) =>
      apiPost('/feed-entries', {
        catId,
        ...data,
        ...(date === localDateStr()
          ? {}
          : { datetime: new Date(`${date}T12:00:00`).toISOString() }),
      }),
    onSuccess: invalidateDayData,
  });

  // Delete entry
  const { mutate: deleteEntry, isPending: deletingEntry } = useMutation({
    mutationFn: (id: string) => apiDelete(`/feed-entries/${id}`),
    onSuccess: invalidateDayData,
  });

  return (
    <div>
      {/* Cat + date selectors */}
      <div className="flex gap-2 mb-4">
        {cats.length > 1 && (
          <div className="flex-1">
            <label htmlFor="cat-select" className="text-xs font-medium text-gray-500 dark:text-gray-400">Kot</label>
            <select
              id="cat-select"
              value={catId ?? ''}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="date-picker" className="text-xs font-medium text-gray-500 dark:text-gray-400">Data</label>
          <input
            id="date-picker"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Day summary */}
      {summaryLoading ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-6">Ładowanie...</div>
      ) : summaryError ? (
        <div className="text-center text-red-500 py-6">
          Nie udało się pobrać danych dnia. Spróbuj ponownie.
        </div>
      ) : summary ? (
        <>
          <DaySummaryCard
            totalKcal={summary.totalKcal}
            dailyKcalTarget={summary.dailyKcalTarget}
            remainingKcal={summary.remainingKcal}
          />

          {/* Weekly summary */}
          {catId && <WeeklySummaryCard catId={catId} />}

          {/* Feed entries */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Posiłki dnia</h2>
            <FeedEntryList
              entries={summary.entries}
              onDelete={(id) => deleteEntry(id)}
              isDeleting={deletingEntry}
            />
          </div>

          {/* Add meal form */}
          <AddMealForm
            foods={foods}
            onSubmit={(data) => addMeal(data)}
            isLoading={addingMeal}
          />

          {/* Day note */}
          {catId && <DayNoteInput catId={catId} date={date} />}

          {/* Close day CTA */}
          <Link
            to="/close-day"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            🍽️ Domknij dzień (kolacja) →
          </Link>
        </>
      ) : (
        <div className="text-center text-gray-400 dark:text-gray-500 py-6">
          {catsError
            ? 'Nie udało się pobrać listy kotów. Sprawdź połączenie.'
            : cats.length === 0
              ? 'Dodaj kota w panelu Admin'
              : 'Wybierz kota'}
        </div>
      )}
    </div>
  );
}
