/// <reference types="vitest/globals" />
import { normalizeUsername } from '../oauth.service';

describe('normalizeUsername', () => {
  it('транслитерирует кириллицу и заменяет пробелы', () => {
    expect(normalizeUsername('Иван Петров')).toBe('ivan_petrov');
  });

  it('убирает недопустимые символы', () => {
    expect(normalizeUsername('user name!!!')).toBe('user_name');
    expect(normalizeUsername('  ...  ')).toBe('user');
  });

  it('дополняет слишком короткие имена', () => {
    expect(normalizeUsername('a')).toBe('user_a');
  });

  it('ограничивает длину 24 символами', () => {
    expect(normalizeUsername('a'.repeat(80)).length).toBe(24);
  });
});
