
export interface ListTemplate {
  id: string;
  label: string;
  listName: string;
  wishes: string[];
}

export const BASE_WISH = {
  description: '',
  link: '',
  imageUrl: '',
  categoryId: null,
  price: null,
  currency: 'RUB',
  priority: 'medium' as const,
  kind: 'other' as const,
  status: 'wanted' as const,
};

export const LIST_TEMPLATES: readonly ListTemplate[] = [
  {
    id: 'ny',
    label: '🎄 Новый год',
    listName: 'Новый год',
    wishes: [
      'Тёплый свитер',
      'Настольная игра',
      'Книга популярного автора',
      'Беспроводные наушники',
      'Подарочный сертификат в книжный',
    ],
  },
  {
    id: 'birthday',
    label: '🎂 День рождения',
    listName: 'День рождения',
    wishes: [
      'Смарт-часы',
      'Термокружка',
      'Подписка на стриминг',
      'Хороший рюкзак',
      'Сертификат на массаж',
    ],
  },
  {
    id: 'moving',
    label: '📦 Переезд',
    listName: 'Переезд',
    wishes: [
      'Картонные коробки (10 шт)',
      'Пузырчатая плёнка',
      'Маркеры и скотч',
      'Набор инструментов',
      'Новая штора в зал',
    ],
  },
];
