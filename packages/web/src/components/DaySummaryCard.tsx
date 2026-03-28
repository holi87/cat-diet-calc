interface DaySummaryCardProps {
  totalKcal: number;
  dailyKcalTarget: number;
  remainingKcal: number;
}

export function DaySummaryCard({ totalKcal, dailyKcalTarget, remainingKcal }: DaySummaryCardProps) {
  const progress = Math.min(100, Math.round((totalKcal / dailyKcalTarget) * 100));
  const isOver = remainingKcal < 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-4 mb-4">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Zjedzone</div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalKcal}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">kcal</div>
        </div>
        <div className="text-center border-x border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Limit</div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{dailyKcalTarget}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">kcal</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Zostało</div>
          <div className={`text-xl font-bold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
            {remainingKcal}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">kcal</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-400' : 'bg-brand-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-500 mt-1 text-center">
          Przekroczono limit o {Math.abs(remainingKcal)} kcal
        </p>
      )}
    </div>
  );
}
