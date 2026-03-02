import { FeedEntry, FoodCategory } from '../types';

const categoryColor: Record<FoodCategory, string> = {
  BASE: 'bg-green-500',
  KIBBLE: 'bg-amber-700',
  WET_FOOD: 'bg-blue-500',
  MEAT: 'bg-red-500',
  TREAT: 'bg-orange-400',
};

const categoryLabel: Record<FoodCategory, string> = {
  BASE: 'Baza',
  KIBBLE: 'Karma',
  WET_FOOD: 'Mokra',
  MEAT: 'Mięso',
  TREAT: 'Przysmak',
};

interface FeedEntryListProps {
  entries: FeedEntry[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

// ── Display-item types ──────────────────────────────────────────────────────
type SingleItem = { type: 'single'; entry: FeedEntry };
type DinnerItem = { type: 'dinner'; entries: FeedEntry[] };
type DisplayItem = SingleItem | DinnerItem;

function groupEntries(entries: FeedEntry[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let i = 0;
  while (i < entries.length) {
    if (entries[i].note?.startsWith('kolacja:')) {
      const dinnerEntries: FeedEntry[] = [];
      while (i < entries.length && entries[i].note?.startsWith('kolacja:')) {
        dinnerEntries.push(entries[i]);
        i++;
      }
      items.push({ type: 'dinner', entries: dinnerEntries });
    } else {
      items.push({ type: 'single', entry: entries[i] });
      i++;
    }
  }
  return items;
}

// ── Dinner card ─────────────────────────────────────────────────────────────
function DinnerCard({
  entries,
  onDelete,
  isDeleting,
}: {
  entries: FeedEntry[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}) {
  const meatEntry = entries.find((e) => e.note === 'kolacja:mięso');
  const kibbleEntry = entries.find((e) => e.note === 'kolacja:karma');
  const totalKcal =
    Math.round(
      entries.reduce((sum, e) => sum + parseFloat(e.kcalCalculated), 0) * 10,
    ) / 10;
  const time = new Date(entries[0].datetime).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-orange-50 rounded-xl border border-orange-100 shadow-sm px-4 py-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-orange-400" />
        <span className="font-semibold text-orange-800 text-sm flex-1">🍽️ Kolacja</span>
        <span className="text-xs text-gray-400">{time}</span>
        <span className="text-sm font-semibold text-orange-700">{totalKcal} kcal</span>
      </div>

      {/* Breakdown */}
      <div className="space-y-1 pl-4">
        {meatEntry && (
          <div className="text-xs text-gray-600 flex items-center justify-between">
            <span>
              <span className="mr-1">🥩</span>
              {meatEntry.foodName ?? 'Dodatek'}: {parseFloat(meatEntry.grams)}g
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{parseFloat(meatEntry.kcalCalculated)} kcal</span>
              <button
                onClick={() => {
                  if (window.confirm('Usunąć dodatek z kolacji?')) onDelete(meatEntry.id);
                }}
                disabled={isDeleting}
                className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none disabled:opacity-50"
                title="Usuń dodatek"
              >
                🗑️
              </button>
            </div>
          </div>
        )}
        {kibbleEntry && (
          <div className="text-xs text-gray-600 flex items-center justify-between">
            <span>
              <span className="mr-1">🟡</span>
              {kibbleEntry.foodName ?? 'Karma'}: {parseFloat(kibbleEntry.grams)}g
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{parseFloat(kibbleEntry.kcalCalculated)} kcal</span>
              <button
                onClick={() => {
                  if (window.confirm('Usunąć karmę z kolacji?')) onDelete(kibbleEntry.id);
                }}
                disabled={isDeleting}
                className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none disabled:opacity-50"
                title="Usuń karmę"
              >
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main list ────────────────────────────────────────────────────────────────
export function FeedEntryList({ entries, onDelete, isDeleting }: FeedEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        Brak posiłków. Dodaj pierwszy!
      </div>
    );
  }

  const items = groupEntries(entries);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        if (item.type === 'dinner') {
          return (
            <DinnerCard
              key={`dinner-${idx}`}
              entries={item.entries}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          );
        }

        const entry = item.entry;
        const category = (entry.foodCategory ?? 'KIBBLE') as FoodCategory;
        const time = new Date(entry.datetime).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={entry.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${categoryColor[category]}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">
                {entry.foodName ?? 'Nieznany produkt'}
              </div>
              <div className="text-xs text-gray-400">
                {categoryLabel[category]} · {time}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-gray-700">{parseFloat(entry.grams)}g</div>
              <div className="text-xs text-gray-400">{parseFloat(entry.kcalCalculated)} kcal</div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Usunąć ten wpis?')) onDelete(entry.id);
              }}
              disabled={isDeleting}
              className="ml-1 text-gray-300 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-50"
              title="Usuń"
            >
              🗑️
            </button>
          </div>
        );
      })}
    </div>
  );
}
