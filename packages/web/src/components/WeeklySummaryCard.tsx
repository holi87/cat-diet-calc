import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import { DailyHistoryResponse } from '../types';

interface WeeklySummaryCardProps {
  catId: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function WeeklySummaryCard({ catId }: WeeklySummaryCardProps) {
  const from = daysAgo(7);
  const to = todayStr();
  const prevFrom = daysAgo(14);
  const prevTo = daysAgo(8);

  const { data: thisWeek } = useQuery<DailyHistoryResponse>({
    queryKey: ['history', catId, from, to],
    queryFn: () => apiGet<DailyHistoryResponse>('/history/daily', { catId, from, to }),
    enabled: !!catId,
    staleTime: 60_000,
  });

  const { data: prevWeek } = useQuery<DailyHistoryResponse>({
    queryKey: ['history', catId, prevFrom, prevTo],
    queryFn: () => apiGet<DailyHistoryResponse>('/history/daily', { catId, from: prevFrom, to: prevTo }),
    enabled: !!catId,
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!thisWeek) return null;

    const daysWithData = thisWeek.days.filter((d) => d.totalKcal > 0);
    const avgKcal =
      daysWithData.length > 0
        ? Math.round(daysWithData.reduce((s, d) => s + d.totalKcal, 0) / daysWithData.length)
        : 0;
    const overDays = daysWithData.filter(
      (d) => d.totalKcal > thisWeek.dailyKcalTarget,
    ).length;

    let prevAvg: number | null = null;
    if (prevWeek) {
      const prevDaysWithData = prevWeek.days.filter((d) => d.totalKcal > 0);
      if (prevDaysWithData.length > 0) {
        prevAvg = Math.round(
          prevDaysWithData.reduce((s, d) => s + d.totalKcal, 0) / prevDaysWithData.length,
        );
      }
    }

    let trend: 'up' | 'down' | 'same' | null = null;
    if (prevAvg !== null && avgKcal > 0) {
      const diff = avgKcal - prevAvg;
      if (Math.abs(diff) < 5) trend = 'same';
      else trend = diff > 0 ? 'up' : 'down';
    }

    return { avgKcal, overDays, daysCount: daysWithData.length, trend, prevAvg };
  }, [thisWeek, prevWeek]);

  if (!stats || stats.daysCount === 0) return null;

  const trendIcon =
    stats.trend === 'up'
      ? '📈'
      : stats.trend === 'down'
        ? '📉'
        : stats.trend === 'same'
          ? '➡️'
          : '';

  const trendLabel =
    stats.trend === 'up'
      ? 'Wzrost'
      : stats.trend === 'down'
        ? 'Spadek'
        : stats.trend === 'same'
          ? 'Stabilnie'
          : '';

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
      <h3 className="text-xs font-semibold text-gray-400 mb-2">Ostatnie 7 dni</h3>
      <div className="flex items-center justify-between gap-3">
        {/* Average kcal */}
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-gray-800">{stats.avgKcal}</div>
          <div className="text-[10px] text-gray-400">śr. kcal/dzień</div>
        </div>

        {/* Days over limit */}
        <div className="text-center flex-1">
          <div
            className={`text-lg font-bold ${
              stats.overDays > 0 ? 'text-red-500' : 'text-green-600'
            }`}
          >
            {stats.overDays}/{stats.daysCount}
          </div>
          <div className="text-[10px] text-gray-400">ponad limit</div>
        </div>

        {/* Trend */}
        {stats.trend && (
          <div className="text-center flex-1">
            <div className="text-lg">{trendIcon}</div>
            <div className="text-[10px] text-gray-400">{trendLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
