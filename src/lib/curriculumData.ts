export interface CurriculumLevelData {
  vocabulary: string[];
  grammarFocus: string[];
  templates: {
    korean: string;
    english: string;
  }[];
}

export const CURRICULUM_DATA: Record<string, CurriculumLevelData> = {
  "elementary_3_4": {
    vocabulary: [
      "like", "love", "cat", "dog", "happy", "sad", "run", "jump", "apple", "banana",
      "big", "small", "book", "school", "teacher", "friend", "family", "home", "play", "sing",
      "dance", "swim", "cold", "hot", "rain", "sun", "color", "red", "blue", "yellow"
    ],
    grammarFocus: [
      "기본 문장 뼈대(주어 + 동사)",
      "간단한 상태 및 성질 묘사(주어 + be동사 + 형용사)",
      "일상의 동작 표현(주어 + 일반동사 + 목적어)",
      "인칭 대명사(I, You, He, She, They)의 기초적인 구별"
    ],
    templates: [
      { korean: "나는 고양이를 좋아한다.", english: "I like cats." },
      { korean: "나는 행복하다.", english: "I am happy." },
      { korean: "그는 달릴 수 있다.", english: "He can run." },
      { korean: "이것은 사과이다.", english: "This is an apple." }
    ]
  },
  "elementary_5_6": {
    vocabulary: [
      "yesterday", "tomorrow", "soccer", "baseball", "computer", "game", "visit", "travel",
      "beautiful", "interesting", "because", "weather", "summer", "winter", "breakfast", "dinner",
      "hobby", "movie", "music", "study", "learn", "clean", "wash", "help", "kind", "famous"
    ],
    grammarFocus: [
      "과거 시제를 활용한 행동 묘사(yesterday, -ed 과거형 동사 등)",
      "이유를 나타내는 접속사(because)를 이용한 간단한 인과문 구성",
      "미래의 계획이나 조동사를 활용한 의사 표현(want to, will, can)",
      "동사 과거형의 규칙 변화(-ed) 및 기초 불규칙 변화(go-went 등) 구별"
    ],
    templates: [
      { korean: "나는 어제 축구를 했다.", english: "I played soccer yesterday." },
      { korean: "제주도는 아름답기 때문에 나는 그곳을 방문하고 싶다.", english: "I want to visit Jeju because it is beautiful." },
      { korean: "그는 음악 듣는 것을 즐긴다.", english: "He enjoys listening to music." }
    ]
  },
  "middle_school": {
    vocabulary: [
      "recommend", "interesting", "experience", "opinion", "important", "difficult", "easy",
      "environment", "healthy", "exercise", "information", "understand", "communicate", "relationship",
      "influence", "improve", "develop", "achievement", "future", "career"
    ],
    grammarFocus: [
      "주격/목적격 관계대명사(who, which, that)를 활용한 한정적 용법 명사 수식",
      "이유 및 대조 접속사(because, but, although, so)를 통한 문장 다중 연결",
      "동명사(주어/목적어 역할) 및 to부정사의 명사적/부사적 용법",
      "형용사/부사의 비교급 및 최상급 활용 표현"
    ],
    templates: [
      { korean: "이 책은 이야기가 흥미롭기 때문에 좋아한다. 친구들에게 추천하고 싶다.", english: "I like this book because the story is interesting. I want to recommend it to my friends." },
      { korean: "건강을 유지하기 위해서는 매일 운동하는 것이 중요하다.", english: "It is important to exercise every day to stay healthy." }
    ]
  },
  "high_school": {
    vocabulary: [
      "analyze", "significant", "hypothesis", "consequence", "emphasize", "perspective", "nevertheless",
      "furthermore", "contribute", "participate", "opportunity", "challenge", "influence", "solution",
      "negotiate", "undertake", "sophisticated", "implement", "alternative", "fundamental"
    ],
    grammarFocus: [
      "조동사 과거 완료 표현(should/must/could have p.p.)",
      "가정법 과거 및 과거완료(If + 주어 + had p.p., 주어 + 조동사과거 + have p.p.)",
      "관계대명사/관계부사 계속적 용법 및 복합관계사",
      "분사구문(Participle Construction)을 활용한 문장 압축"
    ],
    templates: [
      { korean: "그녀는 그 보고서를 끝냈어야 했는데, 왜냐하면 마감 기한이 매우 임박했기 때문이다.", english: "She should have finished the report because the deadline was very close." },
      { korean: "만약 내가 그때 그 기회를 잡았더라면, 나의 미래는 완전히 달라졌을 것이다.", english: "If I had taken that opportunity at that time, my future would have been completely different." },
      { korean: "기술의 발전은 우리 삶을 편리하게 만드는 반면, 새로운 도전을 제시하기도 한다.", english: "While technological advances make our lives convenient, they also present new challenges." }
    ]
  }
};

/**
 * 주어진 난이도 수준에 해당하는 교육과정 어휘와 포커스를 반환합니다.
 */
export function getCurriculumData(level: string): CurriculumLevelData {
  return CURRICULUM_DATA[level] || CURRICULUM_DATA["elementary_3_4"];
}
