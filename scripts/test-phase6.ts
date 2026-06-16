import { db } from "../src/lib/db";
import { completeSession, getStudentBadges } from "../src/app/actions/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

async function runPhase6Tests() {
  console.log("=== Phase 6 성장 뱃지 시스템 검증 테스트 시작 ===\n");

  const testStudent = {
    grade: "초등 6",
    className: "4반",
    studentName: "홍길동",
    level: "elementary_5_6"
  };

  let studentId: number | null = null;
  let sessionIds: number[] = [];

  try {
    // 1. 테스트 학생 생성
    console.log("[1/6] 테스트 학생 생성 중...");
    const studentRes = await db.getOne<{ id: number }>(
      `INSERT INTO students (grade, class_name, student_name, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testStudent.grade, testStudent.className, testStudent.studentName, testStudent.level]
    );

    if (!studentRes) throw new Error("학생 생성 실패");
    studentId = studentRes.id;
    console.log(`✓ 학생 생성 완료 (studentId: ${studentId})`);

    // 2. [케이스 1] 끈기 대장 뱃지 검증 (수정 횟수 4회)
    console.log("\n[2/6] 테스트 케이스 1: 끈기 대장 뱃지 검증...");
    const sessionRes1 = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, first_english_attempt, revision_count)
       VALUES ($1, $2, $3, 4)
       RETURNING id`,
      [studentId, "나는 어제 축구를 했다.", "I play soccer yesterday."]
    );
    if (!sessionRes1) throw new Error("세션 1 생성 실패");
    sessionIds.push(sessionRes1.id);

    try {
      await completeSession(
        sessionRes1.id,
        "I played soccer yesterday.",
        ["grammar"],
        "짧은소감"
      );
    } catch (err) {
      if (!isRedirectError(err)) throw err;
    }

    let badges = await getStudentBadges(studentId);
    console.log("획득된 뱃지:", badges);
    if (!badges.includes("persistence_master")) {
      throw new Error("수정 횟수 4회임에도 persistence_master 뱃지가 지급되지 않았습니다.");
    }
    console.log("✓ 끈기 대장 뱃지 조건 지급 검증 성공!");

    // 3. [케이스 2] 어휘 탐험가 뱃지 검증 (6자 이상 단어 3개 사용: played, football, yesterday)
    console.log("\n[3/6] 테스트 케이스 2: 어휘 탐험가 뱃지 검증...");
    const sessionRes2 = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, first_english_attempt, revision_count)
       VALUES ($1, $2, $3, 1)
       RETURNING id`,
      [studentId, "그들은 어제 축구를 했다.", "They play soccer yesterday."]
    );
    if (!sessionRes2) throw new Error("세션 2 생성 실패");
    sessionIds.push(sessionRes2.id);

    try {
      await completeSession(
        sessionRes2.id,
        "They played football yesterday.", // played(6자), football(8자), yesterday(9자) -> 3개
        ["vocabulary"],
        "단어획득"
      );
    } catch (err) {
      if (!isRedirectError(err)) throw err;
    }

    badges = await getStudentBadges(studentId);
    console.log("획득된 뱃지:", badges);
    if (!badges.includes("word_explorer")) {
      throw new Error("6자 이상 단어 3개 사용했으나 word_explorer 뱃지가 지급되지 않았습니다.");
    }
    console.log("✓ 어휘 탐험가 뱃지 조건 지급 검증 성공!");

    // 4. [케이스 3 & 4] 스스로 일어서기 + 성장 메아리 뱃지 검증
    console.log("\n[4/6] 테스트 케이스 3 & 4: 스스로 일어서기 및 성장 메아리 뱃지 검증...");
    const sessionRes3 = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, first_english_attempt, revision_count, is_overdependent)
       VALUES ($1, $2, $3, 1, false)
       RETURNING id`,
      [studentId, "그녀는 책을 읽는다.", "She read book."]
    );
    if (!sessionRes3) throw new Error("세션 3 생성 실패");
    sessionIds.push(sessionRes3.id);

    // 4단계 이상 힌트 이력이 없으므로 self_reliant 자격 충족
    // 30자 이상의 소감을 성실히 적어 active_reflector 자격 충족
    const longRefText = "오늘 배운 내용을 스스로 꼼꼼하게 복습하고 반성하며, 앞으로 영어 문장을 더 자신 있게 스스로 작성할 수 있게 되어서 매우 뿌듯하고 기쁩니다."; // 70자
    
    try {
      await completeSession(
        sessionRes3.id,
        "She reads a book.",
        ["grammar"],
        longRefText
      );
    } catch (err) {
      if (!isRedirectError(err)) throw err;
    }

    badges = await getStudentBadges(studentId);
    console.log("획득된 뱃지:", badges);
    if (!badges.includes("self_reliant")) {
      throw new Error("과적합이 없고 힌트 미사용인데 self_reliant 뱃지가 지급되지 않았습니다.");
    }
    if (!badges.includes("active_reflector")) {
      throw new Error("소감 30자 이상 성실 작성하였으나 active_reflector 뱃지가 지급되지 않았습니다.");
    }
    console.log("✓ 스스로 일어서기 및 성장 메아리 뱃지 조건 지급 검증 성공!");

    // 5. [케이스 5] 차근차근 3회 뱃지 검증 (세션 1, 2, 3이 완료되었으므로 누적 성공 3회 달성됨)
    console.log("\n[5/6] 테스트 케이스 5: 차근차근 3회 (steady_3) 뱃지 검증...");
    if (!badges.includes("steady_3")) {
      throw new Error("누적 3회 완료 성공했으나 steady_3 뱃지가 지급되지 않았습니다.");
    }
    console.log("✓ 차근차근 3회 완료 뱃지 자동 획득 검증 성공!");

    // 6. DB 중복 삽입 방지 검증 (동일 뱃지 중복 지급 방지 제약조건 테스트)
    console.log("\n[6/6] 중복 지급 방지 제약조건(Unique Constraint) 검증...");
    try {
      await db.query(
        `INSERT INTO student_badges (student_id, badge_code) VALUES ($1, $2)`,
        [studentId, "persistence_master"]
      );
      throw new Error("Unique 제약조건이 작동하지 않고 중복 기입되었습니다.");
    } catch (err: any) {
      if (err.code === "23505") { // PostgreSQL unique violation code
        console.log("✓ 중복 지급 시 DB 유니크 제약 에러 차단 확인 완료!");
      } else {
        throw err;
      }
    }

    console.log("\n=== 성장 뱃지 시스템 모든 유닛 테스트 검과 통과! ===");

  } catch (error) {
    console.error("\n✗ 테스트 실패:", error);
    await cleanup(studentId);
    process.exit(1);
  }

  // 데이터 청소
  await cleanup(studentId);
  console.log("\n=== Phase 6 모든 검증 완료! ===");
  process.exit(0);
}

async function cleanup(studentId: number | null) {
  if (studentId) {
    try {
      console.log("임시 테스트 데이터 정리 중...");
      await db.query("DELETE FROM students WHERE id = $1", [studentId]);
      console.log("✓ 임시 테스트 데이터 정리 완료");
    } catch (err) {
      console.error("데이터 정리 실패:", err);
    }
  }
}

runPhase6Tests();
