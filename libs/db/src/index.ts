import { PrismaClient } from "@prisma/client";
import { logger } from "@acme/logger";

let prisma: PrismaClient;

export function getDbClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "stdout" },
      ],
    });
    prisma.$on("query" as never, (e: any) => {
      if (e.duration > 500) {
        logger.warn({ query: e.query, duration: e.duration }, "Slow query detected");
      }
    });
  }
  return prisma;
}

export async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export { PrismaClient };
