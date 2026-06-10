import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api/client';
import { Food, DaySummary, CloseDayResult } from '../types';
import { DecimalInput } from './DecimalInput';
import { useDebouncedValue } from '../lib/useDebouncedValue';

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
  // Close-day liczy gramy karmy → sztukowe produkty pomijamy
  const baseFoods = activeFoods.filter((f) => f.category === 'BASE' && f.unit !== 'PIECE');
  const nonBaseFoods = activeFoods.filter((f) => f.category !== 'BASE' && f.unit !== 'PIECE');

  // --- Auto-calc mode state ---
  const [meatFoodId, setMeatFoodId] = useState('');
  const [meatGrams, setMeatGrams] = useState('');
  const [kibbleFoodId, setKibbleFoodId] = useState('');
  const [committed, setCommitted] = useState(false);
  const [commitResult, setCommitResult] = useState<CloseDayResult | null>(null);

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

  // Recalculate on the fly (auto-calc mode). useQuery instead of a mutation:
  // React Query keys the request by its inputs, so a slow stale response can
  // never overwrite a newer result; debounce keeps typing from spamming the API.
  const debouncedMeatGrams = useDebouncedValue(meatGrams, 300);
  const { data: calcData } = useQuery<CloseDayResult>({
    queryKey: ['close-day-calc', catId, date, meatFoodId, debouncedMeatGrams, kibbleFoodId],
    queryFn: () =>
      apiPost<CloseDayResult>('/close-day', {
        catId,
        date,
        ...(meatFoodId ? { meatFoodId } : {}),
        meatGrams: parseFloat(debouncedMeatGrams) || 0,
        ...(kibbleFoodId ? { kibbleFoodId } : {}),
      }),
    enabled: !!catId,
  });

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
      setCommitResult(res);
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });

  // Manual dinner add
  const hasValidManualMeat =
    !manualMeatFoodId || parseFloat(manualMeatGrams) > 0;
  const hasAnyManualEntry =
    parseFloat(manualKibbleGrams) > 0 ||
    (!!manualMeatFoodId && parseFloat(manualMeatGrams) > 0);
  const canSubmitManual = hasValidManualMeat && hasAnyManualEntry;

  // One transactional request — a network failure can no longer leave a
  // half-saved dinner (meat without kibble).
  const { mutate: addManual, isPending: addingManual } = useMutation({
    mutationFn: () => {
      setManualError(null);
      const hasMeat = manualMeatFoodId && parseFloat(manualMeatGrams) > 0;
      return apiPost<CloseDayResult>('/close-day/commit', {
        catId,
        date,
        ...(hasMeat ? { meatFoodId: manualMeatFoodId, meatGrams: parseFloat(manualMeatGrams) } : {}),
        ...(kibbleFoodId ? { kibbleFoodId } : {}),
        kibbleGrams: parseFloat(manualKibbleGrams) || 0,
      });
    },
    onSuccess: () => {
      setManualKibbleGrams('');
      setManualMeatFoodId('');
      setManualMeatGrams('');
      setManualError(null);
      qc.invalidateQueries({ queryKey: ['day-summary', catId, date] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (err) => {
      setManualError(
        err instanceof Error ? err.message : 'Błąd dodawania kolacji',
      );
    },
  });

  const r = committed && commitResult ? commitResult : (calcData ?? null);

  return (
    <div className="space-y-4">
      {/* Auto-calc mode */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/40 shadow-sm dark:shadow-gray-900/30 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">Automatyczna kolacja</h3>
        </div>
        <select
          value={meatFoodId}
          onChange={(e) => setMeatFoodId(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
        >
          <option value="">— brak dodatku —</option>
          {nonBaseFoods.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.kcalPer100g} kcal/100g)
            </option>
          ))}
        </select>
        {meatFoodId && (
          <DecimalInput
            placeholder="Gramatura dodatku (g)"
            value={meatGrams}
            onValueChange={setMeatGrams}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
        )}

        {/* Kibble (BASE) food selector — shown only if multiple BASE foods exist */}
        {baseFoods.length > 1 && (
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Karma bazowa</label>
            <select
              value={kibbleFoodId}
              onChange={(e) => setKibbleFoodId(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>Kcal dodatku:</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{r.kcalMeat} kcal</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>Zostaje na karmę:</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{r.kcalLeftForKibble} kcal</span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
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
                <div className="text-xs text-gray-400 dark:text-gray-500">Limit idealnie wykorzystany</div>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Karma standardowa:</div>
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

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">lub</span>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      </div>

      {/* Manual dinner mode */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40 shadow-sm dark:shadow-gray-900/30 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Ręczna kolacja</h3>
        </div>

        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Dodatek (opcjonalnie)</label>
          <select
            value={manualMeatFoodId}
            onChange={(e) => setManualMeatFoodId(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          >
            <option value="">— brak dodatku —</option>
            {nonBaseFoods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.kcalPer100g} kcal/100g)
              </option>
            ))}
          </select>
          {manualMeatFoodId && (
            <DecimalInput
              placeholder="Gramatura dodatku (g)"
              value={manualMeatGrams}
              onValueChange={setManualMeatGrams}
              className="mt-2 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
            />
          )}
        </div>

        <div className="flex gap-2">
          <DecimalInput
            placeholder="Karma standardowa (g)"
            value={manualKibbleGrams}
            onValueChange={setManualKibbleGrams}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
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
