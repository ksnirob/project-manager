import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const fallbackDatabaseUrl = "mysql://placeholder:placeholder@127.0.0.1:3306/placeholder";
const databaseUrl = process.env.DATABASE_URL || fallbackDatabaseUrl;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Prisma is using a placeholder URL for build-time import safety.");
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
