# CatCal — Frontend (ekrany i UX)

## Zasady ogólne

- **Mobile-first** — główne użycie na iPhone w Safari
- **Język UI: polski**
- **Minimalistyczny design** — czytelne karty, duże przyciski dotykowe
- **Paleta kolorów:** stonowane odcienie (np. szary/biały z akcentem pomarańczowym lub zielonym — "koci" klimat)
- **Routing:** React Router v6, prostsze ścieżki:
  - `/` → Dzisiaj (główny ekran)
  - `/close-day` → Domknięcie dnia
  - `/admin/cats` → Zarządzanie kotami
  - `/admin/foods` → Zarządzanie produktami
  - `/weight` → Waga (Etap 2/3)

## Nawigacja

- **Dolny pasek** (mobile) z ikonami: 🏠 Dzisiaj | 🍽️ Kolacja | ⚙️ Admin
- Admin rozwija podmenu: Koty / Produkty
- Na desktopie: sidebar lub top nav (mniej ważne w MVP)

---

## Ekran 1: Dzisiaj (`/`)

### Główny ekran — codzienne użycie

**Góra ekranu:**
- Dropdown wyboru kota (jeśli >1 kot; domyślnie jedyny aktywny)
- Selector daty (domyślnie dziś, możliwość cofnięcia się)

**Kafelki podsumowania (3 karty w rzędzie):**

| Zjedzone | Limit | Zostało |
|----------|-------|---------|
| 145 kcal | 220 kcal | 75 kcal |

- "Zostało" na zielono gdy > 0, na czerwono gdy < 0
- Opcjonalnie: progress bar pod kafelkami

**Lista dzisiejszych wpisów:**

Każdy wpis jako karta/wiersz:
```
🟢 Karma mokra Animonda    35g    29.8 kcal    08:30
🔴 Królik surowy           40g    45.6 kcal    12:15
                                         [🗑️ Usuń]
```

- Ikona kategorii lub kolor (KIBBLE=szary, WET_FOOD=zielony, MEAT=czerwony, TREAT=pomarańczowy)
- Przycisk usunięcia (z potwierdzeniem)

**Formularz "Dodaj posiłek":**

- Dropdown z wyszukiwaniem: lista produktów (niezarchiwizowanych)
- Pole numeryczne: gramatura (g)
- Przycisk: **"Dodaj"**
- Po dodaniu: lista i kafelki odświeżają się automatycznie (React Query invalidation)

**Przycisk na dole:**
- **"Domknij dzień (kolacja) →"** — link do `/close-day`

---

## Ekran 2: Kolacja — Domknięcie dnia (`/close-day`)

### Cel: szybko policzyć ile karmy dać na kolację

**Góra ekranu — podsumowanie dnia (read-only):**

| Limit | Zjedzone | Zostało |
|-------|----------|---------|
| 220   | 145      | 75      |

**Sekcja "Dodatek na kolację":**

- Dropdown: wybór dodatku (filtrowane po kategorii MEAT, ale dostępne wszystkie)
- Pole numeryczne: gramatura dodatku (g)
- Wartości zmieniają się na żywo (bez klikania "oblicz")

**Wynik (obliczany na żywo / po kliknięciu):**

Panel wynikowy:
- Linia: `Kcal dodatku: XX.X`
- Linia: `Zostaje na karmę: XX.X kcal`
- **Główna wartość:** `Karma standardowa: XX g`

### Warianty wyniku i CTA

**Gdy karma > 0:**
```
┌──────────────────────────────────┐
│  Karma standardowa: 42 g        │
│                                  │
│  [🟢 Dodaj 42g karmy do dnia]   │
└──────────────────────────────────┘
```

**Gdy karma = 0:**
```
┌──────────────────────────────────┐
│  ✅ Dzień domknięty              │
│  Limit idealnie wykorzystany     │
└──────────────────────────────────┘
```

**Gdy karma < 0 (przekroczenie):**
```
┌──────────────────────────────────┐
│  ⚠️ Przekroczysz limit o 15 kcal │
│                                   │
│  [🔴 Dodaj mimo przekroczenia]   │
└──────────────────────────────────┘
```

### Po kliknięciu CTA:

1. Zapisuje wpis(y) feed_entry (POST `/api/feed-entries` lub `/api/close-day/commit`)
2. Przycisk znika
3. Pokazuje: **"✅ Dodane. Dzień domknięty."** (lub info o przekroczeniu)
4. Podsumowanie dnia odświeża się

### Tryb ręczny

Zawsze widoczny pod wynikiem:
- Pole: gramatura karmy (ręcznie)
- Przycisk: "Dodaj ręcznie"

---

## Ekran 3: Admin — Koty (`/admin/cats`)

- Lista kotów (imię, limit kcal, status aktywny/zarchiwizowany)
- Przycisk "Dodaj kota"
- Edycja inline lub modal: zmiana nazwy, limitu kcal
- Toggle: aktywny / nieaktywny

**Formularz dodawania/edycji:**
- Imię kota (text)
- Limit dzienny kcal (number)
- Aktywny (checkbox)

---

## Ekran 4: Admin — Produkty (`/admin/foods`)

### Główna tabela/lista produktów

Dla każdego produktu:
```
Karma mokra Animonda    WET_FOOD    85 kcal/100g    [Edytuj] [Archiwizuj]
Królik surowy           MEAT        114 kcal/100g   [Edytuj] [Archiwizuj]
```

- Filtrowanie po kategorii (tabs lub dropdown: Wszystkie / Karma / Mięso / Przysmak)
- Toggle: pokaż/ukryj zarchiwizowane

**Formularz dodawania/edycji:**
- Nazwa (text)
- Kategoria (select: KIBBLE / WET_FOOD / MEAT / TREAT)
- kcal / 100g (number, krok 0.1)

---

## Ekran 5: Waga (`/weight`) — Etap 2/3

- Formularz: data + waga (kg, krok 0.01)
- Historia pomiarów (lista)
- Etap 3: wykres trendu

---

## Komponenty współdzielone

### `<Layout>`
- Top bar z nazwą aplikacji + ikona kota
- Bottom navigation (mobile)
- Container z max-width

### `<DaySummaryCard>`
- Props: totalKcal, dailyKcalTarget, remainingKcal
- 3 kafelki w rzędzie

### `<FeedEntryList>`
- Props: entries[]
- Renderuje listę wpisów z przyciskiem usunięcia

### `<AddMealForm>`
- Props: foods[], onSubmit(foodId, grams)
- Dropdown (searchable) + input + button

### `<CloseDayCalc>`
- Logika obliczenia na żywo
- Warianty CTA (zielony/czerwony/zamknięty)

### `<FoodSelect>`
- Searchable dropdown z listą produktów
- Pokazuje kategorię i kcal/100g obok nazwy

---

## Komunikacja z API

Wrapper w `src/api/client.ts`:

```typescript
const API_BASE = '/api'; // względna ścieżka — zero CORS

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// analogicznie: apiPut, apiDelete
```

### React Query — klucze cache

```
['cats']
['foods', { category, archived }]
['day-summary', catId, date]
['weight-entries', catId]
```

Invalidation po mutacji: np. po dodaniu feed_entry → invalidate `['day-summary', catId, date]`.
