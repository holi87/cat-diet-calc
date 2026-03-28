import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { Cat } from '../types';

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CatsAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cats = [], isLoading } = useQuery<Cat[]>({
    queryKey: ['cats'],
    queryFn: () => apiGet<Cat[]>('/cats'),
  });

  const { mutate: createCat, isPending: creating } = useMutation({
    mutationFn: () =>
      apiPost('/cats', {
        name,
        dailyKcalTarget: parseInt(kcal),
        targetWeightKg: targetWeight ? parseFloat(targetWeight) : null,
        photo: photoBase64 ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      resetForm();
    },
  });

  const { mutate: updateCat, isPending: updating } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPut(`/cats/${editingCat!.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      resetForm();
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: (cat: Cat) => apiPut(`/cats/${cat.id}`, { active: !cat.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cats'] }),
  });

  const { mutate: deleteCat, isPending: deleting } = useMutation({
    mutationFn: (id: string) => apiDelete(`/cats/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      setConfirmDeleteId(null);
    },
  });

  function resetForm() {
    setEditingCat(null);
    setName('');
    setKcal('');
    setTargetWeight('');
    setPhotoPreview(null);
    setPhotoBase64(null);
    setShowForm(false);
  }

  function startEdit(cat: Cat) {
    setEditingCat(cat);
    setName(cat.name);
    setKcal(String(cat.dailyKcalTarget));
    setTargetWeight(cat.targetWeightKg ? String(parseFloat(cat.targetWeightKg)) : '');
    setPhotoPreview(cat.photo ?? null);
    setPhotoBase64(null); // Only set if user picks new photo
    setShowForm(true);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file, 256);
      setPhotoPreview(base64);
      setPhotoBase64(base64);
    } catch {
      // Ignore resize errors
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    setPhotoBase64('__remove__');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !kcal) return;
    if (editingCat) {
      const data: Record<string, unknown> = {
        name,
        dailyKcalTarget: parseInt(kcal),
        targetWeightKg: targetWeight ? parseFloat(targetWeight) : null,
      };
      if (photoBase64 === '__remove__') {
        data.photo = null;
      } else if (photoBase64) {
        data.photo = photoBase64;
      }
      updateCat(data);
    } else {
      createCat();
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold text-gray-700 dark:text-gray-200">🐱 Koty</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Dodaj kota
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            {editingCat ? 'Edytuj kota' : 'Nowy kot'}
          </h3>

          {/* Photo preview + upload */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Zdjęcie kota" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🐱</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-brand-600 cursor-pointer hover:text-brand-700">
                📷 {photoPreview ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-red-400 hover:text-red-500 text-left"
                >
                  Usuń zdjęcie
                </button>
              )}
            </div>
          </div>

          <input
            type="text"
            placeholder="Imię kota"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
          <input
            type="number"
            placeholder="Limit kcal/dzień"
            value={kcal}
            min={1}
            onChange={(e) => setKcal(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
          <input
            type="number"
            placeholder="Waga docelowa (kg) — opcjonalnie"
            value={targetWeight}
            min={0.1}
            step={0.01}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || !kcal || creating || updating}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm"
            >
              {editingCat ? 'Zapisz' : 'Dodaj'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-semibold py-2 rounded-lg text-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-6">Ładowanie...</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-2">🐱</div>
          <div className="text-base text-gray-500 dark:text-gray-400 font-medium mb-1">Brak kotów</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">Kliknij „+ Dodaj kota" aby dodać pierwszego pupila</div>
        </div>
      ) : (
        <div className="space-y-2">
          {cats.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 px-4 py-3">
              {confirmDeleteId === cat.id ? (
                /* Second confirmation step */
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-red-600 font-medium">
                    Na pewno usunąć <strong>{cat.name}</strong>?
                  </span>
                  <button
                    onClick={() => deleteCat(cat.id)}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {deleting ? '…' : 'Usuń'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                /* Normal row */
                <div className="flex items-center gap-3">
                  {/* Cat avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {cat.photo ? (
                      <img src={cat.photo} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">🐱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-100">{cat.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Limit: {cat.dailyKcalTarget} kcal/dzień
                      {cat.targetWeightKg && (
                        <span> · Cel: {parseFloat(cat.targetWeightKg)} kg</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      cat.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {cat.active ? 'aktywny' : 'nieaktywny'}
                  </button>
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-gray-400 hover:text-brand-500 transition-colors text-sm"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => { setConfirmDeleteId(cat.id); setShowForm(false); }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    title="Usuń kota"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
