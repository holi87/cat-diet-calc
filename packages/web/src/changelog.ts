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
];
