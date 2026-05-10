# PetCal — plan migracji z PWA na natywną apkę iOS

> Status: **analiza + plan**. Implementacja w osobnym repo (`pet-cal-ios`), poza
> tym repozytorium. Ten dokument jest ostatecznym briefem dla devel iOS — z
> niego startuje praca w nowym projekcie Xcode.

## 1. Cel zmiany

CatCal w obecnej formie:
- PWA pod `cat.sh.info.pl`, monorepo Fastify+Postgres+React,
- działa, ale wymaga utrzymywania serwera (VPS, Docker, Traefik, backup),
- jest „o kocie" — nazwa, copy, ikonografia.

Cel:
1. **Natywna apka iOS** — wydajna, instalowana z TestFlight/App Store, działa
   offline, baza w aplikacji (SwiftData / SQLite), brak zewnętrznego backendu.
2. **Uniwersalność na zwierzaki** — nie tylko kot. Pies, fretka, gryzoń,
   królik, papuga (kcal/dzień różny, ale model identyczny). Apka pilnuje
   diety zwierzaka, niezależnie od gatunku.
3. **Bazowe słowniki produktów** — preset surowego mięsa, podrobów, ryb, jaj,
   warzyw (dla psów), karm dostępnych w PL — żeby user nie wbijał ręcznie 30
   pozycji na start.
4. **Dwujęzyczność PL/EN** — pełna lokalizacja UI + lokalizowane nazwy
   produktów ze słownika.

## 2. Rebranding

Aktualna nazwa „CatCal" + ikona kota wykluczają psy/inne. Propozycje:

| Nazwa | Plus | Minus |
|---|---|---|
| **PetCal** | krótko, opisowo, międzynarodowo, App Store-friendly | dość ogólna |
| **PetMeals** | jasno o jedzeniu | dłuższa |
| **FeedTrack** | trochę „technicznie" | mniej osobiste |
| **DietaPupila** | polski klimat | tylko PL — globalnie kuleje |
| **Mysza** | osobiste (od kotki Myszy) | tylko dla siebie, nie do AppStore |

Rekomendacja domyślna: **PetCal** (bundle ID `pl.holak.petcal`,
display name lokalizowany: „PetCal" globalnie, „PetCal — dieta zwierzaka" w
PL store-listing).

Nazwa robocza w tym dokumencie: **PetCal**.

## 3. Stack i architektura

### 3.1 Język + framework

- **Swift 5.9+ / 6**, **SwiftUI** (deklaratywne UI, jeden codebase iPhone+iPad+Watch).
- Minimum target: **iOS 17.0** — odblokowuje SwiftData, Charts ulepszenia,
  Observation, TipKit. Wyklucza iPhone X i starsze (iPhone Xs/2018 i nowsze
  działają — to akceptowalne dla prywatnej apki).
- Alternatywa, jeśli iOS 17 to za dużo: iOS 16 + **GRDB.swift** (SQLite wrapper)
  zamiast SwiftData. Reszta stacku ta sama.

### 3.2 Persystencja

**Domyślnie: SwiftData** (iOS 17+).
- Modele jako `@Model` Swift class. Migracje przez `Schema` + `VersionedSchema`.
- Storage: SQLite pod spodem, zarządzany przez framework.
- Synchronizacja iCloud: `ModelConfiguration(cloudKitDatabase: .private(...))`
  — jedna flaga, sync między iPhone usera + iPad usera + Mac za darmo.

**Fallback: GRDB.swift + SQLite** (iOS 13+) jeśli SwiftData okaże się
niestabilne lub potrzebny niższy target.

### 3.3 Pozostałe komponenty

| Obszar | Wybór |
|---|---|
| Wykresy | Apple **Charts** (iOS 16+) — zamiennik Recharts, natywny |
| Routing | NavigationStack + TabView (SwiftUI) |
| State | `@Observable` + `@Environment` (iOS 17), bez Redux |
| Formularze | natywne `Form` + `TextField` + `DatePicker` |
| Powiadomienia | UserNotifications + `BackgroundTasks` (przypomnienia) |
| Aparat | `PhotosPicker` + `VisionKit` (DataScanner do barcode) |
| Localization | **String Catalog** (`Localizable.xcstrings`, Xcode 15+) |
| Testowanie | XCTest + ViewInspector lub snapshot testing |

