import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  TooltipContentProps,
  TooltipPayloadEntry,
  TooltipValueType,
} from 'recharts';
import { apiGet } from '../api/client';
import { Cat, FoodCategory, DailyHistoryResponse } from '../types';
import {
  CATEGORY_LABELS,
  CATEGORY_CHART_COLORS,
  ALL_CATEGORIES,
} from '../constants/categories';

type Unit = 'kcal' | 'grams';
type RangeMode = 'last' | 'custom';

function isFoodCategory(value: unknown): value is FoodCategory {
  return typeof value === 'string' && ALL_CATEGORIES.includes(value as FoodCategory);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().split('T')[0];
}

// Custom tooltip for the stacked bar chart
function HistoryTooltip({
  active,
  payload,
  unit,
}: TooltipContentProps<TooltipValueType, string | number> & { unit: Unit }) {
  if (!active || !payload || payload.length === 0) return null;

  const items = payload as TooltipPayloadEntry<TooltipValueType, string | number>[];
  const firstPayload = items[0]?.payload as { fullDate?: string } | undefined;

  const total = items.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const unitLabel = unit === 'kcal' ? 'kcal' : 'g';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {firstPayload?.fullDate
          ? new Date(firstPayload.fullDate + 'T12:00:00').toLocaleDateString('pl-PL', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })
          : ''}
      </div>
      {items
        .filter((p) => (Number(p.value) || 0) > 0)
        .map((p, idx) => {
          const maybeCategory = p.dataKey;
          const label = isFoodCategory(maybeCategory)
            ? CATEGORY_LABELS[maybeCategory]
            : String(p.name ?? p.dataKey ?? 'Pozycja');

          return (
            <div key={`${String(p.dataKey ?? p.name ?? idx)}-${idx}`} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
              <span>{label}</span>
            <span className="ml-auto font-medium">
              {Math.round((Number(p.value) || 0) * 10) / 10}
            </span>
          </div>
          );
        })}
      <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1 font-semibold text-gray-700 dark:text-gray-200">
        Razem: {Math.round(total * 10) / 10} {unitLabel}
      </div>
    </div>
  );
}

export function HistoryPage() {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>('last');
  const [lastNDays, setLastNDays] = useState(14);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [unit, setUnit] = useState<Unit>('kcal');
  const [enabledCategories, setEnabledCategories] = useState<Set<FoodCategory>>(
    new Set(ALL_CATEGORIES),
  );

  const { data: cats = [] } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  useEffect(() => {
    if (!selectedCatId && cats.length > 0) {
      const active = cats.find((c) => c.active);
      setSelectedCatId(active?.id ?? cats[0].id);
    }
  }, [cats, selectedCatId]);

  const catId = selectedCatId ?? cats[0]?.id;

  const { from, to } = useMemo(() => {
    if (rangeMode === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return { from: daysAgo(lastNDays), to: todayStr() };
  }, [rangeMode, lastNDays, customFrom, customTo]);

  const { data: history, isLoading } = useQuery<DailyHistoryResponse>({
    queryKey: ['history', catId, from, to],
    queryFn: () =>
      apiGet<DailyHistoryResponse>('/history/daily', {
        catId: catId!,
        from,
        to,
      }),
    enabled: !!catId && !!from && !!to,
    staleTime: 60_000,
  });

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.days.map((day) => {
      const row: Record<string, string | number> = {
        fullDate: day.date,
        label: formatDateLabel(day.date),
      };
      for (const cat of ALL_CATEGORIES) {
        if (!enabledCategories.has(cat)) {
          row[cat] = 0;
          continue;
        }
        const found = day.categories.find((c) => c.category === cat);
        row[cat] = found ? (unit === 'kcal' ? found.kcal : found.grams) : 0;
      }
      return row;
    });
  }, [history, unit, enabledCategories]);

  const weightChartData = useMemo(() => {
    if (!history?.weights || history.weights.length === 0) return [];
    return history.weights.map((w) => ({
      fullDate: w.date,
      label: formatDateLabel(w.date),
      weightKg: w.weightKg,
    }));
  }, [history]);

  const toggleCategory = (cat: FoodCategory) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const activeCategories = ALL_CATEGORIES.filter((c) => enabledCategories.has(c));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Historia</h2>
        {catId && from && to && (
          <button
            onClick={() =>
              window.open(
                `/api/export/csv?catId=${catId}&from=${from}&to=${to}`,
                '_blank',
              )
            }
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            📥 Eksport CSV
          </button>
        )}
      </div>

      {/* Cat selector */}
      {cats.length > 1 && (
        <select
          value={catId ?? ''}
          onChange={(e) => setSelectedCatId(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Controls card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4 space-y-3">
        {/* Unit toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['kcal', 'grams'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                unit === u
                  ? 'bg-white dark:bg-gray-600 text-brand-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {u === 'kcal' ? 'Kalorie (kcal)' : 'Gramatura (g)'}
            </button>
          ))}
        </div>

        {/* Range mode toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {([
            { key: 'last' as const, label: 'Ostatnie dni' },
            { key: 'custom' as const, label: 'Zakres dat' },
          ]).map((m) => (
            <button
              key={m.key}
              onClick={() => setRangeMode(m.key)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                rangeMode === m.key
                  ? 'bg-white dark:bg-gray-600 text-brand-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Date range controls */}
        {rangeMode === 'last' ? (
          <div className="flex gap-2">
            {[7, 14, 30].map((n) => (
              <button
                key={n}
                onClick={() => setLastNDays(n)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                  lastNDays === n
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {n} dni
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
            />
            <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
            />
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const active = enabledCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  active
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: active
                      ? CATEGORY_CHART_COLORS[cat]
                      : '#d1d5db',
                  }}
                />
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
          Wczytywanie danych...
        </div>
      )}

      {/* Stacked bar chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Dzienne spożycie
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={chartData.length > 14 ? Math.floor(chartData.length / 7) - 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                width={45}
              />
              <Tooltip
                content={(props: TooltipContentProps<TooltipValueType, string | number>) => (
                  <HistoryTooltip {...props} unit={unit} />
                )}
              />
              {unit === 'kcal' && history && (
                <ReferenceLine
                  y={history.dailyKcalTarget}
                  stroke="#d1d5db"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Limit',
                    position: 'right',
                    fontSize: 10,
                    fill: '#9ca3af',
                  }}
                />
              )}
              {activeCategories.map((cat, idx) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="a"
                  fill={CATEGORY_CHART_COLORS[cat]}
                  radius={
                    idx === activeCategories.length - 1 ? [2, 2, 0, 0] : undefined
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && chartData.length > 0 && chartData.every((d) =>
        ALL_CATEGORIES.every((c) => (d[c] as number) === 0),
      ) && (
        <div className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">
          Brak danych w wybranym zakresie
        </div>
      )}

      {/* Weight chart */}
      {!isLoading && weightChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Waga</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={weightChartData}
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
              {history?.targetWeightKg && (
                <ReferenceLine
                  y={history.targetWeightKg}
                  stroke="#22c55e"
                  strokeDasharray="6 4"
                  label={{
                    value: `Cel: ${history.targetWeightKg} kg`,
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
    </div>
  );
}
