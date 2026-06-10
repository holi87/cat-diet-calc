export interface ChangelogEntry {
  version: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.2',
    changes: [
      'Naprawiony błąd z ignorowaniem karmy przy dodawaniu kolacji',
    ],
  },
  {
    version: '1.2.0',
    changes: [
      'Naprawiony błąd z błędnym liczeniem karmy na kolację (zły stosunek kcal/g)',
      'Naprawiony błąd z wyświetlaniem zaokrągleń (np. 116,9999 kcal)',
      'Nowa kategoria produktu: Karma bazowa (BASE)',
      'Kolacja zapisywana z aktualną godziną (nie pełna godzina)',
    ],
  },
  {
    version: '1.2.1',
    changes: [
      'Poprawiona kolorystyka kategorii „Karma bazowa" w formularzu dodawania',
      'Dynamiczny kolor kropki karmy w karcie kolacji (zgodny z kategorią produktu)',
    ],
  },
  {
    version: '1.3.0',
    changes: [
      'Nowa strona Historia — wykresy dziennego spożycia (słupkowy) i wagi (liniowy)',
      'Przełącznik kcal / gramy, filtrowanie po kategoriach jedzenia',
      'Wybór zakresu dat: ostatnie 7/14/30 dni lub dowolny zakres',
      'Menu „Admin" zastąpione menu „Więcej" (Historia, Koty, Produkty)',
    ],
  },
  {
    version: '1.3.1',
    changes: [
      'Poprawka kompatybilności typów Tooltip dla Recharts 3.8 na stronie Historia',
      'Naprawiony błąd kompilacji TypeScript blokujący build obrazu web',
    ],
  },
  {
    version: '1.3.2',
    changes: [
      'Splash screeny iOS dla wszystkich modeli iPhone i iPad',
      'Dodatkowe rozmiary ikon Apple Touch (152px, 167px)',
      'Ulepszony status bar (black-translucent) i blokada auto-detekcji telefonów',
    ],
  },
  {
    version: '1.3.3',
    changes: [
      'Banner offline — komunikat „Brak połączenia z internetem" gdy nie ma sieci',
    ],
  },
  {
    version: '1.4.0',
    changes: [
      'Podsumowanie tygodnia — karta ze średnią kcal/dzień, dniami ponad limit i trendem',
      'Notatki dzienne — pole tekstowe na stronie dnia z auto-zapisem',
      'Zdjęcie kota — upload i podgląd w profilu kota (Base64)',
      'Waga docelowa — pole w ustawieniach kota, linia celu na wykresach wagi',
      'Eksport CSV — pobieranie danych z Historii jako plik CSV',
    ],
  },
  {
    version: '1.5.0',
    changes: [
      'Porcje sztukowe — produkt może mieć kalorie na sztukę zamiast na 100g (np. przysmaki)',
      'Wybór jednostki przy dodawaniu produktu (gramy / sztuki) z osobnym polem kcal/szt.',
      'Wykres wagi — chronologia naprawiona: starsze wpisy po lewej, nowsze po prawej',
      'Eksport CSV — dodatkowa kolumna „Sztuki" obok „Gramy"',
    ],
  },
  {
    version: '1.6.0',
    changes: [
      'Eksport i import wszystkich danych do pliku JSON — pełny backup i przywracanie aplikacji',
      'Nowa strona „Dane" w menu — pobieranie kopii i odtwarzanie z pliku',
      'Poprawka dodawania przysmaków na sztuki — prawidłowe liczenie kalorii dla porcji sztukowych',
    ],
  },
  {
    version: '1.6.1',
    changes: [
      'Naprawiona strefa czasowa — dzień liczony wg czasu polskiego, wpisy po północy trafiają do właściwego dnia',
      'Kolacja domykana po północy zapisuje się w domykanym dniu, a data odświeża się po wznowieniu aplikacji',
      'Posiłek dodany przy przeglądaniu innego dnia zapisuje się w tym dniu (nie „na teraz")',
      'Pola liczbowe akceptują przecinek dziesiętny (np. „4,2 kg")',
      'Błędy zapisu i pobierania danych pokazują komunikat zamiast cichego niepowodzenia',
      'Karta „Ostatnie 7 dni", Historia i limit kcal odświeżają się od razu po zmianach',
    ],
  },
  {
    version: '1.6.2',
    changes: [
      'Dzień można domknąć tylko raz — podwójne kliknięcie lub odświeżenie nie duplikuje kolacji',
      'Domknięcie dnia zgłasza błąd, gdy brak produktu karmy, zamiast cicho pomijać wpis (awaryjnie używa karmy suchej, gdy brak karmy bazowej)',
      'Ręczna kolacja zapisywana w jednej transakcji — koniec połowicznych zapisów przy błędzie sieci',
      'Kalkulator kolacji bez wyścigów — wyświetlana gramatura zawsze odpowiada wpisanym wartościom',
    ],
  },
];
