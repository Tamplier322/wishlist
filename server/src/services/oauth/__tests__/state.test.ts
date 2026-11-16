/// <reference types="vitest/globals" />
import { consumeOAuthState, createOAuthState } from '../state';

describe('OAuth state', () => {
  it('создаёт state и принимает его с тем же nonce из cookie', async () => {
    const created = await createOAuthState({
      provider: 'google',
      mode: 'login',
      next: '/dashboard',
    });

    const { payload, stored } = await consumeOAuthState(created.state, created.nonce);

    expect(payload.provider).toBe('google');
    expect(payload.mode).toBe('login');
    expect(payload.next).toBe('/dashboard');
    expect(stored.codeVerifier.length).toBeGreaterThan(20);
  });

  it('не принимает state с чужим cookie nonce', async () => {
    const created = await createOAuthState({ provider: 'google', mode: 'login' });

    await expect(consumeOAuthState(created.state, 'another-nonce')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('одноразовый: повторный callback не проходит', async () => {
    const created = await createOAuthState({ provider: 'google', mode: 'link', userId: 'u1' });
    await consumeOAuthState(created.state, created.nonce);

    await expect(consumeOAuthState(created.state, created.nonce)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('не принимает подделанный state', async () => {
    await expect(consumeOAuthState('not-a-jwt', 'nonce')).rejects.toMatchObject({ status: 401 });
  });
});
