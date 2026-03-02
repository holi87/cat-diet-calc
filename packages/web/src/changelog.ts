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
];
