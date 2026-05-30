import { db } from "../src/lib/db";
import { filterTutorResponse } from "../src/lib/safetyFilter";
import { buildSystemPrompt } from "../src/lib/promptBuilder";

async function runTests() {
  console.log("=== Phase 1 Backend Core 검증 테스트 시작 ===\n");

  // 1. DB 연결 테스트
  try {
    console.log("[1/3] NeonDB 연결 테스트 중...");
    const res = await db.getOne<{ now: Date }>("SELECT NOW() as now");
    if (res && res.now) {
      console.log(`✓ NeonDB 연결 성공! 현재 서버 시간: ${res.now}\n`);
    } else {
      throw new Error("결과 반환 실패");
    }
  } catch (error) {
    console.error("✗ NeonDB 연결 실패:", error);
    process.exit(1);
  }

  // 2. Safety Filter 검증 테스트
  console.log("[2/3] Safety Filter 검증 테스트 중...");
  const mockResponses = [
    {
      input: "힌트는 이래요: I play__ soccer yesterday. play 뒤에 ed를 붙여 과거형으로 만들어봐요.",
      shouldFlag: false
    },
    {
      input: "정답은 I played soccer yesterday 입니다. 이렇게 써 보세요.",
      shouldFlag: true
    },
    {
      input: "완성 문장은 'I like cats.' 에요.",
      shouldFlag: true
    },
    {
      input: "The correct sentence is: She can run.",
      shouldFlag: true
    },
    {
      input: "정답을 직접 알려줄 수는 없지만, p로 시작하는 동사를 써보세요.",
      shouldFlag: false
    }
  ];

  let safetyPassed = true;
  mockResponses.forEach((mock, idx) => {
    const output = filterTutorResponse(mock.input);
    const isFlagged = output.includes("정답을 바로 알려주지는 않을게요");
    
    if (isFlagged === mock.shouldFlag) {
      console.log(`  ✓ 테스트 케이스 ${idx + 1} 성공`);
    } else {
      console.error(`  ✗ 테스트 케이스 ${idx + 1} 실패! 입력: "${mock.input}" -> 출력: "${output}"`);
      safetyPassed = false;
    }
  });
  console.log(safetyPassed ? "✓ Safety Filter 모든 테스트 케이스 성공!\n" : "✗ Safety Filter 테스트 실패 존재\n");

  // 3. Prompt Builder 검증 테스트
  console.log("[3/3] Prompt Builder 검증 테스트 중...");
  try {
    const config = {
      level: "elementary_3_4",
      koreanSentence: "나는 고양이를 좋아한다.",
      hintLevel: 50
    };
    const prompt = buildSystemPrompt(config);
    
    const containsKoreanGuide = prompt.includes("초등학교 3~4학년");
    const containsHintGuide = prompt.includes("50% 힌트");
    const containsSafetyRule = prompt.includes("완성형 영어 정답이나 번역문을 절대 먼저 제시하지 마십시오");
    
    if (containsKoreanGuide && containsHintGuide && containsSafetyRule) {
      console.log("✓ Prompt Builder 프롬프트 조립 성공!\n");
    } else {
      throw new Error(`누락된 규칙 존재: 한국어 가이드(${containsKoreanGuide}), 힌트 가이드(${containsHintGuide}), 안전 규칙(${containsSafetyRule})`);
    }
  } catch (error) {
    console.error("✗ Prompt Builder 테스트 실패:", error);
    process.exit(1);
  }

  console.log("=== Phase 1 검증 완료 ===");
  process.exit(0);
}

runTests();
