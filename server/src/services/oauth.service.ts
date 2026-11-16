import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {
  createOAuthAccount,
  deleteOAuthAccount,
  findOAuthAccount,
  findOAuthAccountsByUser,
  updateOAuthAccountProfile,
} from '../repositories/oauth-account.repository';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  updateUserProfile,
} from '../repositories/user.repository';
import { pickUserColor } from '../utils/colors';
import { HttpError, notFound, unauthorized } from '../utils/errors';
import { issueAuthResult, seedDefaultContent, type AuthResult } from './auth.service';
import type { OAuthProfile } from './oauth/types';
import type { OAuthAccount, OAuthProvider, User } from '../types/domain';

const BCRYPT_ROUNDS = 12;

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

export function normalizeUsername(raw: string): string {
  const transliterated = raw
    .toLowerCase()
    .split('')
    .map((character) => TRANSLIT[character] ?? character)
    .join('');
  const cleaned = transliterated
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  return `user_${cleaned}`.replace(/_+$/, '').slice(0, 24);
}

async function buildUniqueUsername(profile: OAuthProfile): Promise<string> {
  const candidates = [
    profile.username,
    profile.displayName,
    `${profile.provider}_${profile.providerUserId}`,
  ].filter((value): value is string => Boolean(value && value.trim()));

  let base = 'user';
  for (const candidate of candidates) {
    const normalized = normalizeUsername(candidate);
    if (normalized.length >= 3) {
      base = normalized;
      break;
    }
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${attempt + 1}`;
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (!(await findUserByUsername(candidate))) return candidate;
  }
  return `${base.slice(0, 12)}_${randomBytes(3).toString('hex')}`;
}

function placeholderEmail(profile: OAuthProfile): string {
  return `${profile.provider}_${profile.providerUserId}@oauth.local`;
}

function httpsAvatar(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (candidate && /^https:\/\//i.test(candidate)) return candidate;
  }
  return null;
}

function isProviderAvatar(url: string | null): boolean {
  return Boolean(url && /^https:\/\/(t\.me|[a-z0-9.-]*telesco\.pe)\//i.test(url));
}

function profilePatchForUser(
  user: User,
  profile: OAuthProfile,
  knownAvatarUrl: string | null,
): { displayName?: string; avatarImage?: string } {
  const patch: { displayName?: string; avatarImage?: string } = {};
  const displayName = profile.displayName?.trim();
  if (displayName && (!user.displayName || user.displayName === user.username)) {
    patch.displayName = displayName;
  }

  const avatar = httpsAvatar(profile.avatarUrl, knownAvatarUrl);
  const current = user.avatarImage;
  const canReplace =
    current === null || current === knownAvatarUrl || isProviderAvatar(current);
  if (avatar && avatar !== current && canReplace) {
    patch.avatarImage = avatar;
  }
  return patch;
}

async function createUserFromProfile(profile: OAuthProfile): Promise<User> {
  const username = await buildUniqueUsername(profile);

  let email = profile.email ?? placeholderEmail(profile);
  const emailTaken = await findUserByEmail(email);
  if (emailTaken) email = placeholderEmail(profile);

  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
  const user = await createUser({
    username,
    displayName: profile.displayName?.trim() || username,
    email,
    passwordHash,
    avatarColor: pickUserColor(),
    hasPassword: false,
  });

  if (profile.avatarUrl) {
    const updated = await updateUserProfile(user.id, { avatarImage: profile.avatarUrl });
    if (updated) {
      await createOAuthAccount({
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      await seedDefaultContent(updated);
      return updated;
    }
  }

  await createOAuthAccount({
    userId: user.id,
    provider: profile.provider,
    providerUserId: profile.providerUserId,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  });
  await seedDefaultContent(user);
  return user;
}

export async function loginWithOAuth(profile: OAuthProfile): Promise<AuthResult> {
  const account = await findOAuthAccount(profile.provider, profile.providerUserId);
  if (account) {
    const user = await findUserById(account.userId);
    if (user) {
      await updateOAuthAccountProfile(account.id, {
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      const patch = profilePatchForUser(user, profile, account.avatarUrl);
      const refreshed =
        Object.keys(patch).length > 0
          ? ((await updateUserProfile(user.id, patch)) ?? user)
          : user;
      return issueAuthResult(refreshed);
    }
    await deleteOAuthAccount(account.userId, profile.provider);
  }

  if (profile.email && profile.emailVerified) {
    const existing = await findUserByEmail(profile.email);
    if (existing) {
      throw new HttpError(
        409,
        'Аккаунт с таким email уже существует. Войдите паролем и подключите этот способ входа в профиле.',
        undefined,
        'OAUTH_EMAIL_EXISTS',
      );
    }
  }

  const user = await createUserFromProfile(profile);
  return issueAuthResult(user);
}

export async function linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<User> {
  const user = await findUserById(userId);
  if (!user) throw unauthorized('Пользователь не найден');

  const existing = await findOAuthAccount(profile.provider, profile.providerUserId);
  if (existing) {
    if (existing.userId !== userId) {
      throw new HttpError(
        409,
        'Этот способ входа уже привязан к другому аккаунту',
        undefined,
        'OAUTH_ALREADY_LINKED',
      );
    }
    await updateOAuthAccountProfile(existing.id, {
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
    return user;
  }

  const alreadyLinked = (await findOAuthAccountsByUser(userId)).some(
    (account) => account.provider === profile.provider,
  );
  if (alreadyLinked) {
    throw new HttpError(
      409,
      'Этот способ входа уже подключён к аккаунту',
      undefined,
      'OAUTH_ALREADY_LINKED',
    );
  }

  await createOAuthAccount({
    userId,
    provider: profile.provider,
    providerUserId: profile.providerUserId,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  });

  const patch = profilePatchForUser(user, profile, null);
  if (Object.keys(patch).length > 0) {
    const updated = await updateUserProfile(userId, patch);
    if (updated) return updated;
  }
  return user;
}

export async function unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw unauthorized('Пользователь не найден');

  const accounts = await findOAuthAccountsByUser(userId);
  if (!accounts.some((account) => account.provider === provider)) {
    throw notFound('Этот способ входа не подключён');
  }

  const remaining = accounts.filter((account) => account.provider !== provider).length;
  if (!user.hasPassword && remaining === 0) {
    throw new HttpError(
      409,
      'Нельзя отключить последний способ входа. Сначала задайте пароль или подключите другой сервис.',
      undefined,
      'OAUTH_LAST_METHOD',
    );
  }

  await deleteOAuthAccount(userId, provider);
}

export async function listOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
  return findOAuthAccountsByUser(userId);
}