### 3.4 Architektura

MVVM-light: każdy ekran ma `View` + `@Observable ViewModel`. ViewModel trzyma
logikę (filtrowanie, agregacje), View tylko renderuje. Repository layer
(`PetRepository`, `FoodRepository`) opakowuje SwiftData — żeby testy używały
in-memory store.

```
PetCalApp
├─ App/
│   └─ PetCalApp.swift         (entry, ModelContainer setup)
├─ Models/                     (SwiftData @Model)
│   ├─ Pet.swift
│   ├─ Food.swift
│   ├─ FeedEntry.swift
│   ├─ WeightEntry.swift
│   └─ DayNote.swift
├─ Features/
│   ├─ Today/
│   │   ├─ TodayView.swift
│   │   ├─ TodayViewModel.swift
│   │   ├─ AddMealSheet.swift
│   │   └─ FeedEntryRow.swift
│   ├─ Dinner/                 (= „domknij dzień" / kolacja)
│   ├─ Weight/
│   ├─ History/
│   ├─ FoodsAdmin/
│   └─ PetsAdmin/
├─ Repositories/
│   ├─ FoodRepository.swift    (presetFoods + custom)
│   └─ ImportExport.swift      (JSON import z PWA)
├─ Resources/
│   ├─ Localizable.xcstrings   (PL + EN klucze UI)
│   └─ FoodsLibrary.json       (słownik bazowy z lokalizowanymi nazwami)
└─ Widgets/                    (WidgetKit extension)
    └─ TodayKcalWidget.swift
```

## 4. Model danych (SwiftData)

```swift
enum PetSpecies: String, Codable, CaseIterable {
    case cat, dog, ferret, rabbit, rodent, bird, other
}

enum FoodCategory: String, Codable, CaseIterable {
    case base, kibble, wetFood, meat, organMeat, fish, eggs,
         vegetables, fruits, treat, supplement
}

enum FoodUnit: String, Codable {
    case gram, piece
}

@Model
final class Pet {
    @Attribute(.unique) var id: UUID
    var species: PetSpecies
    var name: String
    var dailyKcalTarget: Int
    var targetWeightKg: Double?
    var photo: Data?            // JPEG, max ~500 KB
    var active: Bool
    var createdAt: Date
    @Relationship(deleteRule: .cascade) var feedEntries: [FeedEntry] = []
    @Relationship(deleteRule: .cascade) var weightEntries: [WeightEntry] = []
    @Relationship(deleteRule: .cascade) var dayNotes: [DayNote] = []
}

@Model
final class Food {
    @Attribute(.unique) var id: UUID
    var name: String                // „Kurczak — pierś"
    var localizedKey: String?       // np. "lib.chicken_breast" — gdy z biblioteki
    var category: FoodCategory
    var unit: FoodUnit
    var kcalPer100g: Double         // gdy unit == .gram
    var kcalPerPiece: Double?       // gdy unit == .piece
    var archived: Bool
    var isCustom: Bool              // false = z biblioteki, true = user-added
    var createdAt: Date
}

@Model
final class FeedEntry {
    @Attribute(.unique) var id: UUID
    var pet: Pet
    var datetime: Date
    var food: Food
    var grams: Double               // 0 dla PIECE
    var pieces: Double?             // nil dla GRAM
    var kcalCalculated: Double      // zapisane raz, niezmienne
    var note: String?
    var createdAt: Date
}

@Model
final class WeightEntry {
    @Attribute(.unique) var id: UUID
    var pet: Pet
    var date: Date                  // tylko dzień, ignoruj godzinę w UI
    var weightKg: Double
    var note: String?
    var createdAt: Date
}

@Model
final class DayNote {
    @Attribute(.unique) var id: UUID
    var pet: Pet
    var date: Date
    var content: String
    var updatedAt: Date
}
```

