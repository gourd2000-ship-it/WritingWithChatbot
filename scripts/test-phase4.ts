import { db } from "../src/lib/db";
import { completeSession } from "../src/app/actions/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

async function runPhase4Tests() {
  console.log("=== Phase 4 세션 종료 및 피드백 리터러시 검증 테스트 시작 ===\n");

  const testStudentPayload = {
    grade: "초등 5",
    className: "3반",
    studentName: "성춘향",
    level: "elementary_5_6"
  };

  let studentId: number | null = null;
  let sessionId: number | null = null;

  try {
    // 1. 테스트 학생 데이터 삽입
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

    // 2. 테스트 세션 데이터 삽입 (수정 횟수 3회로 가정)
    console.log("\n[2/4] 테스트 작문 세션 생성 중...");
    const sessionRes = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, first_english_attempt, revision_count)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        studentId, 
        "나는 어제 축구를 했다.", 
        "I play soccer yesterday.", 
        3
      ]
    );

    if (!sessionRes) throw new Error("세션 생성 실패");
    sessionId = sessionRes.id;
    console.log(`✓ 세션 생성 완료 (sessionId: ${sessionId})`);

    // 3. completeSession Server Action 호출 (Gemini API 연동 포함)
    console.log("\n[3/4] completeSession Action 호출 (Gemini API 피드백 생성 및 성장 태그 기록)...");
    const testTags = ["vocabulary", "confidence"];
    const testText = "AI 선생님의 힌트 덕분에 play에 ed를 붙여 과거형으로 만드는 규칙을 깨달았어요!";
    
    try {
      await completeSession(
        sessionId,
        "I played soccer yesterday.",
        testTags,
        testText
      );
      // completeSession 내부에서 redirect가 발생하므로 여기 도달하면 실패 (원래 throw 되어야 함)
      throw new Error("리다이렉션이 발생하지 않았습니다.");
    } catch (err: any) {
      if (isRedirectError(err)) {
        console.log("✓ completeSession 정상 호출 및 리다이렉트 신호 수신!");
      } else {
        throw err;
      }
    }

    // 4. DB 저장 데이터 정합성 검증
    console.log("\n[4/4] DB 갱신 결과 검증 중...");
    const updatedSession = await db.getOne<{
      final_english_sentence: string;
      reflection_tags: string[];
      reflection_text: string;
      feedback: string;
      completed_at: Date | null;
    }>(
      `SELECT final_english_sentence, reflection_tags, reflection_text, feedback, completed_at
       FROM writing_sessions
       WHERE id = $1`,
      [sessionId]
    );

    if (!updatedSession) {
      throw new Error("업데이트된 세션 데이터를 찾을 수 없습니다.");
    }

    console.log("\n--- [저장된 데이터 확인] ---");
    console.log("최종 영어 문장:", updatedSession.final_english_sentence);
    console.log("선택 성장 태그:", updatedSession.reflection_tags);
    console.log("자기반성 소감:", updatedSession.reflection_text);
    console.log("완료 시간:", updatedSession.completed_at);
    console.log("AI 정성 피드백:");
    console.log("----------------------------");
    console.log(updatedSession.feedback);
    console.log("----------------------------");

    // 단언(Assert)
    if (updatedSession.final_english_sentence !== "I played soccer yesterday.") {
      throw new Error("최종 영어 문장이 잘못되었습니다.");
    }
    if (!updatedSession.reflection_tags || !updatedSession.reflection_tags.includes("vocabulary") || !updatedSession.reflection_tags.includes("confidence")) {
      throw new Error("성장 태그가 올바르게 저장되지 않았습니다.");
    }
    if (updatedSession.reflection_text !== testText) {
      throw new Error("자기반성 소감이 올바르게 저장되지 않았습니다.");
    }
    if (!updatedSession.feedback || updatedSession.feedback.length < 10) {
      throw new Error("AI 정성 피드백이 생성되지 않았거나 비정상적으로 짧습니다.");
    }
    if (!updatedSession.completed_at) {
      throw new Error("완료 타임스탬프가 기록되지 않았습니다.");
    }

    console.log("\n✓ DB 데이터 정합성 완벽히 검증 완료!");

  } catch (error) {
    console.error("\n✗ 테스트 실패:", error);
    await cleanup(studentId);
    process.exit(1);
  }

  // 정리 작업
  console.log("\n=== 테스트 데이터 정리 중 ===");
  await cleanup(studentId);
  console.log("✓ 테스트 데이터 정리 완료");
  console.log("\n=== Phase 4 모든 검증 완료! ===");
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

// 환경변수 로딩이 올바르게 되었는지 확인 후 실행
runPhase4Tests();
