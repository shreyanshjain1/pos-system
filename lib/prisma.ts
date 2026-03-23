import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __vertex_prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__vertex_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  global.__vertex_prisma__ = prisma;
}