Kluczowe decyzje:
- `kcalCalculated` zostaje, jak w PWA — historia odporna na późniejsze zmiany
  produktu.
- `Food.localizedKey` — pozwala stockowym pozycjom z biblioteki przełączać
  nazwę PL/EN w runtime; user-added produkty mają tylko `name` (taki, jaki
  user wpisał, nielokalizowany).
- `Food.isCustom` rozdziela bibliotekę od user-added — biblioteki nie da się
  edytować poza nadpisaniem (clone-edit pattern).

## 5. Słowniki bazowe (FoodsLibrary.json)

Pozycje w bibliotece z `kcalPer100g` lub `kcalPerPiece`. Wartości referencyjne
z USDA FoodData Central + producenckie etykiety karm. **Każda pozycja ma
dual-name (PL/EN).**

Format:

```json
[
  {
    "key": "lib.beef_lean",
    "category": "meat",
    "unit": "gram",
    "kcalPer100g": 121,
    "name": { "pl": "Wołowina — chuda", "en": "Beef — lean" },
    "species": ["cat", "dog"]
  },
  {
    "key": "lib.chicken_breast_skinless",
    "category": "meat",
    "unit": "gram",
    "kcalPer100g": 110,
    "name": { "pl": "Kurczak — pierś bez skóry", "en": "Chicken — boneless skinless breast" },
    "species": ["cat", "dog"]
  },
  {
    "key": "lib.egg_whole",
    "category": "eggs",
    "unit": "piece",
    "kcalPerPiece": 70,
    "name": { "pl": "Jajko kurze (M, całe)", "en": "Chicken egg (M, whole)" },
    "species": ["dog"]
  }
]
```

### 5.1 Zawartość MVP (≈ 50 pozycji)

**Mięsa mięśniowe (`meat`, gram):**
| Klucz | PL | EN | kcal/100g |
|---|---|---|---|
| beef_lean | Wołowina — chuda | Beef — lean | 121 |
| beef_minced_5 | Wołowina mielona 5% | Beef — minced 5% fat | 137 |
| chicken_breast_skinless | Kurczak — pierś bez skóry | Chicken — skinless breast | 110 |
| chicken_thigh_skinless | Kurczak — udko bez skóry | Chicken — skinless thigh | 119 |
| turkey_breast | Indyk — pierś | Turkey — breast | 104 |
| duck | Kaczka — chuda | Duck — lean | 132 |
| rabbit | Królik | Rabbit | 114 |
| lamb | Jagnięcina | Lamb | 211 |
| pork_lean | Wieprzowina — chuda | Pork — lean | 143 |

**Podroby (`organMeat`, gram):**
| Klucz | PL | EN | kcal/100g |
|---|---|---|---|
| beef_heart | Wołowina — serce | Beef — heart | 112 |
| beef_liver | Wołowina — wątroba | Beef — liver | 135 |
| beef_kidney | Wołowina — nerki | Beef — kidneys | 99 |
| chicken_liver | Kurczak — wątróbka | Chicken — liver | 119 |
| chicken_heart | Kurczak — serca | Chicken — hearts | 153 |
| chicken_gizzards | Kurczak — żołądki | Chicken — gizzards | 94 |
| turkey_liver | Indyk — wątróbka | Turkey — liver | 128 |

**Ryby (`fish`, gram):**
| Klucz | PL | EN | kcal/100g |
|---|---|---|---|
| salmon_raw | Łosoś — surowy | Salmon — raw | 142 |
| cod | Dorsz | Cod | 82 |
| tuna_fresh | Tuńczyk — świeży | Tuna — fresh | 132 |
| sardine | Sardynka | Sardine | 208 |
| herring | Śledź | Herring | 158 |

