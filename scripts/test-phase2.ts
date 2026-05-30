import { startSession } from "../src/app/actions/session";
import { db } from "../src/lib/db";

async function runTests() {
  console.log("=== Phase 2 학생 입장 & 세션 개시 검증 테스트 시작 ===\n");

  const testPayload = {
    grade: "4",
    className: "3반",
    studentName: "홍길동",
    level: "elementary_3_4",
    koreanSentence: "나는 고양이를 좋아해요."
  };

  // 1. 유효성 검증 테스트 (필수 입력값 누락 시 에러 반환)
  console.log("[1/3] 필수 입력값 누락 유효성 테스트 중...");
  try {
    const res = await startSession({ ...testPayload, studentName: "" });
    if (!res.success && res.error) {
      console.log("✓ 유효성 검증 성공: 이름 누락 시 에러 반환 완료\n");
    } else {
      throw new Error("누락 필드가 있음에도 성공 응답 반환됨");
    }
  } catch (error) {
    console.error("✗ 유효성 검증 실패:", error);
    process.exit(1);
  }

  // 2. 학생 및 세션 DB 생성 테스트 (동명이인 처리 포함)
  console.log("[2/3] DB 트랜잭션 및 리다이렉트 예외 우회 테스트 중...");
  try {
    // 이전 테스트 잔재 청소
    await db.query("DELETE FROM students WHERE student_name = $1", ["홍길동"]);
    
    // 첫 번째 세션 생성 시도 -> 리다이렉트 에러가 발생하면 성공
    try {
      await startSession(testPayload);
      throw new Error("리다이렉트가 수행되지 않았습니다.");
    } catch (redirectError: any) {
      // isRedirectError에 의해 리다이렉션 예외(throw)가 그대로 터지는 것이 Next.js 15 Server Action의 사양임.
      if (redirectError.message && redirectError.message.includes("NEXT_REDIRECT")) {
        console.log("✓ 리다이렉션 트리거 감지 성공!");
      } else {
        throw redirectError;
      }
    }

    // DB에 데이터가 잘 적재되었는지 확인
    const student = await db.getOne<{ id: number; level: string }>(
      "SELECT id, level FROM students WHERE student_name = $1 AND class_name = $2",
      ["홍길동", "3반"]
    );
    if (!student) throw new Error("학생 DB 적재 실패");
    console.log(`✓ 학생 정보 생성 완료 (studentId: ${student.id})`);

    const session = await db.getOne<{ id: number; korean_sentence: string }>(
      "SELECT id, korean_sentence FROM writing_sessions WHERE student_id = $1",
      [student.id]
    );
    if (!session) throw new Error("세션 DB 적재 실패");
    console.log(`✓ 세션 정보 생성 완료 (sessionId: ${session.id})`);

    // 3. 학생 정보 재사용 검증 (동일인 재입장 시 ID 유지)
    console.log("\n[3/3] 동일 정보 재입장 시 학생 ID 재사용 테스트 중...");
    const updatedPayload = { ...testPayload, level: "elementary_5_6" };
    try {
      await startSession(updatedPayload);
    } catch (redirectError: any) {
      if (!redirectError.message || !redirectError.message.includes("NEXT_REDIRECT")) {
        throw redirectError;
      }
    }

    const studentsCount = await db.query(
      "SELECT id FROM students WHERE student_name = $1 AND class_name = $2",
      ["홍길동", "3반"]
    );
    if (studentsCount.length !== 1) {
      throw new Error(`동일 학생이 중복 생성되었습니다 (레코드 수: ${studentsCount.length})`);
    }

    const updatedStudent = await db.getOne<{ level: string }>(
      "SELECT level FROM students WHERE student_name = $1 AND class_name = $2",
      ["홍길동", "3반"]
    );
    if (updatedStudent?.level !== "elementary_5_6") {
      throw new Error("학생의 난이도 레벨이 업데이트되지 않았습니다.");
    }

    console.log("✓ 동일 학생 정보 재사용 및 레벨 갱신 검증 완료!\n");

  } catch (error) {
    console.error("✗ DB 생성 검증 실패:", error);
    process.exit(1);
  }

  // 테스트 후 청소
  await db.query("DELETE FROM students WHERE student_name = $1", ["홍길동"]);

  console.log("=== Phase 2 검증 완료 ===");
  process.exit(0);
}

runTests();
