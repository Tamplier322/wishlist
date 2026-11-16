/// <reference types="vitest/globals" />
import { createHash, createHmac } from 'node:crypto';
import { verifyTelegramAuth, type TelegramAuthData } from '../telegram.provider';

const BOT_TOKEN = '123456:test-bot-token';

function sign(data: Omit<TelegramAuthData, 'hash'>): TelegramAuthData {
  const checkString = Object.entries(data)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');
  const secret = createHash('sha256').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  return { ...data, hash };
}

function baseData(
  overrides: Partial<Omit<TelegramAuthData, 'hash'>> = {},
): Omit<TelegramAuthData, 'hash'> {
  return {
    id: '424242',
    first_name: 'Иван',
    last_name: 'Петров',
    username: 'ivan_petrov',
    photo_url: 'https://t.me/i/userpic/320/ivan.jpg',
    auth_date: String(Math.floor(Date.now() / 1000)),
    ...overrides,
  };
}

describe('verifyTelegramAuth', () => {
  it('принимает валидную подпись и собирает профиль', () => {
    const profile = verifyTelegramAuth(sign(baseData()), BOT_TOKEN, 3600);

    expect(profile.provider).toBe('telegram');
    expect(profile.providerUserId).toBe('424242');
    expect(profile.displayName).toBe('Иван Петров');
    expect(profile.username).toBe('ivan_petrov');
    expect(profile.avatarUrl).toBe('https://t.me/i/userpic/320/ivan.jpg');
    expect(profile.email).toBeNull();
  });

  it('строит ссылку на аватар из username, если photo_url не пришёл', () => {
    const { photo_url: _photoUrl, ...rest } = baseData();
    const profile = verifyTelegramAuth(sign(rest), BOT_TOKEN, 3600);
    expect(profile.avatarUrl).toBe('https://t.me/i/userpic/320/ivan_petrov.jpg');
  });

  it('отклоняет изменённые после подписи данные', () => {
    const signed = sign(baseData());
    expect(() => verifyTelegramAuth({ ...signed, id: '999' }, BOT_TOKEN, 3600)).toThrow(
      /Подпись Telegram неверна/,
    );
  });

  it('отклоняет подпись, сделанную другим ботом', () => {
    const signed = sign(baseData());
    expect(() => verifyTelegramAuth(signed, '999:other-token', 3600)).toThrow(
      /Подпись Telegram неверна/,
    );
  });

  it('отклоняет устаревший auth_date', () => {
    const old = baseData({ auth_date: String(Math.floor(Date.now() / 1000) - 7200) });
    expect(() => verifyTelegramAuth(sign(old), BOT_TOKEN, 3600)).toThrow(/устарел/);
  });

  it('отклоняет дату из будущего', () => {
    const future = baseData({ auth_date: String(Math.floor(Date.now() / 1000) + 3600) });
    expect(() => verifyTelegramAuth(sign(future), BOT_TOKEN, 3600)).toThrow(/дата Telegram-входа/);
  });

  it('отклоняет некорректный hash', () => {
    expect(() => verifyTelegramAuth({ ...baseData(), hash: 'zzz' }, BOT_TOKEN, 3600)).toThrow(
      /Некорректная подпись/,
    );
  });
});
