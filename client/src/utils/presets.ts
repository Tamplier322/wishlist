
export interface CategoryPreset {
  name: string;
  color: string;
}

const C = {
  blue: '#5b7185',
  olive: '#7c8b6f',
  orange: '#c9762e',
  terracotta: '#a4563f',
  lilac: '#8f6b8a',
  sea: '#3f7a7a',
  sand: '#94806e',
  beige: '#c9a06e',
};

export const PRESET_CATEGORIES: readonly CategoryPreset[] = [
  { name: 'Смартфоны', color: C.blue },
  { name: 'Ноутбуки', color: C.sea },
  { name: 'Компьютеры и комплектующие', color: C.blue },
  { name: 'Наушники и аудио', color: C.lilac },
  { name: 'Телевизоры', color: C.blue },
  { name: 'Бытовая техника', color: C.sand },
  { name: 'Игровые консоли', color: C.olive },
  { name: 'Фото и видео', color: C.terracotta },
  { name: 'Одежда', color: C.lilac },
  { name: 'Обувь', color: C.sand },
  { name: 'Сумки и аксессуары', color: C.beige },
  { name: 'Украшения', color: C.orange },
  { name: 'Часы', color: C.blue },
  { name: 'Косметика и уход', color: C.lilac },
  { name: 'Парфюмерия', color: C.lilac },
  { name: 'Спорт и фитнес', color: C.olive },
  { name: 'Велосипеды и самокаты', color: C.olive },
  { name: 'Автомобили', color: C.terracotta },
  { name: 'Мотоциклы', color: C.terracotta },
  { name: 'Инструменты', color: C.sand },
  { name: 'Мебель', color: C.beige },
  { name: 'Декор и интерьер', color: C.beige },
  { name: 'Кухня и посуда', color: C.sand },
  { name: 'Книги', color: C.beige },
  { name: 'Настольные игры', color: C.olive },
  { name: 'Видеоигры', color: C.blue },
  { name: 'Детские товары', color: C.orange },
  { name: 'Игрушки', color: C.orange },
  { name: 'Зоотовары', color: C.olive },
  { name: 'Музыкальные инструменты', color: C.terracotta },
  { name: 'Хобби и творчество', color: C.terracotta },
  { name: 'Путешествия', color: C.sea },
  { name: 'Здоровье', color: C.sea },
  { name: 'Продукты и деликатесы', color: C.orange },
];
