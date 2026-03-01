interface DaySummaryCardProps {
  totalKcal: number;
  dailyKcalTarget: number;
  remainingKcal: number;
}

export function DaySummaryCard({ totalKcal, dailyKcalTarget, remainingKcal }: DaySummaryCardProps) {
  const progress = Math.min(100, Math.round((totalKcal / dailyKcalTarget) * 100));
  const isOver = remainingKcal < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Zjedzone</div>
          <div className="text-xl font-bold text-gray-800">{totalKcal}</div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
        <div className="text-center border-x border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Limit</div>
          <div className="text-xl font-bold text-gray-800">{dailyKcalTarget}</div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Zostało</div>
          <div className={`text-xl font-bold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
            {remainingKcal}
          </div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
