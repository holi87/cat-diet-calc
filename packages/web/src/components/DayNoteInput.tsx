import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../api/client';

interface DayNoteResponse {
  catId: string;
  date: string;
  content: string;
}

interface DayNoteInputProps {
  catId: string;
  date: string;
}

export function DayNoteInput({ catId, date }: DayNoteInputProps) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `text` so effects can read the current value without re-running on
  // every keystroke; null lastSynced = note for this cat/day not loaded yet
  const textRef = useRef('');
  const lastSynced = useRef<string | null>(null);

  const setTextBoth = (value: string) => {
    textRef.current = value;
    setText(value);
  };

  // Reset for the new cat/day; the cleanup also kills a pending debounce so a
  // half-typed note cannot be saved under the new key
  useEffect(() => {
    lastSynced.current = null;
    setTextBoth('');
    setSaveStatus('idle');
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [catId, date]);

  const { data: note } = useQuery<DayNoteResponse>({
    queryKey: ['day-note', catId, date],
    queryFn: () => apiGet<DayNoteResponse>('/day-notes', { catId, date }),
    enabled: !!catId && !!date,
  });

  // Sync from the server, but never overwrite unsaved edits — a background
  // refetch must not revert characters typed while it was in flight
  useEffect(() => {
    if (note === undefined) return;
    const hasUnsavedEdits =
      lastSynced.current !== null && textRef.current !== lastSynced.current;
    if (!hasUnsavedEdits) {
      setTextBoth(note.content);
      setSaveStatus('idle');
    }
    lastSynced.current = note.content;
  }, [note]);

  const { mutate: saveNote } = useMutation({
    mutationFn: (content: string) => apiPut('/day-notes', { catId, date, content }),
    onSuccess: (_data, content) => {
      setSaveStatus('saved');
      lastSynced.current = content;
      // Update the cache directly — an invalidate-triggered refetch used to
      // overwrite the textarea mid-typing
      qc.setQueryData<DayNoteResponse>(['day-note', catId, date], { catId, date, content });
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('idle');
    },
  });

  const debouncedSave = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveStatus('idle');
      timerRef.current = setTimeout(() => {
        setSaveStatus('saving');
        saveNote(value);
      }, 1000);
    },
    [saveNote],
  );

  function handleChange(value: string) {
    setTextBoth(value);
    if (lastSynced.current !== null) {
      debouncedSave(value);
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Notatka</h2>
        {saveStatus === 'saving' && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Zapisuję...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-600 font-medium">✓ Zapisano</span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Notatka na dziś..."
        rows={2}
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 resize-none"
      />
    </div>
  );
}