**Jaja (`eggs`, piece):**
| Klucz | PL | EN | kcal/szt |
|---|---|---|---|
| egg_whole | Jajko kurze (M, całe) | Chicken egg (M, whole) | 70 |
| egg_yolk | Żółtko (M) | Egg yolk (M) | 55 |
| egg_white | Białko (M) | Egg white (M) | 17 |
| quail_egg | Jajko przepiórcze | Quail egg | 14 |

**Warzywa/owoce (`vegetables`/`fruits`, gram) — głównie psy:**
| Klucz | PL | EN | kcal/100g | species |
|---|---|---|---|---|
| carrot_raw | Marchew — surowa | Carrot — raw | 41 | dog |
| pumpkin_cooked | Dynia — gotowana | Pumpkin — cooked | 26 | dog |
| zucchini | Cukinia | Zucchini | 17 | dog |
| broccoli_cooked | Brokuły — gotowane | Broccoli — cooked | 35 | dog |
| apple | Jabłko (bez gniazda) | Apple (no core) | 52 | dog |
| blueberry | Borówka | Blueberry | 57 | dog |

**Karmy suche (`kibble`, gram) — popularne w PL:**
| Klucz | Nazwa | kcal/100g | species |
|---|---|---|---|
| kibble_royal_canin_indoor | Royal Canin Indoor | 396 | cat |
| kibble_hills_adult | Hill's Science Plan Adult | 379 | cat |
| kibble_acana_classic | Acana Classics | 388 | cat |
| kibble_brit_care_grain_free | Brit Care Grain Free | 380 | cat |
| kibble_eukanuba_adult_dog | Eukanuba Adult Dog | 408 | dog |
| kibble_purina_one_dog | Purina One Adult Dog | 372 | dog |

**Karmy mokre (`wetFood`, gram):**
| Klucz | Nazwa | kcal/100g | species |
|---|---|---|---|
| wet_animonda_carny | Animonda Carny | 85 | cat |
| wet_smilla_puree | Smilla Puree | 100 | cat |
| wet_lily_kitchen | Lily's Kitchen | 90 | cat |
| wet_cesar_dog | Cesar (saszetka) | 96 | dog |

**Przysmaki (`treat`, piece) — typowe sztukowo:**
| Klucz | PL | EN | kcal/szt |
|---|---|---|---|
| treat_dreamies_kibble | Dreamies (jeden granulat) | Dreamies (one piece) | 1.5 |
| treat_gimcat_paste_5cm | Gimcat Pasta — 5 cm wyciśnięcia | Gimcat Paste — 5 cm | 10 |
| treat_dentastix_small | Dentastix Small | Dentastix Small | 38 |
| treat_pedigree_jumbone | Pedigree Jumbone Mini | Pedigree Jumbone Mini | 86 |

Razem: ~50 pozycji startowych. Plik łatwo rozszerzać — bundlowany do
aplikacji, ładowany w `Repositories/FoodRepository.swift` przy pierwszym
uruchomieniu (insert-or-skip-by-key, żeby reinstall nie powielał).

### 5.2 Polityka aktualizacji biblioteki

- Wersjonowanie pliku: `FoodsLibrary.v1.json`, `FoodsLibrary.v2.json`.
- Przy update apki: jeżeli `currentLibraryVersion < bundleVersion`, run
  `migrateFoodsLibrary()` — dodaje nowe pozycje, **nie nadpisuje** kcal
  istniejących wpisów (mogłoby zmienić historię — robimy diff i informujemy
  użytkownika).
- Przy zmianie kcal w bibliotece: traktować jako nową pozycję (nowy `key`
  z sufiksem `.v2`), starą zostawić archived.

## 6. Internacjonalizacja (i18n)

### 6.1 UI — String Catalog

Plik: `Resources/Localizable.xcstrings`. Klucze hierarchiczne:

