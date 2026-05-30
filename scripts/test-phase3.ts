import { db } from "../src/lib/db";
import { sendChatMessage } from "../src/app/actions/chat";

async function runPhase3Tests() {
  console.log("=== Phase 3 작문 대화 및 AI 튜터링 검증 테스트 시작 ===\n");

  const testStudent = {
    grade: "6",
    className: "1반",
    studentName: "강감찬",
    level: "elementary_5_6"
  };

  let studentId: number | null = null;
  let sessionId: number | null = null;

  try {
    // 1. 임시 학생 및 세션 생성
    console.log("[1/4] 임시 학생 및 작문 세션(우리말: 나는 어제 축구를 했다) 생성 중...");
    const studentRes = await db.getOne<{ id: number }>(
      `INSERT INTO students (grade, class_name, student_name, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testStudent.grade, testStudent.className, testStudent.studentName, testStudent.level]
    );
    if (!studentRes) throw new Error("학생 생성 실패");
    studentId = studentRes.id;

    const sessionRes = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, revision_count)
       VALUES ($1, $2, 0)
       RETURNING id`,
      [studentId, "나는 어제 축구를 했다."]
    );
    if (!sessionRes) throw new Error("세션 생성 실패");
    sessionId = sessionRes.id;
    console.log(`✓ 준비 완료 (studentId: ${studentId}, sessionId: ${sessionId})`);

    // 2. 학생의 첫 영어 작문 시도 및 AI 피드백 호출 테스트
    console.log("\n[2/4] 학생의 첫 영어 작문 입력 전송 테스트 중...");
    const studentMessage = "I play soccer yesterday.";
    console.log(`- 학생 입력: "${studentMessage}"`);

    const chatRes1 = await sendChatMessage(sessionId, studentMessage, false);
    
    if (chatRes1.success) {
      console.log("✓ AI 튜터 응답 성공!");
      console.log(`- AI 피드백 내용:\n"${chatRes1.tutorMessage}"`);
      console.log(`- 감지된 오류: ${JSON.stringify(chatRes1.errors)}`);
      console.log(`- 다음 추천 힌트 레벨: ${chatRes1.nextHintLevel}단계`);
      
      // DB에 이력이 잘 써졌는지 검사
      const lastLog = await db.getOne<{ role: string; message: string; hint_level: number; detected_errors: string[] }>(
        `SELECT role, message, hint_level, detected_errors 
         FROM conversation_logs 
         WHERE session_id = $1 AND role = 'tutor' 
         ORDER BY created_at DESC LIMIT 1`,
        [sessionId]
      );
      
      if (lastLog && lastLog.detected_errors) {
        console.log("✓ DB 대화 로그 적재 및 detected_errors 배열 보관 성공!");
      } else {
        throw new Error("DB 대화 로그 적재 상태가 유효하지 않습니다.");
      }
    } else {
      throw new Error(`AI 호출 실패: ${chatRes1.error}`);
    }

    // 3. 힌트 요청 및 연속 고강도 힌트 과의존 탐지 검증
    console.log("\n[3/4] 힌트 요청 연동 및 과의존(Overdependence) 탐지 검증 중...");
    
    // 강제로 4단계와 5단계 대화 로그를 DB에 삽입하여 연속 2회 이상 고강도 힌트 상태 유도
    console.log("- 모의로 4단계(단어카드), 5단계(문장틀) 힌트 2개 턴을 연속 적재합니다...");
    await db.query(
      `INSERT INTO conversation_logs (session_id, role, message, hint_level, hint_type)
       VALUES ($1, 'tutor', '단어 칩: play, yesterday', 4, 'vocabulary'),
              ($1, 'tutor', 'I + play__ + soccer + yesterday.', 5, 'blank_frame')`,
      [sessionId]
    );

    // 다시 힌트를 요청해본다 -> 과의존 플래그 활성화가 일어나야 함.
    console.log("- 추가 힌트 요청 실행...");
    const chatRes2 = await sendChatMessage(sessionId, "", true);

    if (chatRes2.success) {
      console.log(`- 힌트 응답 내용:\n"${chatRes2.tutorMessage}"`);
      console.log(`- 과의존 감지 결과 (isOverdependent): ${chatRes2.isOverdependent}`);
      
      // 세션 테이블에 과의존 플래그가 잘 박혔는지 확인
      const sessionVerify = await db.getOne<{ is_overdependent: boolean }>(
        "SELECT is_overdependent FROM writing_sessions WHERE id = $1",
        [sessionId]
      );
      
      if (sessionVerify && sessionVerify.is_overdependent === true) {
        console.log("✓ 고강도 힌트 연속 요청에 의한 과의존(Overdependence) 탐지 및 DB 갱신 성공!");
      } else {
        throw new Error("세션 과의존 플래그 갱신 실패");
      }
    } else {
      throw new Error(`힌트 호출 실패: ${chatRes2.error}`);
    }

  } catch (error) {
    console.error("\n✗ Phase 3 검증 중 오류 발생:", error);
    await cleanup(studentId);
    process.exit(1);
  }

  // 4. 데이터 청소
  console.log("\n[4/4] 임시 테스트 데이터 정리 중...");
  await cleanup(studentId);
  console.log("✓ 임시 테스트 데이터 정리 완료");

  console.log("\n=== Phase 3 모든 핵심 기능 및 AI 연동 테스트 통과! ===");
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

runPhase3Tests();
