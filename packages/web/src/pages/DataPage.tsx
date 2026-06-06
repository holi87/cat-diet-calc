import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiDownload, apiPost } from '../api/client';

type ImportResult = {
  imported: {
    cats: number;
    foods: number;
    feedEntries: number;
    weightEntries: number;
    dayNotes: number;
  };
};

type Status =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'exported' }
  | { kind: 'imported'; result: ImportResult['imported'] };

const TABLE_LABELS: Record<keyof ImportResult['imported'], string> = {
  cats: 'koty',
  foods: 'produkty',
  feedEntries: 'wpisy posiłków',
  weightEntries: 'pomiary wagi',
  dayNotes: 'notatki dnia',
};

export function DataPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleExport() {
    setStatus({ kind: 'idle' });
    setExporting(true);
    try {
      await apiDownload('/export/json', 'catcal-backup.json');
      setStatus({ kind: 'exported' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Eksport nie powiódł się' });
    } finally {
      setExporting(false);
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setStatus({ kind: 'idle' });
    setPendingFile(file);
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setImporting(true);
    setStatus({ kind: 'idle' });
    try {
      const text = await pendingFile.text();
      let envelope: unknown;
      try {
        envelope = JSON.parse(text);
      } catch {
        throw new Error('Plik nie jest poprawnym JSON-em');
      }
      const result = await apiPost<ImportResult>('/import/json', envelope);
      await qc.invalidateQueries();
      setStatus({ kind: 'imported', result: result.imported });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Import nie powiódł się' });
    } finally {
      setImporting(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleCancelImport() {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-4">💾 Dane</h2>

      {/* Export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Kopia zapasowa</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Pobierz wszystkie dane (koty, produkty, posiłki, wagę, notatki) jako plik JSON.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {exporting ? 'Pobieranie…' : '⬇️ Pobierz backup (.json)'}
        </button>
      </div>

      {/* Import */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Przywróć z backupu</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Wgraj plik JSON. <strong className="text-red-500">Zastąpi to wszystkie obecne dane.</strong>
        </p>

        {pendingFile ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Wybrano: <strong>{pendingFile.name}</strong>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
              To nieodwracalnie zastąpi wszystkie obecne dane danymi z pliku. Kontynuować?
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {importing ? 'Wgrywanie…' : 'Tak, zastąp dane'}
              </button>
              <button
                onClick={handleCancelImport}
                disabled={importing}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <label className="block w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-lg text-sm text-center cursor-pointer transition-colors">
            ⬆️ Wybierz plik backup
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFilePick}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Status messages */}
      {status.kind === 'exported' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
          ✓ Backup pobrany.
        </div>
      )}
      {status.kind === 'imported' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <div className="font-semibold mb-1">✓ Dane przywrócone</div>
          <ul className="space-y-0.5 text-xs">
            {(Object.keys(TABLE_LABELS) as Array<keyof ImportResult['imported']>).map((key) => (
              <li key={key}>
                {TABLE_LABELS[key]}: {status.result[key]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
          ✕ {status.message}
        </div>
      )}
    </div>
  );
}
