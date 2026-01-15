import { PrismaClient } from "@prisma/client";

// Next.js automatically loads .env files for server-side code
// No need for manual dotenv loading

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const getPrisma = (): PrismaClient => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Debug: Log environment variable status
  console.log("[Prisma] Initializing client...");
  console.log("[Prisma] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("[Prisma] Available env vars:", Object.keys(process.env).filter(k => !k.startsWith('_')).slice(0, 20));
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Please restart the Next.js dev server after modifying .env"
    );
  }

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};
