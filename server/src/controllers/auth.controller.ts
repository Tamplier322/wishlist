import type { Request, Response } from 'express';
import { login, register, updateProfile } from '../services/auth.service';
import { findUserById } from '../repositories/user.repository';
import { notFound } from '../utils/errors';
import { signUploadUrl } from '../utils/signed-url';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { loginSchema, profilePatchSchema, registerSchema } from '../utils/validators';
import type { User } from '../types/domain';


function withSignedAvatar(user: User): User {
  return { ...user, avatarImage: user.avatarImage ? signUploadUrl(user.avatarImage) : null };
}

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(registerSchema, req.body);
  const result = await register(body);
  res.status(201).json(result);
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(loginSchema, req.body);
  const result = await login(body);
  res.json(result);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.id);
  if (!user) throw notFound('Пользователь не найден');
  res.json(withSignedAvatar(user));
});


export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(profilePatchSchema, req.body);
  const normalized: { avatarColor?: string; avatarImage?: string | null } = { ...body };
  if (normalized.avatarImage === '') normalized.avatarImage = null;
  const user = await updateProfile(req.user!.id, normalized);
  if (!user) throw notFound('Пользователь не найден');
  res.json(withSignedAvatar(user));
});
