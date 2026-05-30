import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
}

// Next.js 개발 모드에서 HMR(Hot Module Replacement)에 의한 연결 누수를 방지하기 위해 글로벌 객체에 캐싱
const globalForDb = global as unknown as { dbPool: Pool };

export const pool =
  globalForDb.dbPool ||
  new Pool({
    connectionString,
    max: 10, // 최대 연결 풀 개수 제한
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool;
}

export const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const res = await pool.query(text, params);
    return res.rows;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }
};