```
nav.today                       = "Today"               / "Dzisiaj"
nav.dinner                      = "Dinner"              / "Kolacja"
nav.weight                      = "Weight"              / "Waga"
nav.history                     = "History"             / "Historia"
nav.more                        = "More"                / "Więcej"
nav.pets                        = "Pets"                / "Zwierzaki"
nav.foods                       = "Foods"               / "Produkty"

food.category.base              = "Base food"           / "Karma bazowa"
food.category.kibble            = "Dry food"            / "Karma sucha"
food.category.wet_food          = "Wet food"            / "Karma mokra"
food.category.meat              = "Meat"                / "Mięso"
food.category.organ_meat        = "Organ meat"          / "Podroby"
food.category.fish              = "Fish"                / "Ryby"
food.category.eggs              = "Eggs"                / "Jaja"
food.category.vegetables        = "Vegetables"          / "Warzywa"
food.category.fruits            = "Fruits"              / "Owoce"
food.category.treat             = "Treat"               / "Przysmak"

food.unit.gram                  = "Grams"               / "Gramy"
food.unit.piece                 = "Pieces"              / "Sztuki"

addmeal.title                   = "Add meal"            / "Dodaj posiłek"
addmeal.amount.grams            = "Grams"               / "Gramatura (g)"
addmeal.amount.pieces           = "Pieces"              / "Liczba sztuk"
addmeal.kcal_estimate           = "≈ %@ kcal"           / "≈ %@ kcal"

day.summary.target              = "Daily target"        / "Limit dzienny"
day.summary.consumed            = "Consumed"            / "Spożyto"
day.summary.remaining           = "Remaining"           / "Pozostało"

dinner.title                    = "Close the day"       / "Domknij dzień"
dinner.auto.title               = "Automatic dinner"    / "Automatyczna kolacja"
dinner.manual.title             = "Manual dinner"       / "Ręczna kolacja"

species.cat                     = "Cat"                 / "Kot"
species.dog                     = "Dog"                 / "Pies"
species.ferret                  = "Ferret"              / "Fretka"
species.rabbit                  = "Rabbit"              / "Królik"
species.rodent                  = "Rodent"              / "Gryzoń"
species.bird                    = "Bird"                / "Ptak"
species.other                   = "Other"               / "Inne"
```

Łącznie szacuję ~150-200 kluczy dla całego UI. String Catalog zarządza tym
jednym JSON-em w Xcode, automatycznie podpowiada brakujące tłumaczenia.

### 6.2 Lokalizacja nazw produktów

W modelu `Food`:
- `name: String` — nazwa do wyświetlenia, ustawiona przy create.
- `localizedKey: String?` — gdy pozycja przyszła z `FoodsLibrary.json`,
  `localizedKey = "lib.chicken_breast_skinless"`. Wtedy w UI:

```swift
extension Food {
    var displayName: String {
        guard let key = localizedKey else { return name }
        return String(localized: String.LocalizationValue(key))
        // klucz musi też być w Localizable.xcstrings
    }
}
```

User-added produkty: `localizedKey = nil`, `name` = co user wpisał.

### 6.3 Wybór języka

- Domyślnie: `Locale.current` — system PL → PL UI, system EN → EN UI.
- Override w Settings: `@AppStorage("forcedLanguage") var lang: String = "system"`.
  Przy `lang != "system"` ustawiamy `Bundle.main` na `Bundle(path: ...)` przez
  trick z `NSLocalizedString` lub re-init `LocalizableBundle` + restart UI
  poprzez `id` na rootcie.
- Format daty/liczby: `Locale.current` automatycznie (kropka/przecinek dec.).

## 7. Migracja danych z PWA → iOS

### 7.1 Endpoint eksportu w PWA (do dodania, gdy iOS gotowe)

```
GET /api/export/json?catId=UUID
→ {
    "schemaVersion": 1,
    "exportedAt": "2026-05-10T12:34:56Z",
    "cat": {...},
    "foods": [...],
    "feedEntries": [...],
    "weightEntries": [...],
    "dayNotes": [...]
  }
```

Już mamy `/api/export/csv` (per dzień) — JSON to ~1h pracy: zwracamy całość
po `catId`, bez paginacji (kilka tysięcy rekordów to <1 MB).

### 7.2 Import w apce iOS

