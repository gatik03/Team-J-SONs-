import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import { signToken } from '../../common/auth';
import type { LoginInput, LoginResponse } from './schemas';

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.appUser.findUnique({
    where: { username: input.username },
  });

  if (!user || input.password !== 'password') {
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
