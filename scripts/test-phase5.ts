import { db } from "../src/lib/db";

interface TestSessionItem {
  student_id: number;
  student_name: string;
  grade: string;
  class_name: string;
  session_id: number | null;
  korean_sentence: string | null;
  revision_count: number;
  is_overdependent: boolean;
  reflection_tags: string[] | null;
  reflection_text: string | null;
  session_completed_at: Date | null;
}

async function runPhase5Tests() {
  console.log("=== Phase 5 교사 대시보드 데이터 및 쿼리 검증 테스트 시작 ===\n");

  let studentIdA: number | null = null;
  let studentIdB: number | null = null;

  try {
    // 1. 테스트 학생 A, B 생성
    console.log("[1/4] 테스트 학생 A, B 생성 중...");
    const studentResA = await db.getOne<{ id: number }>(
      `INSERT INTO students (grade, class_name, student_name, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["4", "1반", "홍길동", "elementary_3_4"]
    );
    const studentResB = await db.getOne<{ id: number }>(
      `INSERT INTO students (grade, class_name, student_name, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["6", "2반", "심청", "elementary_5_6"]
    );

    if (!studentResA || !studentResB) throw new Error("학생 생성 실패");
    studentIdA = studentResA.id;
    studentIdB = studentResB.id;
    console.log(`✓ 학생 생성 완료 (A: ${studentIdA}, B: ${studentIdB})`);

    // 2. 테스트 세션 생성 (과적합 세션 A / 완료 및 반성 포함 세션 B)
    console.log("\n[2/4] 학생별 테스트 작문 세션 및 반성 데이터 입력 중...");
    
    // 학생 A 세션 (진행중, 과의존)
    await db.query(
      `INSERT INTO writing_sessions (student_id, korean_sentence, revision_count, is_overdependent)
       VALUES ($1, $2, $3, $4)`,
      [studentIdA, "나는 축구를 하고 싶다.", 5, true]
    );

    // 학생 B 세션 (완료됨, 반성 태그/소감 포함)
    await db.query(
      `INSERT INTO writing_sessions (student_id, korean_sentence, first_english_attempt, final_english_sentence, revision_count, is_overdependent, reflection_tags, reflection_text, completed_at, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)`,
      [
        studentIdB,
        "그녀는 책을 읽는 중이다.",
        "She is read book.",
        "She is reading a book.",
        2,
        false,
        ["word_order", "grammar"],
        "어순과 동사 형태의 알맞은 ing 형태를 배웠어요!",
        "훌륭합니다! 힌트를 통해 영어 어순과 동사 변형(-ing)을 잘 깨달았어요."
      ]
    );
    console.log("✓ 테스트 작문 세션 적재 완료");

    // 3. 교사 대시보드용 통합 JOIN 쿼리 실행
    console.log("\n[3/4] 교사용 통합 JOIN 쿼리 실행 및 결과 데이터 검증 중...");
    const sessions = await db.query<TestSessionItem>(
      `SELECT 
         s.id as student_id,
         s.student_name,
         s.grade,
         s.class_name,
         ws.id as session_id,
         ws.korean_sentence,
         ws.revision_count,
         ws.is_overdependent,
         ws.reflection_tags,
         ws.reflection_text,
         ws.completed_at as session_completed_at
       FROM students s
       JOIN writing_sessions ws ON s.id = ws.student_id
       WHERE s.id IN ($1, $2)
       ORDER BY ws.created_at DESC`,
      [studentIdA, studentIdB]
    );

    console.log(`✓ 쿼리 실행 완료 (가져온 테스트 레코드 수: ${sessions.length}개)`);

    // 조회 결과 체크
    const sessionA = sessions.find(s => s.student_id === studentIdA);
    const sessionB = sessions.find(s => s.student_id === studentIdB);

    if (!sessionA || !sessionB) {
      throw new Error("테스트 세션 데이터를 조회하는 데 실패했습니다.");
    }

    // 학생 A 데이터 단언
    if (sessionA.is_overdependent !== true) {
      throw new Error("학생 A의 과의존(is_overdependent = true) 정보가 일치하지 않습니다.");
    }
    if (sessionA.session_completed_at !== null) {
      throw new Error("학생 A의 미완료 상태가 일치하지 않습니다.");
    }

    // 학생 B 데이터 단언
    if (sessionB.is_overdependent !== false) {
      throw new Error("학생 B의 과의존(is_overdependent = false) 정보가 일치하지 않습니다.");
    }
    if (!sessionB.reflection_tags || !sessionB.reflection_tags.includes("word_order") || !sessionB.reflection_tags.includes("grammar")) {
      throw new Error("학생 B의 성장 태그 배열이 올바르게 적재되지 않았습니다.");
    }
    if (sessionB.reflection_text !== "어순과 동사 형태의 알맞은 ing 형태를 배웠어요!") {
      throw new Error("학생 B의 반성 소감이 올바르게 적재되지 않았습니다.");
    }
    if (!sessionB.session_completed_at) {
      throw new Error("학생 B의 완료 타임스탬프 정보가 없습니다.");
    }

    console.log("✓ 개별 학생 데이터 조회 정합성 검증 완료!");

    // 4. 성장 태그 누적 집계 비즈니스 로직 검증
    console.log("\n[4/4] 학급 성장 태그 집계 로직 검증 중...");
    const tagCounts: Record<string, number> = {
      vocabulary: 0,
      word_order: 0,
      grammar: 0,
      confidence: 0,
    };

    sessions.forEach((s) => {
      if (s.reflection_tags && s.reflection_tags.length > 0) {
        s.reflection_tags.forEach((tag) => {
          if (tagCounts[tag] !== undefined) {
            tagCounts[tag]++;
          }
        });
      }
    });

    console.log("집계된 태그 개수:", tagCounts);

    if (tagCounts.word_order !== 1 || tagCounts.grammar !== 1 || tagCounts.vocabulary !== 0 || tagCounts.confidence !== 0) {
      throw new Error("학급 성장 태그 선택 누적 집계가 바르지 않습니다.");
    }

    console.log("✓ 학급 성장 태그 집계 로직 검증 통과!");

  } catch (error) {
    console.error("\n✗ 테스트 실패:", error);
    await cleanup(studentIdA, studentIdB);
    process.exit(1);
  }

  // 데이터 청소
  console.log("\n=== 테스트 데이터 정리 중 ===");
  await cleanup(studentIdA, studentIdB);
  console.log("✓ 테스트 데이터 정리 완료");
  console.log("\n=== Phase 5 모든 검증 완료! ===");
  process.exit(0);
}

async function cleanup(idA: number | null, idB: number | null) {
  const ids = [idA, idB].filter(id => id !== null) as number[];
  if (ids.length > 0) {
    try {
      await db.query("DELETE FROM students WHERE id = ANY($1)", [ids]);
    } catch (err) {
      console.error("데이터 정리 실패:", err);
    }
  }
}

runPhase5Tests();
