import { PrismaClient } from '@/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(
      process.env.DATABASE_URL ?? 'mysql://arbigo:arbigo@127.0.0.1:3306/arbigo',
    ),
  });
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