`Settings → Import from PWA`:
1. `FileImporter` (`fileImporter(isPresented:allowedContentTypes:[.json])`)
   wybiera plik JSON z Files / share-sheet / iCloud Drive.
2. `ImportService.importJSON(url)`:
   - parsuje schema, sprawdza `schemaVersion`,
   - mapuje `cat` → `Pet(species: .cat, ...)`,
   - mapuje `foods[]` → `Food(...)` (zachowuje `id` żeby `feedEntries.foodId`
     się zgadzało),
   - mapuje resztę,
   - wsadza wszystko w `ModelContext` w jednej transakcji,
   - przy konflikcie `id`: pyta usera (overwrite / skip / merge by datetime).
3. Po imporcie wyświetla podsumowanie: ile rekordów dodanych.

### 7.3 Dual-run

Akceptowalne, że PWA i iOS chodzą równolegle przez kilka tygodni — user wbija
na obu, raz na tydzień eksport-import. Po stabilizacji iOS wyłączamy PWA, ale
zachowujemy backup bazy (pg_dump → Files na Mac).

## 8. Synchronizacja między urządzeniami

**Domyślnie: bez sync.** Dane lokalnie na iPhonie. To jest świadoma decyzja —
upraszcza wszystko, brak kosztu serwera.

**Opcjonalnie: CloudKit private database.**

Setup: w `PetCalApp.swift`:

```swift
let modelContainer = try ModelContainer(
    for: Pet.self, Food.self, FeedEntry.self,
         WeightEntry.self, DayNote.self,
    configurations: ModelConfiguration(
        cloudKitDatabase: .private("iCloud.pl.holak.petcal")
    )
)
```

Plus w Xcode: enable iCloud capability + CloudKit container. SwiftData sam
synchronizuje zmiany. Działa na: iPhone usera + iPad usera + Mac usera (jedno
Apple ID). Partner (Juli) na osobnym Apple ID nie widzi — wtedy wracamy do
import/export JSON albo CloudKit shared database (więcej roboty).

Decyzja: faza pierwsza bez sync, później CloudKit private. Sharing zostawiamy
do oddzielnej fazy.

## 9. Funkcje wykorzystujące natywność (nad PWA)

Kolejność priorytetów:

1. **Widget na ekran główny** (WidgetKit) — pasek progressu kcal dnia,
   widoczny bez otwierania apki. SmallWidget = circular gauge, MediumWidget =
   gauge + lista 3 ostatnich posiłków. Update co 15 min lub na zmiany w bazie.
2. **Live Activity / Dynamic Island** — gdy zostało <50 kcal do limitu i jest
   wieczór, pin na lockscreen z licznikiem.
3. **Lokalne powiadomienia** — przypomnienie o ważeniu (cykliczne, np.
   co 2 tygodnie) i o domknięciu dnia (jeśli o 19:00 nie ma jeszcze kolacji).
4. **Skanowanie kodu kreskowego karmy** (DataScanner) → odpalenie zapytania do
   Open Pet Food Facts (alt: free PetFoodDB) → auto-uzupełnienie kcal/100g.
5. **Siri Shortcut** — „Hej Siri, dodaj 50 gram karmy Mysza" → entry w bazie.
   Wymaga Intents Extension.
6. **Apple Watch companion** (faza późniejsza) — quick-add z zegarka.
7. **HealthKit** — niewspierane natywnie dla zwierząt, ale można log wagi
   właściciela na watchu jako proxy (off-topic dla apki). Pomijamy.

## 10. Plan etapowy implementacji

> Szacunki dla devel solo, ~10h/tydzień, bez burn-out.

