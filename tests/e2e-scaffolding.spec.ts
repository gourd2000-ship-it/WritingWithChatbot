import { test, expect } from "@playwright/test";

// 기본 타겟 URL 지정
const BASE_URL = "http://localhost:3000";

test.describe("영어 작문 AI 스캐폴딩 튜터 E2E 테스트", () => {
  
  test("시나리오 A: 정상 학생 로그인 및 대화방 진입 검증", async ({ page }) => {
    // 1. 홈 화면 접속
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Create Next App|영어 작문/);

    // 2. 인적사항 입력
    await page.selectOption('select', { value: '초등 4' });
    await page.fill('input[placeholder="예: 2반"]', "1반");
    await page.fill('input[placeholder="예: 김민수"]', "자동테스트A");

    // 3. 학습 수준 선택 (초등 3~4학년 카드 클릭)
    await page.click('text="초등 3~4학년"');

    // 4. 초등 수준에 적절한 우리말 문장 입력
    await page.fill(
      'textarea[placeholder="예: 나는 어제 축구를 했다."]',
      "나는 행복하다."
    );

    // 5. 제출 및 대화방 리다이렉션 확인
    await page.click('button:has-text("AI 튜터링 시작하기")');

    // 대화창 URL로 넘어갔는지 확인 (/writing?sessionId=...)
    await page.waitForURL(/\/writing/, { timeout: 30000 });
    expect(page.url()).toContain("/writing");

    // 챗화면의 주요 구성 요소(입력창 등)가 렌더링되었는지 확인
    const inputArea = page.locator('input[placeholder*="영어 문장을"]');
    await expect(inputArea).toBeVisible({ timeout: 20000 });
  });

  test("시나리오 B: 초등 레벨 난이도 초과(Mismatch) 중재 모달 검증", async ({ page }) => {
    // 1. 홈 화면 접속
    await page.goto(BASE_URL);

    // 2. 인적사항 입력
    await page.selectOption('select', { value: '초등 4' });
    await page.fill('input[placeholder="예: 2반"]', "1반");
    await page.fill('input[placeholder="예: 김민수"]', "자동테스트B");

    // 3. 초등 3~4학년 선택
    await page.click('text="초등 3~4학년"');

    // 4. 매우 어렵고 복잡한 문장 입력 (초등 수준 초과)
    await page.fill(
      'textarea[placeholder="예: 나는 어제 축구를 했다."]',
      "내가 어제 도서관에서 어려운 책을 읽고 있었을 때, 갑자기 밖에서 폭우가 내리기 시작해서 나는 우산을 사야만 했다."
    );

    // 5. 제출 및 난이도 초과 경고 모달 확인
    await page.click('button:has-text("AI 튜터링 시작하기")');

    // 모달창 제목이 뜨는지 확인
    const modalTitle = page.locator('text="잠깐! 조금 어려운 문장이에요"');
    await expect(modalTitle).toBeVisible({ timeout: 30000 });

    // 모달창 내에 추천 문장 안내가 포함되어 있는지 확인 (대소문자/마크다운 기호 우회하여 substring으로 검색)
    const recommendation = page.locator('text=추천 문장');
    await expect(recommendation).toBeVisible();
  });

  test("시나리오 C: 고등 레벨 난이도 미달(Under-challenge) 중재 모달 검증", async ({ page }) => {
    // 1. 홈 화면 접속
    await page.goto(BASE_URL);

    // 2. 인적사항 입력
    await page.selectOption('select', { value: '고등 1' });
    await page.fill('input[placeholder="예: 2반"]', "1반");
    await page.fill('input[placeholder="예: 김민수"]', "자동테스트C");

    // 3. 고등학생 선택
    await page.click('text="고등학생"');

    // 4. 너무 단순한 초등 수준 문장 입력 (고등 수준 미달)
    await page.fill(
      'textarea[placeholder="예: 나는 어제 축구를 했다."]',
      "나는 행복하다."
    );

    // 5. 제출 및 난이도 조율 모달 확인
    await page.click('button:has-text("AI 튜터링 시작하기")');

    // 모달창 제목 확인
    const modalTitle = page.locator('text="잠깐! 난이도 조율이 필요해요"');
    await expect(modalTitle).toBeVisible({ timeout: 30000 });
  });

  test("시나리오 D: 교사 대시보드 및 피드백 대시보드 접근성 검증", async ({ page }) => {
    // 1. 교사 대시보드 (/teacher) 접속 및 헤더 검증
    await page.goto(`${BASE_URL}/teacher`);
    const teacherHeader = page.locator('h1:has-text("교사용 실시간 학습 대시보드")');
    await expect(teacherHeader).toBeVisible({ timeout: 10000 });

    // 2. 피드백 대시보드 (/feedback) 접속 및 헤더 검증
    await page.goto(`${BASE_URL}/feedback`);
    const feedbackHeader = page.locator('h1:has-text("사용후기 분석 대시보드")');
    await expect(feedbackHeader).toBeVisible({ timeout: 10000 });
  });

});
