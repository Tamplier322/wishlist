/// <reference types="vitest/globals" />
import { consumeRefreshToken } from '../refresh-token.service';

const repo = vi.hoisted(() => ({
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeRefreshTokenRecord: vi.fn(),
  deleteRefreshToken: vi.fn(),
  deleteUserRefreshTokens: vi.fn(),
  deleteExpiredRefreshTokens: vi.fn(),
}));

vi.mock('../../repositories/refresh-token.repository', () => repo);
vi.mock('../../config/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function record(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    tokenHash: 'hash',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    revokedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('consumeRefreshToken', () => {
  it('ротирует активный токен и выдаёт новый', async () => {
    repo.findRefreshToken.mockResolvedValue(record());

    const result = await consumeRefreshToken('raw-token');

    expect(result.userId).toBe('user-1');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(repo.revokeRefreshTokenRecord).toHaveBeenCalledOnce();
    expect(repo.createRefreshToken).toHaveBeenCalledOnce();
    expect(repo.deleteUserRefreshTokens).not.toHaveBeenCalled();
  });

  it('при повторном использовании отозванного токена гасит все сессии', async () => {
    repo.findRefreshToken.mockResolvedValue(record({ revokedAt: new Date().toISOString() }));

    await expect(consumeRefreshToken('stolen-token')).rejects.toMatchObject({ status: 401 });

    expect(repo.deleteUserRefreshTokens).toHaveBeenCalledWith('user-1');
    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });

  it('неизвестный токен не создаёт новую сессию', async () => {
    repo.findRefreshToken.mockResolvedValue(null);

    await expect(consumeRefreshToken('unknown')).rejects.toMatchObject({ status: 401 });

    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });

  it('просроченный токен отзывается и не продлевается', async () => {
    repo.findRefreshToken.mockResolvedValue(
      record({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );

    await expect(consumeRefreshToken('expired')).rejects.toMatchObject({ status: 401 });

    expect(repo.revokeRefreshTokenRecord).toHaveBeenCalledOnce();
    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });
});
