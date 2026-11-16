import type { Request, Response } from 'express';
import {
  deleteAccount,
  login,
  register,
  setPassword,
  updateProfile,
  type ProfilePatch,
} from '../services/auth.service';
import { findUserById } from '../repositories/user.repository';
import {
  assertLoginAllowed,
  clearLoginFailures,
  loginKey,
  registerLoginFailure,
} from '../services/login-guard';
import { consumeRefreshToken, revokeRefreshToken } from '../services/refresh-token.service';
import { listAuthEvents, recordAuthEvent } from '../services/auth-audit.service';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
  withoutRefreshToken,
} from '../services/auth-cookies';
import { notFound, unauthorized } from '../utils/errors';
import { signToken } from '../utils/jwt';
import { signUploadUrl } from '../utils/signed-url';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import {
  deleteAccountSchema,
  loginSchema,
  profilePatchSchema,
  refreshTokenSchema,
  registerSchema,
  setPasswordSchema,
} from '../utils/validators';
import type { User } from '../types/domain';


function withSignedAvatar(user: User): User {
  return { ...user, avatarImage: user.avatarImage ? signUploadUrl(user.avatarImage) : null };
}

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(registerSchema, req.body);
  const result = await register(body);
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json(withoutRefreshToken(result));
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(loginSchema, req.body);
  const key = loginKey(req.ip, body.login);

  assertLoginAllowed(key);
  try {
    const result = await login(body);
    clearLoginFailures(key);
    recordAuthEvent(req, 'login', result.user.id);
    setRefreshCookie(res, result.refreshToken);
    res.json(withoutRefreshToken(result));
  } catch (error) {
    registerLoginFailure(key);
    recordAuthEvent(req, 'login_failed', null);
    throw error;
  }
});

export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = refreshTokenSchema.safeParse(req.body ?? {});
  const raw = readRefreshCookie(req) ?? (parsed.success ? parsed.data.refreshToken : undefined);
  if (!raw) throw unauthorized('Сессия истекла, войдите заново');

  const { userId, refreshToken } = await consumeRefreshToken(raw);

  const user = await findUserById(userId);
  if (!user) throw unauthorized('Пользователь не найден');

  setRefreshCookie(res, refreshToken);
  res.json({
    token: signToken({ sub: user.id, username: user.username }),
    user: withSignedAvatar(user),
  });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = refreshTokenSchema.safeParse(req.body ?? {});
  const raw = readRefreshCookie(req) ?? (parsed.success ? parsed.data.refreshToken : undefined);
  if (raw) await revokeRefreshToken(raw);
  clearRefreshCookie(res);
  res.status(204).end();
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.id);
  if (!user) throw notFound('Пользователь не найден');
  res.json(withSignedAvatar(user));
});


export const setPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(setPasswordSchema, req.body);
  const result = await setPassword(req.user!.id, body);
  recordAuthEvent(req, 'password_set', result.user.id);
  setRefreshCookie(res, result.refreshToken);
  res.setHeader('Cache-Control', 'no-store');
  res.json(withoutRefreshToken(result));
});

export const listAuthEventsHandler = asyncHandler(async (req: Request, res: Response) => {
  const events = await listAuthEvents(req.user!.id, 20);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ events });
});

export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(profilePatchSchema, req.body);
  const normalized: ProfilePatch = { ...body };
  if (normalized.avatarImage === '') normalized.avatarImage = null;
  if (normalized.email !== undefined) normalized.email = normalized.email.trim().toLowerCase();
  const user = await updateProfile(req.user!.id, normalized);
  if (!user) throw notFound('Пользователь не найден');
  res.json(withSignedAvatar(user));
});

export const deleteMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(deleteAccountSchema, req.body ?? {});
  await deleteAccount(req.user!.id, body);
  clearRefreshCookie(res);
  res.status(204).end();
});
