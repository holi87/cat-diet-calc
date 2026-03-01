import { FeedEntry, FoodCategory } from '../types';

const categoryColor: Record<FoodCategory, string> = {
  KIBBLE: 'bg-gray-400',
  WET_FOOD: 'bg-green-500',
  MEAT: 'bg-red-500',
  TREAT: 'bg-orange-400',
};

const categoryLabel: Record<FoodCategory, string> = {
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

export function FeedEntryList({ entries, onDelete, isDeleting }: FeedEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        Brak posiłków. Dodaj pierwszy!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
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
