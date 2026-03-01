import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api/client';
import { Food, DaySummary, CloseDayResult } from '../types';

interface CloseDayCalcProps {
  catId: string;
  date: string;
  summary: DaySummary;
}

export function CloseDayCalc({ catId, date }: CloseDayCalcProps) {
  const qc = useQueryClient();

  const { data: foods = [] } = useQuery<Food[]>({
    queryKey: ['foods', { archived: false }],
    queryFn: () => apiGet<Food[]>('/foods'),
  });

  const activeFoods = foods.filter((f) => !f.archived);

  const [meatFoodId, setMeatFoodId] = useState('');
  const [meatGrams, setMeatGrams] = useState('');
  const [manualGrams, setManualGrams] = useState('');
  const [committed, setCommitted] = useState(false);
  const [calcResult, setCalcResult] = useState<CloseDayResult | null>(null);

  // Recalculate on the fly
  const { mutate: calculate } = useMutation({
    mutationFn: () =>
      apiPost<CloseDayResult>('/close-day', {
        catId,
        date,
        ...(meatFoodId ? { meatFoodId } : {}),
        meatGrams: parseFloat(meatGrams) || 0,
      }),
    onSuccess: setCalcResult,
  });

  useEffect(() => {
    calculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meatFoodId, meatGrams]);

  const { mutate: commit, isPending: committing } = useMutation({
    mutationFn: () =>
      apiPost<CloseDayResult>('/close-day/commit', {
        catId,
        date,
        ...(meatFoodId ? { meatFoodId } : {}),
        meatGrams: parseFloat(meatGrams) || 0,
      }),
    onSuccess: (res) => {
      setCommitted(true);
      setCalcResult(res);
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
    },
  });

  const { mutate: addManual, isPending: addingManual } = useMutation({
    mutationFn: () => {
      const kibble = foods.find((f) => f.category === 'KIBBLE' && !f.archived);
      if (!kibble) throw new Error('Brak karmy w bazie');
      return apiPost('/feed-entries', {
        catId,
        foodId: kibble.id,
        grams: parseFloat(manualGrams),
      });
    },
    onSuccess: () => {
      setManualGrams('');
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
    },
  });

  const r = calcResult;

  return (
    <div className="space-y-4">
      {/* Meat selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">Dodatek na kolację</h3>
        <select
          value={meatFoodId}
          onChange={(e) => setMeatFoodId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">— brak dodatku —</option>
          {activeFoods.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.kcalPer100g} kcal/100g)
            </option>
          ))}
        </select>
        {meatFoodId && (
          <input
            type="number"
            placeholder="Gramatura dodatku (g)"
            value={meatGrams}
            min={0}
            step={1}
            onChange={(e) => setMeatGrams(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}
      </div>

      {/* Result panel */}
      {r && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="text-sm text-gray-500 flex justify-between">
            <span>Kcal dodatku:</span>
            <span className="font-medium text-gray-700">{r.kcalMeat} kcal</span>
          </div>
          <div className="text-sm text-gray-500 flex justify-between">
            <span>Zostaje na karmę:</span>
            <span className="font-medium text-gray-700">{r.kcalLeftForKibble} kcal</span>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2">
            {committed ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-1">✅</div>
                <div className="font-semibold text-green-600">Dodane. Dzień domknięty!</div>
                {r.overLimitKcal > 0 && (
                  <div className="text-xs text-orange-500 mt-1">
                    Przekroczono limit o {r.overLimitKcal} kcal
                  </div>
                )}
              </div>
            ) : r.kibbleGrams <= 0 && r.overLimitKcal === 0 ? (
              <div className="text-center py-2">
                <div className="text-2xl mb-1">✅</div>
                <div className="font-semibold text-green-600">Dzień domknięty</div>
                <div className="text-xs text-gray-400">Limit idealnie wykorzystany</div>
              </div>
            ) : r.overLimitKcal > 0 ? (
              <>
                <div className="text-center mb-3">
                  <div className="text-sm font-medium text-orange-600">
                    ⚠️ Przekroczysz limit o {r.overLimitKcal} kcal
                  </div>
                </div>
                <button
                  onClick={() => commit()}
                  disabled={committing}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  🔴 Dodaj mimo przekroczenia
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-3">
                  <div className="text-xs text-gray-500">Karma standardowa:</div>
                  <div className="text-3xl font-bold text-brand-600">{r.kibbleGrams} g</div>
                </div>
                <button
                  onClick={() => commit()}
                  disabled={committing}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  🟢 Dodaj {r.kibbleGrams}g karmy do dnia
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manual mode */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-500">Tryb ręczny (karma)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Gramatura karmy (g)"
            value={manualGrams}
            min={1}
            step={1}
            onChange={(e) => setManualGrams(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={() => addManual()}
            disabled={!manualGrams || parseFloat(manualGrams) <= 0 || addingManual}
            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Dodaj ręcznie
          </button>
        </div>
      </div>
    </div>
  );
}
