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
  const initialLoadDone = useRef(false);

  const { data: note } = useQuery<DayNoteResponse>({
    queryKey: ['day-note', catId, date],
    queryFn: () => apiGet<DayNoteResponse>('/day-notes', { catId, date }),
    enabled: !!catId && !!date,
  });

  // Sync from server on load or when catId/date changes
  useEffect(() => {
    if (note !== undefined) {
      setText(note.content);
      initialLoadDone.current = true;
      setSaveStatus('idle');
    }
  }, [note]);

  const { mutate: saveNote } = useMutation({
    mutationFn: (content: string) => apiPut('/day-notes', { catId, date, content }),
    onSuccess: () => {
      setSaveStatus('saved');
      qc.invalidateQueries({ queryKey: ['day-note', catId, date] });
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
    setText(value);
    if (initialLoadDone.current) {
      debouncedSave(value);
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-500">Notatka</h2>
        {saveStatus === 'saving' && (
          <span className="text-[10px] text-gray-400">Zapisywanie...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[10px] text-green-500">Zapisano ✓</span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Notatka na dziś..."
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
      />
    </div>
  );
}
