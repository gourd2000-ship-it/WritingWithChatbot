import { db } from "../src/lib/db";
import { startSession } from "../src/app/actions/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

async function runHighSchoolTests() {
  console.log("=== 고등학생(High School) 수준 추가 기능 통합 테스트 시작 ===\n");

  const testStudent = {
    grade: "10", // 고등학교 1학년 상당
    className: "3반",
    studentName: "고등테스터",
    level: "high_school"
  };

  let studentId: number | null = null;

  try {
    // 1. 지나치게 쉬운 문장 입력 (Under-challenge Mismatch) 테스트
    console.log("[1/3] 지나치게 쉬운 문장에 대한 Under-challenge mismatch 감지 테스트 중...");
    const easySentence = "나는 사과를 좋아한다.";
    const easyRes = await startSession({
      grade: testStudent.grade,
      className: testStudent.className,
      studentName: testStudent.studentName,
      level: testStudent.level,
      koreanSentence: easySentence,
      forceStart: false
    });

    if (easyRes.success && easyRes.data && (easyRes.data as any).mismatch === true) {
      console.log("✓ Under-challenge mismatch가 정확히 감지되었습니다!");
      console.log("  추천 심화 한글 문장:", (easyRes.data as any).recommendedKorean);
      console.log("  추천 심화 영어 문장:", (easyRes.data as any).recommendedEnglish);
    } else {
      throw new Error("고등학생 수준에서 지나치게 쉬운 문장임에도 mismatch가 감지되지 않았습니다.");
    }

    // 2. 대학 원서/논문 수준의 과도한 문장 입력 (Academic Mismatch) 테스트
    console.log("\n[2/3] 대학 논문 수준의 Academic mismatch 감지 테스트 중...");
    const academicSentence = "양자역학의 확률론적 해석에 의하면 관찰 행위 자체가 물리적 계의 고유한 파동함수를 돌이킬 수 없이 붕괴시키며, 이는 결정론적 고전물리학 체계를 근본적으로 폐기한다.";
    const academicRes = await startSession({
      grade: testStudent.grade,
      className: testStudent.className,
      studentName: testStudent.studentName,
      level: testStudent.level,
      koreanSentence: academicSentence,
      forceStart: false
    });

    if (academicRes.success && academicRes.data && (academicRes.data as any).mismatch === true) {
      console.log("✓ Academic Mismatch가 정확히 감지되었습니다!");
      console.log("  추천 고교 수준 한글 문장:", (academicRes.data as any).recommendedKorean);
      console.log("  추천 고교 수준 영어 문장:", (academicRes.data as any).recommendedEnglish);
    } else {
      throw new Error("지나치게 과도하게 학술적인 문장임에도 mismatch가 감지되지 않았습니다.");
    }

    // 3. 적절한 고등학생 수준 문장 입력 시 정상 세션 개시 확인 테스트
    console.log("\n[3/3] 적절한 고교 수준 문장 입력 시 정상 세션 개시 테스트 중...");
    const normalSentence = "만약 내가 그때 그 도전적인 기회를 잡았더라면, 나의 미래는 완전히 다른 방향으로 흘러갔을지도 모른다.";
    
    try {
      await startSession({
        grade: testStudent.grade,
        className: testStudent.className,
        studentName: testStudent.studentName,
        level: testStudent.level,
        koreanSentence: normalSentence,
        forceStart: false
      });
      throw new Error("정상 발급 리다이렉션 예외가 발생하지 않았습니다.");
    } catch (err) {
      if (isRedirectError(err)) {
        console.log("✓ 고교 수준의 적절한 문장에 대해 정상 세션 발급 및 작문 페이지 리다이렉트 성공 확인!");
      } else {
        throw err;
      }
    }

    // DB 등록 여부 검토 후 데이터 삭제
    const student = await db.getOne<{ id: number }>(
      "SELECT id FROM students WHERE student_name = $1 AND class_name = $2",
      [testStudent.studentName, testStudent.className]
    );
    if (student) {
      studentId = student.id;
    }

  } catch (error) {
    console.error("\n✗ 테스트 실패:", error);
    await cleanup(studentId);
    process.exit(1);
  }

  // 데이터 정리
  await cleanup(studentId);
  console.log("\n=== 고등학생 수준 추가 기능의 모든 시나리오 검증 완료! ===");
  process.exit(0);
}

async function cleanup(studentId: number | null) {
  if (studentId) {
    try {
      console.log("임시 테스트 데이터를 정리하는 중...");
      await db.query("DELETE FROM students WHERE id = $1", [studentId]);
      console.log("✓ 임시 테스트 데이터 정리 완료");
    } catch (err) {
      console.error("데이터 정리 실패:", err);
    }
  }
}

// 환경변수를 로드한 상태에서 실행해야 함
runHighSchoolTests();
