import * as fs from "fs";
import * as path from "path";
import { db } from "../src/lib/db";

// .env.local 로드
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Failed to load .env.local:", err);
}

async function runMigration() {
  console.log("=== [Grade 마이그레이션 시작] ===");
  
  try {
    // 1. elementary_3_4 (초등 3~4학년)
    console.log("1. 초등 3~4학년(elementary_3_4) 마이그레이션 수행 중...");
    await db.query(`
      UPDATE students
      SET grade = CASE 
        WHEN grade = '3' THEN '초등 3'
        WHEN grade = '4' THEN '초등 4'
        ELSE '초등 3'
      END
      WHERE level = 'elementary_3_4' AND grade NOT LIKE '초등%' AND grade NOT LIKE '중등%' AND grade NOT LIKE '고등%'
    `);
    console.log(`✓ 초등 3~4학년 업데이트 완료`);

    // 2. elementary_5_6 (초등 5~6학년)
    console.log("2. 초등 5~6학년(elementary_5_6) 마이그레이션 수행 중...");
    await db.query(`
      UPDATE students
      SET grade = CASE 
        WHEN grade = '5' THEN '초등 5'
        WHEN grade = '6' THEN '초등 6'
        ELSE '초등 5'
      END
      WHERE level = 'elementary_5_6' AND grade NOT LIKE '초등%' AND grade NOT LIKE '중등%' AND grade NOT LIKE '고등%'
    `);
    console.log(`✓ 초등 5~6학년 업데이트 완료`);

    // 3. middle_school (중학생)
    console.log("3. 중학생(middle_school) 마이그레이션 수행 중...");
    await db.query(`
      UPDATE students
      SET grade = CASE 
        WHEN grade IN ('7', '1') THEN '중등 1'
        WHEN grade IN ('8', '2') THEN '중등 2'
        WHEN grade IN ('9', '3') THEN '중등 3'
        ELSE '중등 1'
      END
      WHERE level = 'middle_school' AND grade NOT LIKE '초등%' AND grade NOT LIKE '중등%' AND grade NOT LIKE '고등%'
    `);
    console.log(`✓ 중학생 업데이트 완료`);

    // 4. high_school (고등학생)
    console.log("4. 고등학생(high_school) 마이그레이션 수행 중...");
    await db.query(`
      UPDATE students
      SET grade = CASE 
        WHEN grade IN ('10', '1') THEN '고등 1'
        WHEN grade IN ('11', '2') THEN '고등 2'
        WHEN grade IN ('12', '3') THEN '고등 3'
        ELSE '고등 1'
      END
      WHERE level = 'high_school' AND grade NOT LIKE '초등%' AND grade NOT LIKE '중등%' AND grade NOT LIKE '고등%'
    `);
    console.log(`✓ 고등학생 업데이트 완료`);

    // 5. 기타 매치되지 않은 숫자 학년들 일괄 예외 처리 (예: 그냥 '4' 등)
    console.log("5. 기타 매치되지 않은 학년 데이터 예외 처리 중...");
    await db.query(`
      UPDATE students SET grade = '초등 3' WHERE grade = '3';
      UPDATE students SET grade = '초등 4' WHERE grade = '4';
      UPDATE students SET grade = '초등 5' WHERE grade = '5';
      UPDATE students SET grade = '초등 6' WHERE grade = '6';
    `);
    console.log("✓ 예외 처리 완료");

    console.log("\n=== [Grade 마이그레이션 완료] ===");
    process.exit(0);
  } catch (err) {
    console.error("✗ 마이그레이션 오류 발생:", err);
    process.exit(1);
  }
}

runMigration();
