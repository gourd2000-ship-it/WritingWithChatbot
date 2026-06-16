"use server";

import { db } from "@/lib/db";
import { buildChatContext, ChatMessage } from "@/lib/promptBuilder";
import { filterTutorResponse } from "@/lib/safetyFilter";
import { OpenAI } from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new OpenAI({
    apiKey: apiKey || "dummy_key",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export interface ChatActionResponse {
  success: boolean;
  tutorMessage?: string;
  errors?: string[];
  nextHintLevel?: number;
  isOverdependent?: boolean;
  error?: string;
}

/**
 * 학생의 메시지 전송 또는 힌트 요청을 받아 AI 피드백을 생성하고 DB에 로깅합니다.
 * @param sessionId 작문 세션 ID
 * @param studentMessage 학생이 입력한 영어 문장 (힌트 요청인 경우 빈 값 가능)
 * @param isHintRequest 단순히 "힌트 더 받기" 버튼을 누른 것인지 여부
 */
export async function sendChatMessage(
  sessionId: number,
  studentMessage: string,
  isHintRequest: boolean
): Promise<ChatActionResponse> {
  try {
    if (!sessionId) {
      return { success: false, error: "세션 ID가 유효하지 않습니다." };
    }

    // 1. 세션 및 학생 정보 로드
    const session = await db.getOne<{
      student_id: number;
      korean_sentence: string;
      first_english_attempt: string | null;
      is_overdependent: boolean;
      revision_count: number;
    }>(
      "SELECT student_id, korean_sentence, first_english_attempt, is_overdependent, revision_count FROM writing_sessions WHERE id = $1",
      [sessionId]
    );

    if (!session) {
      return { success: false, error: "존재하지 않는 작문 세션입니다." };
    }

    const student = await db.getOne<{ level: string }>(
      "SELECT level FROM students WHERE id = $1",
      [session.student_id]
    );

    if (!student) {
      return { success: false, error: "학생 정보를 찾을 수 없습니다." };
    }

    // 2. 이전 대화 로그 로드 (순서대로 정렬)
    const rawLogs = await db.query<{
      role: string;
      message: string;
      hint_level: number;
    }>(
      `SELECT role, message, hint_level 
       FROM conversation_logs 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const tutorLogs = rawLogs.filter((l) => l.role === "tutor");
    const lastTutorHintLevel =
      tutorLogs.length > 0 ? tutorLogs[tutorLogs.length - 1].hint_level : 0;

    // 3. 과의존 감지 (Overdependence Detection) 및 상태 갱신
    // 힌트 요청인 경우, 직전 연속 2회 힌트 레벨이 4(Vocabulary) 또는 5(Blank Frame)였는지 판단
    let isOverdependent = session.is_overdependent;
    if (isHintRequest) {
      if (tutorLogs.length >= 2) {
        const last1 = tutorLogs[tutorLogs.length - 1].hint_level;
        const last2 = tutorLogs[tutorLogs.length - 2].hint_level;
        if (last1 >= 4 && last2 >= 4) {
          isOverdependent = true;
          // 세션 테이블 과의존 플래그 갱신
          await db.query(
            "UPDATE writing_sessions SET is_overdependent = TRUE WHERE id = $1",
            [sessionId]
          );
        }
      }
    }

    // 4. 이번에 적용할 힌트 레벨 산출 (하이브리드 Fading 및 과의존 락아웃 정책 반영)
    let targetHintLevel = 1;
    let overdependenceNotice = "";

    if (isHintRequest) {
      if (isOverdependent) {
        // [처치] 과의존이 감지된 학생은 4단계 이상 힌트(단어칩, 문장틀) 제공을 원천 차단하고
        // 최대 3단계(가벼운 개념 설명)로 고정(Lock)하여 스스로 해결하도록 책임 이양을 유도함.
        targetHintLevel = Math.min(3, (lastTutorHintLevel || 0) + 1);
        overdependenceNotice = 
          "\n\n💡 **[AI 튜터 주의]** 힌트에 조금 너무 기대고 있어요! 친구의 멋진 생각을 발휘할 수 있도록 이번에는 문장 틀 대신 가벼운 설명만 줄게요. 스스로 채워볼까요?";
      } else {
        // 정상 흐름: 힌트 단계 순차 상승
        targetHintLevel = Math.min(5, (lastTutorHintLevel || 0) + 1);
      }
    } else {
      // [하이브리드 Fading]: 학생이 힌트 요청이 아니라 직접 고쳐서 작성해 보낸 경우(Progress),
      // 이전 힌트 레벨이 4~5였을지라도, 시스템은 강제로 힌트 레벨을 2단계(오류 위치 표시)로 하향 조정하여 
      // 도움 수위를 확실하게 Fading합니다.
      targetHintLevel = 2;
    }

    // 5. 프롬프트 및 컨텍스트 조립
    const promptConfig = {
      level: student.level,
      koreanSentence: session.korean_sentence,
      hintLevel: targetHintLevel,
    };

    // 대화 이력 빌드
    const chatContext = buildChatContext(promptConfig, rawLogs);

    // 학생이 신규 작성해서 전송한 것이라면 컨텍스트 끝에 추가
    if (!isHintRequest && studentMessage.trim() !== "") {
      chatContext.push({
        role: "user",
        content: studentMessage,
      });
    } else if (isHintRequest) {
      // 힌트 요청인 경우 시스템 명령 턴을 한 번 덧붙여 명확한 힌트 카드 생성을 유도
      chatContext.push({
        role: "user",
        content: `[시스템 힌트 요청]: 현재 힌트 단계인 ${targetHintLevel}단계 가이드라인에 맞춰 제게 영어 문장 힌트를 주세요. 정답을 보여주지 마세요.`,
      });
    }

    // 6. Gemini API 호출 (OpenAI SDK 호환 엔드포인트 활용)
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gemini-2.5-flash",
      messages: chatContext as any,
      temperature: 0.3,
    });

    let aiResponse = completion.choices[0]?.message?.content || "";

    // 7. 출력 검증기 (Safety Filter) 및 용어 필터 작동
    aiResponse = filterTutorResponse(aiResponse);

    // 8. 메타데이터 파싱 (오류 종류, 힌트 수위 추출 - 방어적 정규식 적용)
    const errorRegex = /\[ERRORS:\s*([^\]]+)\]/i;
    const hintRegex = /(?:\[RECOMMENDED_HINT_LEVEL|\[RECOMMENDED_HINT_LEVEL:)\s*([1-5])\]?/i;

    const errorMatch = aiResponse.match(errorRegex);
    const hintMatch = aiResponse.match(hintRegex);

    // 에러 리스트 추출
    let detectedErrors: string[] = [];
    if (errorMatch) {
      const errorsStr = errorMatch[1].trim();
      if (errorsStr.toLowerCase() !== "none") {
        detectedErrors = errorsStr
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e !== "");
      }
    }

    // 튜터가 동적으로 결정한 다음 힌트 단계 (Fading 적용 결과)
    let finalHintLevel = targetHintLevel;
    if (hintMatch) {
      finalHintLevel = parseInt(hintMatch[1]);
    }

    // 메타데이터 태그 본문에서 삭제 (화면 노출 차단)
    aiResponse = aiResponse
      .replace(errorRegex, "")
      .replace(hintRegex, "")
      .trim();

    // 과의존 학생 힌트 제한 시 강제 통제 문구 삽입
    if (isHintRequest && isOverdependent && overdependenceNotice !== "") {
      // Hattie의 "💡 [다음 힌트]" 단락 아래에 주의 문구 추가
      if (aiResponse.includes("💡 [다음 힌트]")) {
        aiResponse = aiResponse.replace("💡 [다음 힌트]", `💡 [다음 힌트]${overdependenceNotice}`);
      } else {
        aiResponse = aiResponse + overdependenceNotice;
      }
    }

    // 9. DB 적재 처리
    // 학생이 신규 작성한 글이 있을 때 학생의 발화 로그 저장
    if (!isHintRequest && studentMessage.trim() !== "") {
      await db.query(
        `INSERT INTO conversation_logs (session_id, role, message, hint_level, hint_type) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, "student", studentMessage, 0, "draft"]
      );

      // 세션 테이블의 최초 시도 문장 기록 및 수정 횟수 증가
      const nextRevisionCount = session.revision_count + 1;
      if (!session.first_english_attempt) {
        await db.query(
          `UPDATE writing_sessions 
           SET first_english_attempt = $1, revision_count = $2 
           WHERE id = $3`,
          [studentMessage, nextRevisionCount, sessionId]
        );
      } else {
        await db.query(
          `UPDATE writing_sessions 
           SET revision_count = $1 
           WHERE id = $2`,
          [nextRevisionCount, sessionId]
        );
      }
    }

    // 튜터의 답변 로그 저장
    const hintTypes = ["meaning", "position", "grammar", "vocabulary", "blank_frame"];
    const currentHintTypeStr = hintTypes[finalHintLevel - 1] || "meaning";

    await db.query(
      `INSERT INTO conversation_logs (session_id, role, message, hint_level, hint_type, detected_errors) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, "tutor", aiResponse, finalHintLevel, currentHintTypeStr, detectedErrors]
    );

    return {
      success: true,
      tutorMessage: aiResponse,
      errors: detectedErrors,
      nextHintLevel: finalHintLevel,
      isOverdependent: isOverdependent,
    };
  } catch (error: any) {
    console.error("sendChatMessage 오류 발생:", error);
    return {
      success: false,
      error: error.message || "튜터링 답변 생성에 실패했습니다.",
    };
  }
}
