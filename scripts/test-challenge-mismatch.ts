import { db } from "../src/lib/db";
import { startSession, completeSession, getStudentBadges } from "../src/app/actions/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

async function runMismatchTests() {
  console.log("=== 하이브리드 난이도 불일치 및 도전가 뱃지 검증 테스트 시작 ===\n");

  const testStudent = {
    grade: "5",
    className: "1반",
    studentName: "성진선",
    level: "elementary_5_6"
  };

  const hardKoreanSentence = "내가 어제 도서관에서 읽었던 그 소설책은 정말 흥미진진하고 재미있었지만, 내 가장 친한 친구가 강력히 추천해 준 판타지 소설은 다소 지루했다.";

  let studentId: number | null = null;
  let sessionId: number | null = null;

  try {
    // 1. 난이도 불일치 감지 및 추천 문장 생성 테스트 (forceStart = false)
    console.log("[1/4] 복잡한 문장에 대한 난이도 불일치 감지 테스트 중...");
    const checkRes = await startSession({
      grade: testStudent.grade,
      className: testStudent.className,
      studentName: testStudent.studentName,
      level: testStudent.level,
      koreanSentence: hardKoreanSentence,
      forceStart: false
    });

    if (!checkRes.success) {
      throw new Error("startSession Action 호출 실패: " + checkRes.error);
    }

    const data = checkRes.data as any;
    if (data && data.mismatch === true) {
      console.log("✓ 난이도 불일치(mismatch) 정확히 감지 완료!");
      console.log("추천 쉬운 한글 문장:", data.recommendedKorean);
      console.log("추천 쉬운 영어 문장:", data.recommendedEnglish);
    } else {
      throw new Error("복잡한 문장임에도 mismatch가 감지되지 않았습니다.");
    }

    // 2. '어려워도 도전해볼래요' (forceStart = true, isChallenging = true) 강행 세션 발급 테스트
    console.log("\n[2/4] '어려워도 도전해볼래요' 선택 시 강제 세션 발급 테스트 중...");
    
    try {
      await startSession({
        grade: testStudent.grade,
        className: testStudent.className,
        studentName: testStudent.studentName,
        level: testStudent.level,
        koreanSentence: hardKoreanSentence,
        forceStart: true,     // 검사 패스
        isChallenging: true  // 챌린저 모드
      });
      throw new Error("세션 정상 생성 리다이렉트 예외가 발생하지 않았습니다.");
    } catch (err) {
      if (isRedirectError(err)) {
        console.log("✓ '도전' 모드로 세션 발급 성공 및 작문 페이지 리다이렉트 확인!");
      } else {
        throw err;
      }
    }

    // DB에 해당 학생의 세션이 is_challenging = true로 적재되었는지 쿼리 검증
    const student = await db.getOne<{ id: number }>(
      "SELECT id FROM students WHERE student_name = $1 AND class_name = $2",
      [testStudent.studentName, testStudent.className]
    );
    if (!student) throw new Error("학생이 DB에 등록되지 않았습니다.");
    studentId = student.id;

    const session = await db.getOne<{ id: number; is_challenging: boolean }>(
      "SELECT id, is_challenging FROM writing_sessions WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
      [studentId]
    );

    if (!session || session.is_challenging !== true) {
      throw new Error("세션이 도전 모드(is_challenging = true)로 저장되지 않았습니다.");
    }
    sessionId = session.id;
    console.log(`✓ 챌린지 세션 검증 성공 (sessionId: ${sessionId}, is_challenging: ${session.is_challenging})`);

    // 3. 챌린지 세션 최종 완료 및 용감한 도전가 🦁 뱃지 지급 테스트
    console.log("\n[3/4] 챌린지 세션 완료 및 '용감한 도전가' 뱃지 획득 테스트 중...");
    
    try {
      await completeSession(
        sessionId,
        "The novel I read yesterday was interesting, but the fantasy one recommended by my friend was boring.",
        ["grammar"],
        "어렵지만 포기하지 않고 힌트를 따라 끝까지 스스로 써냈어요!"
      );
    } catch (err) {
      if (!isRedirectError(err)) throw err;
    }

    // 뱃지 적재 결과 검증
    const badges = await getStudentBadges(studentId);
    console.log("획득된 누적 뱃지 목록:", badges);
    if (!badges.includes("brave_challenger")) {
      throw new Error("도전 세션을 마쳤으나 brave_challenger 🦁 뱃지가 지급되지 않았습니다.");
    }
    console.log("✓ 용감한 도전가 🦁 뱃지 획득 검증 성공!");

  } catch (error) {
    console.error("\n✗ 테스트 실패:", error);
    await cleanup(studentId);
    process.exit(1);
  }

  // 4. 데이터 정리
  console.log("\n[4/4] 임시 테스트 데이터 정리 중...");
  await cleanup(studentId);
  console.log("✓ 임시 테스트 데이터 정리 완료");
  console.log("\n=== 난이도 불일치 및 챌린지 뱃지 모든 검증 완료! ===");
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

// Gemini API 호출을 위해 환경변수 세팅 상태에서 기동
runMismatchTests();
