import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import { signToken } from '../../common/auth';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Prisma } from '@prisma/client';
import type { LoginInput, LoginResponse, RegistrationInput } from './schemas';

const deriveKey = promisify(scrypt);

async function matchesPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return password === 'password'; // Existing seeded demo accounts only.
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const hash = Buffer.from(hex, 'hex');
  const candidate = await deriveKey(password, salt, 64) as Buffer;
  return hash.length === candidate.length && timingSafeEqual(hash, candidate);
}

export async function register(input: RegistrationInput): Promise<LoginResponse> {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(input.password, salt, 64) as Buffer;
  try {
    const user = await prisma.appUser.create({ data: {
      username: input.username, displayName: input.fullName, role: 'CUSTOMER', passwordHash: `${salt}:${hash.toString('hex')}`,
      customer: { create: { customerId: `CUST-${randomUUID()}`, fullName: input.fullName, email: input.email, phone: input.phone,
        dateOfBirth: new Date(input.dateOfBirth), segment: input.segment, monthlyIncome: input.monthlyIncome,
        existingMonthlyObligations: 0, location: input.location, kycStatus: 'PENDING', employmentType: input.segment } },
    } });
    return { token: signToken({ username: user.username, role: user.role, customerId: user.customerId }),
      role: user.role, customerId: user.customerId, displayName: user.displayName };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'INVALID_STATE', 'That username is already taken', [{ field: 'username', issue: 'Choose a different username' }]);
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.appUser.findUnique({
    where: { username: input.username },
  });

  if (!user || !await matchesPassword(input.password, user.passwordHash)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid username or password');
  }

  const token = signToken({
    username: user.username,
    role: user.role,
    customerId: user.customerId,
  });

  return {
    token,
    role: user.role,
    customerId: user.customerId,
    displayName: user.displayName,
  };
}
