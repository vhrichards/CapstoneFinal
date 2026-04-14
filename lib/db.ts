import { Pool } from "pg";

declare global {
  // Reuse pool across hot reloads in development.
  var __plannerMvpPgPool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is not set.");
  }
  return value;
}

export function getDbPool(): Pool {
  if (!global.__plannerMvpPgPool) {
    global.__plannerMvpPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return global.__plannerMvpPgPool;
}

export async function verifyDbConnection() {
  const pool = getDbPool();
  const result = await pool.query<{
    now: string;
    database_name: string;
    current_user: string;
  }>(
    `
      SELECT NOW()::text AS now,
             current_database() AS database_name,
             current_user
    `,
  );
  return result.rows[0];
}
