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
  const baseFoods = activeFoods.filter((f) => f.category === 'BASE');
  const nonBaseFoods = activeFoods.filter((f) => f.category !== 'BASE');

  // --- Auto-calc mode state ---
  const [meatFoodId, setMeatFoodId] = useState('');
  const [meatGrams, setMeatGrams] = useState('');
  const [kibbleFoodId, setKibbleFoodId] = useState('');
  const [committed, setCommitted] = useState(false);
  const [calcResult, setCalcResult] = useState<CloseDayResult | null>(null);

  // Auto-select first BASE food when foods load
  useEffect(() => {
    if (!kibbleFoodId && baseFoods.length > 0) {
      setKibbleFoodId(baseFoods[0].id);
    }
  }, [baseFoods.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Manual mode state ---
  const [manualMeatFoodId, setManualMeatFoodId] = useState('');
  const [manualMeatGrams, setManualMeatGrams] = useState('');
  const [manualKibbleGrams, setManualKibbleGrams] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Recalculate on the fly (auto-calc mode)
  const { mutate: calculate } = useMutation({
    mutationFn: () =>
      apiPost<CloseDayResult>('/close-day', {
        catId,
        date,
        ...(meatFoodId ? { meatFoodId } : {}),
        meatGrams: parseFloat(meatGrams) || 0,
        ...(kibbleFoodId ? { kibbleFoodId } : {}),
      }),
    onSuccess: setCalcResult,
  });

  useEffect(() => {
    calculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meatFoodId, meatGrams, kibbleFoodId]);

  // Auto-calc commit
  const { mutate: commit, isPending: committing } = useMutation({
    mutationFn: () =>
      apiPost<CloseDayResult>('/close-day/commit', {
        catId,
        date,
        ...(meatFoodId ? { meatFoodId } : {}),
        meatGrams: parseFloat(meatGrams) || 0,
        ...(kibbleFoodId ? { kibbleFoodId } : {}),
      }),
    onSuccess: (res) => {
      setCommitted(true);
      setCalcResult(res);
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
    },
  });

  // Manual dinner add
  const hasValidManualMeat =
    !manualMeatFoodId || parseFloat(manualMeatGrams) > 0;
  const hasAnyManualEntry =
    parseFloat(manualKibbleGrams) > 0 ||
    (!!manualMeatFoodId && parseFloat(manualMeatGrams) > 0);
  const canSubmitManual = hasValidManualMeat && hasAnyManualEntry;

  const { mutate: addManual, isPending: addingManual } = useMutation({
    mutationFn: async () => {
      setManualError(null);
      const now = new Date();
      const dinnerDatetime = now.toISOString();
      const kibbleDatetime = new Date(now.getTime() + 60000).toISOString();

      if (manualMeatFoodId && parseFloat(manualMeatGrams) > 0) {
        await apiPost('/feed-entries', {
          catId,
          foodId: manualMeatFoodId,
          grams: parseFloat(manualMeatGrams),
          note: 'kolacja:mięso',
          datetime: dinnerDatetime,
        });
      }

      const kibbleGrams = parseFloat(manualKibbleGrams);
      if (kibbleGrams > 0) {
        const kibble = baseFoods[0] ?? foods.find((f) => f.category === 'KIBBLE' && !f.archived);
        if (!kibble) throw new Error('Brak produktu karma bazowa w bazie');
        await apiPost('/feed-entries', {
          catId,
          foodId: kibble.id,
          grams: kibbleGrams,
          note: 'kolacja:karma',
          datetime: kibbleDatetime,
        });
      }
    },
    onSuccess: () => {
      setManualKibbleGrams('');
      setManualMeatFoodId('');
      setManualMeatGrams('');
      setManualError(null);
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
    },
    onError: (err) => {
      setManualError(
        err instanceof Error ? err.message : 'Błąd dodawania kolacji',
      );
    },
  });

  const r = calcResult;

  return (
    <div className="space-y-4">
      {/* Meat selector (auto-calc mode) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">Dodatek na kolację</h3>
        <select
          value={meatFoodId}
          onChange={(e) => setMeatFoodId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">— brak dodatku —</option>
          {nonBaseFoods.map((f) => (
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
            min={0.1}
            step={0.1}
            onChange={(e) => setMeatGrams(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}

        {/* Kibble (BASE) food selector — shown only if multiple BASE foods exist */}
        {baseFoods.length > 1 && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Karma bazowa</label>
            <select
              value={kibbleFoodId}
              onChange={(e) => setKibbleFoodId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {baseFoods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.kcalPer100g} kcal/100g)
                </option>
              ))}
            </select>
          </div>
        )}

        {baseFoods.length === 0 && (
          <p className="text-xs text-red-500">
            ⚠️ Brak produktu z kategorią „Karma bazowa" w bazie. Dodaj go w Adminie → Produkty.
          </p>
        )}
      </div>

      {/* Auto-calc result panel */}
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

      {/* Manual dinner mode */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500">Tryb ręczny (kolacja)</h3>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Dodatek (opcjonalnie)</label>
          <select
            value={manualMeatFoodId}
            onChange={(e) => setManualMeatFoodId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">— brak dodatku —</option>
            {nonBaseFoods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.kcalPer100g} kcal/100g)
              </option>
            ))}
          </select>
          {manualMeatFoodId && (
            <input
              type="number"
              placeholder="Gramatura dodatku (g)"
              value={manualMeatGrams}
              min={0.1}
              step={0.1}
              onChange={(e) => setManualMeatGrams(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Karma standardowa (g)"
            value={manualKibbleGrams}
            min={0.1}
            step={0.1}
            onChange={(e) => setManualKibbleGrams(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={() => addManual()}
            disabled={!canSubmitManual || addingManual}
            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {addingManual ? '…' : 'Dodaj'}
          </button>
        </div>

        {manualError && (
          <p className="text-xs text-red-500">{manualError}</p>
        )}
      </div>
    </div>
  );
}
