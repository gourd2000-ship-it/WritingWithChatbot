import { Pool } from "pg";

// Next.js 개발 모드에서 HMR(Hot Module Replacement)에 의한 연결 누수를 방지하기 위해 글로벌 객체에 캐싱
const globalForDb = global as unknown as { dbPool: Pool };

export function getPool(): Pool {
  if (globalForDb.dbPool) {
    return globalForDb.dbPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL 환경 변수가 설정되지 않았습니다. 임시 더미 연결을 구성합니다. (Next.js 빌드 시점일 수 있습니다)");
    return new Pool({
      connectionString: "postgresql://dummy:dummy@localhost:5432/dummy",
      max: 1,
      idleTimeoutMillis: 1000,
    });
  }

  const pool = new Pool({
    connectionString,
    max: 10, // 최대 연결 풀 개수 제한
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // HMR 누수 및 싱글톤 유지 방지
  globalForDb.dbPool = pool;
  return pool;
}

export const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = getPool();
    const res = await pool.query(text, params);
    return res.rows;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }
};
