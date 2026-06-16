import { db } from "../src/lib/db";

async function runMigrationTests() {
  console.log("=== 개정된 DB 스키마 필드 검증 테스트 시작 ===\n");

  const testStudentPayload = {
    grade: "초등 5",
    className: "2반",
    studentName: "이순신",
    level: "elementary_5_6"
  };

  let studentId: number | null = null;
  let sessionId: number | null = null;
  let logId: number | null = null;

  try {
    // 1. 테스트 학생 생성
    console.log("[1/4] 테스트 학생 생성 중...");
    const studentRes = await db.getOne<{ id: number }>(
      `INSERT INTO students (grade, class_name, student_name, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testStudentPayload.grade, testStudentPayload.className, testStudentPayload.studentName, testStudentPayload.level]
    );
    
    if (!studentRes) throw new Error("학생 생성 실패");
    studentId = studentRes.id;
    console.log(`✓ 학생 생성 완료 (studentId: ${studentId})`);

    // 2. 개정 필드를 포함하여 writing_sessions 삽입 테스트
    console.log("\n[2/4] 개정 필드(reflection_text, is_overdependent)를 포함한 세션 삽입 테스트 중...");
    const sessionRes = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, reflection_text, is_overdependent)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [studentId, "테스트용 우리말 문장", "AI 힌트를 통해 past tense 규칙을 확실하게 깨달았습니다.", true]
    );

    if (!sessionRes) throw new Error("세션 생성 실패");
    sessionId = sessionRes.id;
    console.log(`✓ 세션 생성 완료 (sessionId: ${sessionId})`);

    // 조회 검증
    const sessionData = await db.getOne<{ reflection_text: string; is_overdependent: boolean }>(
      `SELECT reflection_text, is_overdependent FROM writing_sessions WHERE id = $1`,
      [sessionId]
    );

    if (!sessionData) throw new Error("세션 데이터 조회 실패");
    
    if (sessionData.reflection_text === "AI 힌트를 통해 past tense 규칙을 확실하게 깨달았습니다." && sessionData.is_overdependent === true) {
      console.log("✓ 세션 개정 필드 데이터 정합성 검증 완료!");
    } else {
      throw new Error(`세션 개정 필드 데이터 불일치: reflection_text="${sessionData.reflection_text}", is_overdependent=${sessionData.is_overdependent}`);
    }

    // 3. 개정 필드(detected_errors)를 포함하여 conversation_logs 삽입 테스트
    console.log("\n[3/4] 개정 필드(detected_errors 배열)를 포함한 대화 로그 삽입 테스트 중...");
    const logRes = await db.getOne<{ id: number }>(
      `INSERT INTO conversation_logs (session_id, role, message, detected_errors)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [sessionId, "tutor", "어제 일어난 일이므로 play 뒤에 ed를 붙여보세요.", ["tense", "spelling"]]
    );

    if (!logRes) throw new Error("대화 로그 생성 실패");
    logId = logRes.id;
    console.log(`✓ 대화 로그 생성 완료 (logId: ${logId})`);

    // 조회 검증
    const logData = await db.getOne<{ detected_errors: string[] }>(
      `SELECT detected_errors FROM conversation_logs WHERE id = $1`,
      [logId]
    );

    if (!logData) throw new Error("대화 로그 데이터 조회 실패");

    const errors = logData.detected_errors;
    if (errors && errors.includes("tense") && errors.includes("spelling") && errors.length === 2) {
      console.log("✓ 대화 로그 개정 필드(detected_errors) 배열 정합성 검증 완료!");
    } else {
      throw new Error(`대화 로그 개정 필드 데이터 불일치: detected_errors=${JSON.stringify(errors)}`);
    }

  } catch (error) {
    console.error("\n✗ 테스트 중 오류 발생:", error);
    // 청소 및 에러 종료
    await cleanup(studentId);
    process.exit(1);
  }

  // 4. 임시 테스트 데이터 청소
  console.log("\n[4/4] 임시 테스트 데이터 정리 중...");
  await cleanup(studentId);
  console.log("✓ 임시 테스트 데이터 정리 완료");

  console.log("\n=== 개정 DB 스키마 필드 모든 테스트 통과! ===");
  process.exit(0);
}

async function cleanup(studentId: number | null) {
  if (studentId) {
    try {
      await db.query("DELETE FROM students WHERE id = $1", [studentId]);
    } catch (err) {
      console.error("데이터 정리 실패:", err);
    }
  }
}

runMigrationTests();
