import { z } from 'zod';
import type { Role } from '@prisma/client';

export const LoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(40),
  password: z.string().min(1).max(128),
});

export const RegistrationSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9][a-z0-9._-]*$/, 'Use letters, numbers, dots, underscores or hyphens'),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, 'Enter a valid phone number'),
  dateOfBirth: z.string().date().refine(value => value >= '1900-01-01' && new Date(value).getTime() < Date.now(), 'Enter a valid past date of birth'),
  segment: z.enum(['SALARIED', 'SELF_EMPLOYED', 'STUDENT']),
  monthlyIncome: z.number().int().min(0).max(100000000),
  location: z.string().trim().min(2).max(100),
}).strict();
export type RegistrationInput = z.infer<typeof RegistrationSchema>;

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
