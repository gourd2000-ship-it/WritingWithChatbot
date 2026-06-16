"use client";

import { useState } from "react";
import { startSession } from "../actions/session";

export default function StudentEntryForm() {
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [level, setLevel] = useState("elementary_3_4");
  const [koreanSentence, setKoreanSentence] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 난이도 불일치 모달 팝업 상태
  const [showModal, setShowModal] = useState(false);
  const [recommendedKorean, setRecommendedKorean] = useState("");
  const [recommendedEnglish, setRecommendedEnglish] = useState("");

  const handleGradeChange = (val: string) => {
    setGrade(val);
    if (val === "초등 3" || val === "초등 4") {
      setLevel("elementary_3_4");
    } else if (val === "초등 5" || val === "초등 6") {
      setLevel("elementary_5_6");
    } else if (val.startsWith("중등")) {
      setLevel("middle_school");
    } else if (val.startsWith("고등")) {
      setLevel("high_school");
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    force = false,
    isChallenging = false,
    customKorean = ""
  ) => {
    if (e) e.preventDefault();
    
    const finalKorean = customKorean || koreanSentence;

    if (!grade || !className || !studentName || !finalKorean) {
      setErrorMsg("빈칸을 모두 채워주세요!");
      return;
    }
    
    setIsPending(true);
    setErrorMsg("");
    
    try {
      const res = await startSession({
        grade,
        className,
        studentName,
        level,
        koreanSentence: finalKorean,
        forceStart: force,
        isChallenging
      });
      
      if (res && res.success && res.data && (res.data as any).mismatch) {
        // 난이도 불일치 감지: 모달 활성화 및 리다이렉트 홀딩
        setRecommendedKorean((res.data as any).recommendedKorean || "");
        setRecommendedEnglish((res.data as any).recommendedEnglish || "");
        setShowModal(true);
      } else if (res && !res.success) {
        setErrorMsg(res.error || "문제가 발생했습니다. 다시 시도해 주세요.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("서버와 연결할 수 없습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* 학년/반/이름 입력 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-[#34495E] mb-2">몇 학년인가요?</label>
          <select
            value={grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="w-full px-4 py-3 bg-[#FEF9E7] border-2 border-[#F4EFCF] rounded-2xl focus:border-[#3498DB] focus:outline-none text-[#2C3E50] font-semibold transition"
            required
          >
            <option value="" disabled>선택해주세요</option>
            <option value="초등 3">초등학교 3학년</option>
            <option value="초등 4">초등학교 4학년</option>
            <option value="초등 5">초등학교 5학년</option>
            <option value="초등 6">초등학교 6학년</option>
            <option value="중등 1">중학교 1학년</option>
            <option value="중등 2">중학교 2학년</option>
            <option value="중등 3">중학교 3학년</option>
            <option value="고등 1">고등학교 1학년</option>
            <option value="고등 2">고등학교 2학년</option>
            <option value="고등 3">고등학교 3학년</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#34495E] mb-2">몇 반인가요?</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-4 py-3 bg-[#FEF9E7] border-2 border-[#F4EFCF] rounded-2xl focus:border-[#3498DB] focus:outline-none text-[#2C3E50] font-semibold transition"
            placeholder="예: 2반"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#34495E] mb-2">이름은 무엇인가요?</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full px-4 py-3 bg-[#FEF9E7] border-2 border-[#F4EFCF] rounded-2xl focus:border-[#3498DB] focus:outline-none text-[#2C3E50] font-semibold transition"
            placeholder="예: 김민수"
            required
          />
        </div>
      </div>

      {/* 학습 수준 선택 카드 UI */}
      <div>
        <label className="block text-sm font-bold text-[#34495E] mb-3">나에게 맞는 학습 단계를 선택하세요</label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 초등 3~4학년 */}
          <div
            onClick={() => setLevel("elementary_3_4")}
            className={`p-4 rounded-2xl border-3 cursor-pointer transition flex flex-col justify-between ${
              level === "elementary_3_4"
                ? "bg-[#EBF5FB] border-[#3498DB] shadow-md scale-[1.02]"
                : "bg-white border-[#E2E8F0] hover:border-[#F4EFCF]"
            }`}
          >
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-extrabold bg-[#3498DB] text-white rounded-full mb-2">
                기초
              </span>
              <h3 className="font-bold text-base text-[#2C3E50]">초등 3~4학년</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                아주 짧은 한 문장 쓰기 연습. 쉬운 설명과 쉬운 어휘로 재미있게 시작해요!
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#3498DB] bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-100">
              예: I am happy. / I like cats.
            </div>
          </div>

          {/* 초등 5~6학년 */}
          <div
            onClick={() => setLevel("elementary_5_6")}
            className={`p-4 rounded-2xl border-3 cursor-pointer transition flex flex-col justify-between ${
              level === "elementary_5_6"
                ? "bg-[#E8F8F5] border-[#2ECC71] shadow-md scale-[1.02]"
                : "bg-white border-[#E2E8F0] hover:border-[#F4EFCF]"
            }`}
          >
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-extrabold bg-[#2ECC71] text-white rounded-full mb-2">
                도전
              </span>
              <h3 className="font-bold text-base text-[#2C3E50]">초등 5~6학년</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                시간, 장소, 과거 표현을 섞은 긴 한 문장. 다양한 힌트를 받아 완성해요!
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#2ECC71] bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-100">
              예: I played soccer yesterday.
            </div>
          </div>

          {/* 중학생 */}
          <div
            onClick={() => setLevel("middle_school")}
            className={`p-4 rounded-2xl border-3 cursor-pointer transition flex flex-col justify-between ${
              level === "middle_school"
                ? "bg-[#FEF9E7] border-[#E67E22] shadow-md scale-[1.02]"
                : "bg-white border-[#E2E8F0] hover:border-[#F4EFCF]"
            }`}
          >
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-extrabold bg-[#E67E22] text-white rounded-full mb-2">
                심화
              </span>
              <h3 className="font-bold text-base text-[#2C3E50]">중학생</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                2~3문장 연결이나 짧은 생각 쓰기. 논리적인 접속사를 써서 구성해요!
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#E67E22] bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-100">
              예: I want to recommend this book.
            </div>
          </div>

          {/* 고등학생 */}
          <div
            onClick={() => setLevel("high_school")}
            className={`p-4 rounded-2xl border-3 cursor-pointer transition flex flex-col justify-between ${
              level === "high_school"
                ? "bg-[#F3E5F5] border-[#9B59B6] shadow-md scale-[1.02]"
                : "bg-white border-[#E2E8F0] hover:border-[#F4EFCF]"
            }`}
          >
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-extrabold bg-[#9B59B6] text-white rounded-full mb-2">
                고급
              </span>
              <h3 className="font-bold text-base text-[#2C3E50]">고등학생</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                수능/학평 대비 실전 작문. 가정법, 분사구문 등 세련된 문장 구조를 연습해요!
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#9B59B6] bg-purple-50 py-1.5 px-3 rounded-xl border border-purple-100">
              예: She should have finished the report.
            </div>
          </div>
        </div>
      </div>

      {/* 쓰고 싶은 우리말 문장 입력 */}
      <div>
        <label className="block text-sm font-bold text-[#34495E] mb-2">영어로 만들고 싶은 우리말 문장을 적어보세요</label>
        <textarea
          rows={3}
          value={koreanSentence}
          onChange={(e) => setKoreanSentence(e.target.value)}
          className="w-full p-4 bg-[#FEF9E7] border-2 border-[#F4EFCF] rounded-2xl focus:border-[#3498DB] focus:outline-none text-[#2C3E50] font-semibold placeholder-gray-400 transition"
          placeholder="예: 나는 어제 축구를 했다."
          required
        />
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          💡 AI는 영어 번역 정답을 바로 알려주지 않아요. 대신 여러분이 직접 단어와 구조를 조합해서 영어 문장을 완성할 수 있게 단계별 힌트를 준답니다!
        </p>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isPending}
        className={`w-full py-4 text-white font-extrabold text-lg rounded-2xl transition shadow-lg ${
          isPending
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#3498DB] hover:bg-[#2980B9] active:scale-[0.99] active:shadow-md"
        }`}
      >
        {isPending ? "튜터링 세션 시작하는 중..." : "AI 튜터링 시작하기 🚀"}
      </button>

      {/* 난이도 불일치 중재 모달 팝업 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-[#F5B041] animate-scale-in text-center space-y-5">
            <div className="text-4xl">🦁</div>
            <h3 className="text-lg font-black text-gray-800">
              {level === "high_school" ? "잠깐! 난이도 조율이 필요해요" : "잠깐! 조금 어려운 문장이에요"}
            </h3>
            <div className="text-xs text-gray-500 font-bold space-y-2.5 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="leading-relaxed">
                {level === "high_school"
                  ? "작성하신 문장은 고등학생 작문 단계에 비해 너무 단순하거나 혹은 지나치게 복잡합니다. 학습 효과를 극대화하기 위해 AI가 제안하는 맞춤형 문장으로 변경해 볼까요?"
                  : "작성하신 문장은 선택한 학년 수준에 비해 문법 구조나 어휘가 조금 복잡해서 힌트를 받아도 스스로 완성하기에 피로를 느낄 수 있어요."}
              </p>
              <p className="border-t border-gray-200/60 pt-2.5 leading-relaxed text-gray-700">
                💡 **추천 문장**: "{recommendedKorean}"
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setKoreanSentence(recommendedKorean);
                  handleSubmit(null as any, true, false, recommendedKorean);
                }}
                className="w-full py-3.5 bg-[#E8F8F5] border-2 border-[#2ECC71] text-[#27AE60] font-black text-sm rounded-xl hover:bg-[#D5F5E3] transition-all hover:scale-[1.01] flex items-center justify-center cursor-pointer"
              >
                {level === "high_school" ? "AI 추천 문장으로 도전할래요." : "다른 쉬운 문장으로 바꿀래요."}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  handleSubmit(null as any, true, true);
                }}
                className="w-full py-3.5 bg-[#FEF9E7] border-2 border-[#F4D03F] text-[#B7950B] font-black text-sm rounded-xl hover:bg-[#FCF3CF] transition-all hover:scale-[1.01] flex items-center justify-center cursor-pointer"
              >
                {level === "high_school" ? "어려워도 원래 문장으로 할래요" : "어려워도 도전해볼래요 (도전 뱃지 획득 기회!)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
