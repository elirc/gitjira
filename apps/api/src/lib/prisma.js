import { PrismaClient } from '@prisma/client';

// LEARN: one PrismaClient for the whole process. Each client owns a
// connection pool; constructing one per request exhausts Postgres
// connections under load. Module scope in ESM = singleton for free.
export const prisma = new PrismaClient();
