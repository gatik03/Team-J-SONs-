import { z } from 'zod';
import type { Role } from '@prisma/client';

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export interface LoginResponse {
  token: string;
  role: Role;
  customerId: string | null;
  displayName: string;
}

export interface AuthMeResponse {
  username: string;
  role: Role;
  customerId: string | null;
}
