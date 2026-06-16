"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { OpenAI } from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new OpenAI({
    apiKey: apiKey || "dummy_key",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export interface StartSessionInput {
  grade: string;
  className: string;
  studentName: string;
  level: string; // 'elementary_3_4' | 'elementary_5_6' | 'middle_school' | 'high_school'
  koreanSentence: string;
  forceStart?: boolean;   // [신규] 난이도 불일치 무시하고 강제 시작 여부
  isChallenging?: boolean; // [신규] 어려운 문장 도전 여부
}

export interface StartSessionResult {
  mismatch: boolean;
  recommendedKorean?: string;
  recommendedEnglish?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 학생 입장 정보를 저장하고 세션을 시작하여 대화 페이지로 리다이렉트합니다.
 * 난이도 불일치 시에는 리다이렉트 없이 불일치 및 추천 문장 정보를 반환합니다.
 */
export async function startSession(input: StartSessionInput): Promise<ActionResponse<StartSessionResult | void>> {
  const { grade, className, studentName, level, koreanSentence, forceStart = false, isChallenging = false } = input;

  if (!grade || !className || !studentName || !level || !koreanSentence) {
    return { success: false, error: "모든 칸을 알맞게 채워주세요!" };
  }

  try {
    // 1. 난이도 불일치 검사 수행 (forceStart가 false이고 초등/고등 레벨일 때만 검사)
    if (!forceStart && (level === "elementary_3_4" || level === "elementary_5_6" || level === "high_school")) {
      try {
        let levelGuide = "";
        if (level === "elementary_3_4") {
          levelGuide = "초등학교 3~4학년 (간단한 단문, 3~5단어 위주, 현재시제/진행형, 극도로 쉬운 문장)";
        } else if (level === "elementary_5_6") {
          levelGuide = "초등학교 5~6학년 (간단한 단문/기본문장, 5~8단어 위주, 과거시제/미래시제/조동사 can,will 등)";
        } else {
          levelGuide = "고등학교 수준 (가정법 과거/과거완료, 조동사 완료 should have p.p., 관계사 계속적 용법, 분사구문 등 성취기준 문장)";
        }

        const prompt = `당신은 영어 교육과정 평가 전문가입니다.
제시된 한글 문장이 지정된 학년 영어 수준의 학습자에게 적합한 작문 난이도인지 검증하고, 너무 어렵거나 쉬워 불일치(Mismatch)가 발생한다면 적절한 추천 문장을 제안해 주세요.

[검사 정보]
- 학습자 학년 수준 가이드: ${levelGuide}
- 작문하려는 우리말 뜻: "${koreanSentence}"
- 현재 선택한 레벨 키값: "${level}"

[판정 및 추천 규칙]
1. 초등 수준('elementary_3_4', 'elementary_5_6') 판정:
   - 제시된 우리말 뜻을 영어로 표현할 때, 다중 관계대명사절, 수동태, 복잡한 완료 시제, 혹은 중고등/B2 수준의 어려운 어휘가 들어가는 복잡한 문장인 경우 부적합(suitable = false)으로 판정합니다.
2. 고등 수준('high_school') 판정 (양방향 불일치):
   - **과도한 난이도 (Academic Mismatch)**: 대학 전공 서적이나 학술 논문 수준의 C1~C2 어휘, 과도하게 장황한 다중 내포절(15단어 이상) 등 고등학생이 힌트를 받아도 완성하기 불가능한 문장인 경우 부적합(suitable = false)으로 판정합니다.
   - **지나치게 쉬운 난이도 (Under-challenge Mismatch)**: 초등 3~4학년 수준의 지극히 단순한 문장(예: "나는 행복하다", "이것은 사과다")인 경우, 부적합(suitable = false)으로 판정하고, 관계대명사, 가정법, 이유/대조 부사절 등을 결합하여 고교 성취기준에 알맞고 세련된 도전 문장으로 업그레이드하여 추천해 주십시오. (예: "나는 행복하다" -> "비록 시험 공부가 피곤하긴 했지만, 마침내 오늘 시험이 끝나서 아주 행복하다.")
3. 부적합(suitable = false)인 경우, 원래 뜻과 맥락상 최대한 비슷하되 해당 학년 수준에 알맞은 **"쉬운 또는 발전된 추천 우리말 문장(recommendedKorean)"**과 그에 대응하는 **"추천 영어 문장(recommendedEnglish)"**을 새로 작성해 제공하십시오.
4. 적합(suitable = true)한 경우 suitable을 true로 하고 recommendedKorean과 recommendedEnglish는 빈 문자열로 하십시오.
5. 오직 아래의 JSON 포맷으로만 응답해야 하며 다른 메타 텍스트는 절대 금지합니다.

JSON 포맷:
{
  "suitable": false,
  "recommendedKorean": "추천 우리말 문장",
  "recommendedEnglish": "recommended english sentence"
}
`;

        const completion = await getOpenAIClient().chat.completions.create({
          model: "gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const resText = completion.choices[0]?.message?.content || "";
        const resJson = JSON.parse(resText);

        if (resJson.suitable === false) {
          return {
            success: true,
            data: {
              mismatch: true,
              recommendedKorean: resJson.recommendedKorean,
              recommendedEnglish: resJson.recommendedEnglish
            }
          };
        }
      } catch (err) {
        console.error("난이도 판정 API 오류 (무시하고 적합 간주):", err);
      }
    }

    // 2. 기존 학생이 있는지 학년, 반, 이름으로 확인 (동명이인 및 기존 학생 재사용 처리)
    let studentId: number;
    const existingStudent = await db.getOne<{ id: number }>(
      `SELECT id FROM students 
       WHERE grade = $1 AND class_name = $2 AND student_name = $3`,
      [grade, className, studentName]
    );

    if (existingStudent) {
      studentId = existingStudent.id;
      // 난이도 수준 변경이 있을 수 있으므로 학생 레벨 업데이트
      await db.query(
        "UPDATE students SET level = $1 WHERE id = $2",
        [level, studentId]
      );
    } else {
      // 신규 학생 정보 삽입
      const newStudent = await db.getOne<{ id: number }>(
        `INSERT INTO students (grade, class_name, student_name, level)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [grade, className, studentName, level]
      );
      if (!newStudent) throw new Error("학생 정보 등록 실패");
      studentId = newStudent.id;
    }

    // 3. 새로운 작문 튜터링 세션 생성 (is_challenging 추가)
    const newSession = await db.getOne<{ id: number }>(
      `INSERT INTO writing_sessions (student_id, korean_sentence, revision_count, is_challenging)
       VALUES ($1, $2, 0, $3)
       RETURNING id`,
      [studentId, koreanSentence, isChallenging]
    );

    if (!newSession) throw new Error("작문 세션 생성 실패");
    const sessionId = newSession.id;

    // 4. 작문 대화창으로 리다이렉트
    redirect(`/writing?sessionId=${sessionId}`);

  } catch (error) {
    // Next.js redirect 에러는 가로채지 않고 그대로 던져야 리다이렉트가 됨
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Session Action Error:", error);
    return { 
      success: false, 
      error: "서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요." 
    };
  }
}

/**
 * 결과 및 히스토리 조회를 위한 세션 상세 정보 가져오기 Action
 */
export async function getSessionDetails(sessionId: number) {
  try {
    const session = await db.getOne(
      `SELECT ws.*, s.student_name, s.grade, s.class_name, s.level 
       FROM writing_sessions ws
       JOIN students s ON ws.student_id = s.id
       WHERE ws.id = $1`,
      [sessionId]
    );
    return session;
  } catch (error) {
    console.error("Get Session Details Error:", error);
    return null;
  }
}

/**
 * 세션을 완료 상태로 변경하고 최종 문장, 성장 태그/학습 되돌아보기를 저장한 뒤
 * Gemini AI를 통해 동적으로 정성적 학습 성취 피드백을 생성하여 저장한 후 결과 페이지로 이동합니다.
 */
export async function completeSession(
  sessionId: number,
  finalEnglishSentence: string,
  reflectionTags: string[],
  reflectionText: string
): Promise<ActionResponse<void>> {
  if (!sessionId || !finalEnglishSentence) {
    return { success: false, error: "필수 입력값이 유효하지 않습니다." };
  }

  try {
    // 1. 세션 상세 정보 및 학생 레벨을 가져옴 (student_id, is_overdependent, is_challenging, student_name 추가)
    const session = await db.getOne<{
      student_id: number;
      student_name: string;
      korean_sentence: string;
      first_english_attempt: string | null;
      revision_count: number;
      is_overdependent: boolean;
      is_challenging: boolean;
      level: string;
    }>(
      `SELECT ws.student_id, s.student_name, ws.korean_sentence, ws.first_english_attempt, ws.revision_count, ws.is_overdependent, ws.is_challenging, s.level
       FROM writing_sessions ws
       JOIN students s ON ws.student_id = s.id
       WHERE ws.id = $1`,
      [sessionId]
    );

    if (!session) {
      return { success: false, error: "세션 정보를 찾을 수 없습니다." };
    }

    // 2. Gemini API를 사용하여 정성적 학습 성취 피드백 생성
    let finalFeedback = "";
    try {
      const prompt = `당신은 영어 교육 전문가이자 따뜻한 AI 튜터입니다.
학생이 한글 문장을 영어로 스스로 완성해 나가는 작문 학습 세션을 성공적으로 마쳤습니다.
다음 정보를 바탕으로 학생에게 격려와 배움을 내재화할 수 있는 **정성적 학습 성취 피드백**을 작성해주세요.

[학습 정보]
- 학생 이름: ${session.student_name}
- 학습 난이도 수준: ${session.level || '초등'}
- 표현하려던 원래 우리말 뜻: "${session.korean_sentence}"
- 학생의 첫 영어 작문 시도: "${session.first_english_attempt || ''}"
- 학생이 힌트를 통해 최종 완성한 문장: "${finalEnglishSentence}"
- 스스로 문장을 고쳐 쓴 횟수: ${session.revision_count}회
- 학생이 직접 꼽은 오늘 성장한 점 (태그): ${reflectionTags.join(", ")}
- 학생의 학습 되돌아보기: "${reflectionText || '없음'}"

[피드백 작성 지침]
1. 반드시 친절한 한글로 작성하세요. 초등학교 학생이 쉽게 이해할 수 있는 단어와 말투(예: "~했어요", "~했군요!")를 사용하세요.
2. 피드백 시작은 반드시 "${session.student_name}님, "으로 시작하여 친근하게 호칭해 주세요. (예: "${session.student_name}님, ...")
3. Hattie 피드백 3단 모델을 참고하여 구조화하되 자연스럽게 연결된 글로 작성하세요:
   - 목표 문장의 한글 뜻을 잘 표현했음을 격려
   - 첫 시도 대비 최종 완성한 문장 간의 구체적인 발전 사항(어휘, 어순, 문법, 유능감 중 학생이 선택한 태그 내용 및 실제 문장 변화 대조)을 칭찬
   - 앞으로 더 나아가기 위한 작은 조언(Where to next)을 따뜻하게 전달
4. 전체 분량은 3~4문장 이내로 명확하고 간결하게 작성하여 텍스트 피로도를 낮추세요.
5. 칭찬할 때는 구체적으로 어떤 단어나 형태(예: 과거형 표현, 단어 순서 등)를 바꾼 점이 훌륭했는지를 짚어주세요.

출력할 때 제목이나 다른 메타 텍스트(예: "피드백:") 없이 오직 피드백 내용만 줄글로 출력하세요.`;

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      });

      finalFeedback = completion.choices[0]?.message?.content || "";
    } catch (apiErr) {
      console.error("Gemini 피드백 생성 실패, 기본 템플릿 사용:", apiErr);
      finalFeedback = 
        `🎉 스스로 끝까지 문장을 완성해 내어 정말 자랑스러워요! 처음 문장을 시도했을 때보다 어순이나 올바른 낱말 쓰기를 훌륭하게 해결했습니다. 오늘 힌트 카드들을 꼼꼼하게 보면서 고친 점을 잊지 말고 앞으로도 더 자신감 있게 문장을 써 보아요!`;
    }

    // 3. 뱃지 지급 판단 및 적재 엔진 실행
    const earnedBadges: string[] = [];

    // 1) 끈기 대장 (persistence_master): 수정 횟수 4회 이상
    if (session.revision_count >= 4) {
      earnedBadges.push("persistence_master");
    }

    // 2) 어휘 탐험가 (word_explorer): 6글자 이상 영단어 3개 이상 사용
    const words = finalEnglishSentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, ""));
    const longWordsCount = words.filter(w => w.length >= 6).length;
    if (longWordsCount >= 3) {
      earnedBadges.push("word_explorer");
    }

    // 3) 스스로 일어서기 (self_reliant): 과의존이 아니며 4~5단계 고강도 힌트 사용 1회 이하
    if (!session.is_overdependent) {
      const highHintLogs = await db.getOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM conversation_logs 
         WHERE session_id = $1 AND role = 'tutor' AND hint_level >= 4`,
        [sessionId]
      );
      const highHintCount = highHintLogs ? parseInt(highHintLogs.count, 10) : 0;
      if (highHintCount <= 1) {
        earnedBadges.push("self_reliant");
      }
    }

    // 4) 성장 메아리 (active_reflector): 나의 학습 되돌아보기 30자 이상 작성
    if (reflectionText && reflectionText.trim().length >= 30) {
      earnedBadges.push("active_reflector");
    }

    // 5) 차근차근 성장 (steady_3, steady_5, steady_10): 누적 완료 세션 수 기준
    const prevCompleted = await db.getOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM writing_sessions 
       WHERE student_id = $1 AND completed_at IS NOT NULL AND id != $2`,
      [session.student_id, sessionId]
    );
    const prevCount = prevCompleted ? parseInt(prevCompleted.count, 10) : 0;
    const totalCount = prevCount + 1;

    if (totalCount === 3) earnedBadges.push("steady_3");
    if (totalCount === 5) earnedBadges.push("steady_5");
    if (totalCount === 10) earnedBadges.push("steady_10");

    // 6) 용감한 도전가 (brave_challenger) 🦁: 어려운 문장 챌린지 성공 시
    if (session.is_challenging) {
      earnedBadges.push("brave_challenger");
    }

    // 뱃지 DB 기록
    if (earnedBadges.length > 0) {
      for (const code of earnedBadges) {
        await db.query(
          `INSERT INTO student_badges (student_id, badge_code) 
           VALUES ($1, $2) 
           ON CONFLICT (student_id, badge_code) DO NOTHING`,
          [session.student_id, code]
        );
      }
    }

    // 4. DB 업데이트
    await db.query(
      `UPDATE writing_sessions 
       SET final_english_sentence = $1, 
           completed_at = CURRENT_TIMESTAMP, 
           feedback = $2,
           reflection_tags = $3,
           reflection_text = $4
       WHERE id = $5`,
      [finalEnglishSentence, finalFeedback.trim(), reflectionTags, reflectionText || null, sessionId]
    );

    redirect(`/result/${sessionId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Complete Session Error:", error);
    return { success: false, error: "세션 완료 처리에 실패했습니다." };
  }
}

/**
 * 특정 세션의 대화 로그(conversation_logs) 목록을 시간 순으로 조회합니다.
 */
export async function getSessionLogs(sessionId: number) {
  try {
    const logs = await db.query<{
      role: string;
      message: string;
      hint_level: number;
      hint_type: string | null;
      detected_errors: string[] | null;
      created_at: Date;
    }>(
      `SELECT role, message, hint_level, hint_type, detected_errors, created_at 
       FROM conversation_logs 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return logs;
  } catch (error) {
    console.error("Get Session Logs Error:", error);
    return [];
  }
}

/**
 * 특정 학생의 누적 획득 뱃지 목록을 시간 순으로 조회합니다.
 */
export async function getStudentBadges(studentId: number): Promise<string[]> {
  try {
    const rows = await db.query<{ badge_code: string }>(
      `SELECT badge_code FROM student_badges WHERE student_id = $1 ORDER BY earned_at ASC`,
      [studentId]
    );
    return rows.map((r) => r.badge_code);
  } catch (error) {
    console.error("Get Student Badges Error:", error);
    return [];
  }
}

