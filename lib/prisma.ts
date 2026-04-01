import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const parsedDbUrl = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: parsedDbUrl.hostname,
  port: Number(parsedDbUrl.port || 3306),
  user: decodeURIComponent(parsedDbUrl.username),
  password: decodeURIComponent(parsedDbUrl.password),
  database: parsedDbUrl.pathname.replace(/^\//, ""),
});

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
