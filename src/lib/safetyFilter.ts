const FORBIDDEN_PATTERNS = [
  /(?:정답은|완성 문장은|이렇게 쓰면 됩니다|영어로는 다음과 같습니다|번역하면|The correct sentence is|You can say|The answer is)\s*[:"']*\s*([A-Za-z\s.,!?'-]+)/gi,
  // 따옴표나 콜론 뒤에 완성형 영어 문장(4단어 이상 연속)이 올 때 감지
  /["'“‘]([A-Z][a-zA-Z\s,.'’!?]{15,})["'”’]/g
];

const ALTERNATIVE_MESSAGE = 
  "💡 정답을 바로 알려주지는 않을게요. 대신 네가 스스로 문장을 멋지게 완성할 수 있도록 힌트를 줄게요! 다시 시도해봐요.";

export function filterTutorResponse(aiResponse: string): string {
  // 금지된 정답 유출 패턴 중 하나라도 매칭되면 일부 치환 대신 전체 응답을 대체 메시지로 변경
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(aiResponse)) {
      return ALTERNATIVE_MESSAGE;
    }
  }

  // AI 응답 자체가 완성 영어 문장으로만 가득 차 있는 상황 방지 (한글이 거의 없고 영어 단어만 있는 경우)
  const englishWords = aiResponse.match(/[a-zA-Z]+/g) || [];
  const koreanWords = aiResponse.match(/[ㄱ-ㅎㅏ-ㅣ가-힣]+/g) || [];

  const englishWordCount = englishWords.length;
  const koreanWordCount = koreanWords.length;

  // 한글이 거의 없고(1단어 이하) 영어 문장으로 추정되는 긴 구문(5단어 이상)만 있을 경우 차단
  if (koreanWordCount <= 1 && englishWordCount > 5) {
    return ALTERNATIVE_MESSAGE;
  }

  return aiResponse;
}