| Faza | Zakres | Czas |
|---|---|---|
| **F0** | Setup Xcode, struktura, ikona placeholder, TabView, NavigationStack | 1 tydz |
| **F1** | SwiftData modele + Today + AddMeal + FeedEntryList | 2 tygodnie |
| **F2** | FoodsAdmin + PetsAdmin + import biblioteki z JSON | 1 tydz |
| **F3** | Wykresy History (Charts) + WeightPage | 1 tydz |
| **F4** | i18n PL/EN (String Catalog + lokalizacja nazw produktów) | 3 dni |
| **F5** | Eksport JSON w PWA + Import w iOS (zerwanie zależności od PWA) | 3 dni |
| **F6** | Widget Home Screen (kcal dnia) | 4 dni |
| **F7** | Live Activity, Notifications, Siri Shortcut | 1 tydz |
| **F8** | CloudKit sync (opcjonalnie) | 1 tydz |
| **F9** | Polish — accessibility, dark mode tweaks, App Icon, splash | 4 dni |
| **F10** | TestFlight beta z rodziną, fixy z UAT | 2 tygodnie |
| **F11** | App Store submission (jeśli idziemy publicznie) | 1 tydz |

Razem do TestFlight (F0–F10 bez F8): **~9-10 tygodni**.

## 11. Decyzje otwarte (do potwierdzenia z userem)

| # | Pytanie | Opcje | Rekomendacja |
|---|---|---|---|
| 1 | Min iOS target | 16 (GRDB) / 17 (SwiftData) | **17** — SwiftData + Charts to ogromny win |
| 2 | CloudKit sync | tak (od F8) / nigdy | **tak**, ale opcjonalnie — flag w settings |
| 3 | Dystrybucja | TestFlight (rodzina) / App Store | **TestFlight first**, App Store dopiero po stabilizacji |
| 4 | Apple Developer Program | $99/rok — opłaca się? | Tak, jeśli planujemy >6 mies. używania na własnym urządzeniu |
| 5 | Nazwa | PetCal / inna | **PetCal** chyba że user ma lepszą |
| 6 | Wycofanie PWA | po F5 / nigdy | **Po F10** — kilka tyg. dual-run dla pewności |
| 7 | Repo | nowe `pet-cal-ios` / monorepo | **Nowe** — Swift to inny ekosystem, monorepo nic nie daje |
| 8 | Włączenie i18n w PWA | tak / nie | **Nie** — PWA wycofujemy. i18n tylko w iOS. |

## 12. Ryzyka

- **SwiftData jest młode** — w iOS 17.0/17.1 były bugi z relacjami, w 17.4+
  poprawione. Plan B: GRDB.swift, ale wszystkie modele do przepisania (1-2
  dni).
- **CloudKit + SwiftData** — sync miewa flakiness przy konfliktach. Mitigacja:
  zaczynamy bez sync, włączamy z flagą i monitorujemy.
- **App Store review** — apka „dla zwierząt" raczej bez problemów, ale
  wartości kcal mogą być potraktowane jako medical advice. Mitigacja:
  disclaimer na pierwszym uruchomieniu („This app is not veterinary advice").
- **Lokalizacja nazw karm komercyjnych** — `Royal Canin Indoor` to nazwa
  własna, nie tłumaczymy. W `FoodsLibrary.json` taka pozycja ma
  `name: { pl: "...", en: "..." }` z identyczną wartością po obu stronach.
- **Migracja istniejących danych Mysza** (kotki Juli) — krytyczna. Test:
  najpierw eksport z PWA, import do dev-build iOS, weryfikacja że historia
  kcal z 6 mies. wczytała się 1:1.

## 13. Co zostaje w tym repo (cat-diet)

- PWA dalej działa, dostaje patche (bugfixy), nie dostaje nowych ficzerów po
  rozpoczęciu F1.
- Endpoint `/api/export/json` (F5) — dodajemy tu.
- Backup bazy raz w tygodniu (cron), trzymane minimum przez 3 miesiące po
  wyłączeniu PWA.

## 14. Następny krok

1. User potwierdza decyzje z sekcji 11 (zwłaszcza nazwę i target iOS).
2. Nowe repo `pet-cal-ios` na GitHubie.
3. Faza 0 — bootstrap projektu Xcode, hello world, struktura folderów.
4. Faza 1 — SwiftData + Today screen.

Implementacja **poza tym repo**, ten plik jest wyłącznie briefem — żeby przy
otwarciu projektu iOS od zera mieć kompletny kontekst.
