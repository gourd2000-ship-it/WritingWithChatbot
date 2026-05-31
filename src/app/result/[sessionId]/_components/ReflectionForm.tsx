"use client";

import React, { useState, useTransition } from "react";
import { completeSession } from "@/app/actions/session";

interface ReflectionFormProps {
  sessionId: number;
  koreanSentence: string;
  finalAttempt: string;
}

interface TagOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  bgActive: string;
  borderActive: string;
  textActive: string;
}

const TAG_OPTIONS: TagOption[] = [
  {
    id: "vocabulary",
    label: "어휘 성장",
    description: "새로운 영어 단어를 알게 되었어요!",
    icon: "🔤",
    bgActive: "bg-[#EBF5FB]",
    borderActive: "border-[#3498DB]",
    textActive: "text-[#2980B9]",
  },
  {
    id: "word_order",
    label: "어순 정복",
    description: "영어 문장을 만드는 순서(어순)를 배웠어요!",
    icon: "🧩",
    bgActive: "bg-[#E8F8F5]",
    borderActive: "border-[#2ECC71]",
    textActive: "text-[#27AE60]",
  },
  {
    id: "grammar",
    label: "문법 이해",
    description: "시간에 맞게 단어 모양 바꾸는 법을 배웠어요!",
    icon: "⏰",
    bgActive: "bg-[#F5EEF8]",
    borderActive: "border-[#9B59B6]",
    textActive: "text-[#8E44AD]",
  },
  {
    id: "confidence",
    label: "유능감 뱃지",
    description: "내 힘으로 고쳐서 끝까지 완성해서 뿌듯해요!",
    icon: "💪",
    bgActive: "bg-[#FDEDEC]",
    borderActive: "border-[#E74C3C]",
    textActive: "text-[#CB4335]",
  },
];

export default function ReflectionForm({
  sessionId,
  koreanSentence,
  finalAttempt,
}: ReflectionFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 카드 클릭 시 다중 선택 제어
  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // 완료하기 서버 액션 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTags.length === 0) {
      setError("오늘 배운 점 카드를 최소 1개 이상 골라주세요!");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await completeSession(
          sessionId,
          finalAttempt,
          selectedTags,
          showTextInput ? reflectionText : ""
        );
        if (res && !res.success) {
          setError(res.error || "완료 처리 중 오류가 발생했습니다.");
        }
      } catch (err: any) {
        console.error("completeSession error:", err);
        setError("서버 연결에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-gray-100 shadow-inner">
        <h2 className="text-sm font-black text-gray-400 mb-2">내가 번역하려던 원래 뜻</h2>
        <p className="text-base font-black text-gray-800">💡 "{koreanSentence}"</p>
        
        <h2 className="text-sm font-black text-gray-400 mt-4 mb-2">내가 완성한 영어 문장</h2>
        <p className="text-base font-bold text-gray-800 font-mono bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          ✍️ {finalAttempt || "(작성한 문장이 없습니다)"}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-gray-800 flex items-center gap-1">
            🌱 <span>오늘 작문을 하며 어떤 점이 자랐나요?</span>
            <span className="text-[#E74C3C] text-xs font-black">*최소 1개 선택</span>
          </h3>
        </div>
        
        {/* 성장 카드 리스트 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TAG_OPTIONS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                disabled={isPending}
                className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 transform active:scale-95 flex flex-col justify-between h-36 ${
                  isSelected
                    ? `${tag.bgActive} ${tag.borderActive} shadow-md`
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-3xl">{tag.icon}</span>
                  {isSelected && (
                    <span className="bg-[#2ECC71] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black animate-scale-in">
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <h4
                    className={`text-sm font-black ${
                      isSelected ? tag.textActive : "text-gray-800"
                    }`}
                  >
                    {tag.label}
                  </h4>
                  <p className="text-xs text-gray-400 font-bold mt-1 leading-snug">
                    {tag.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 직접 작성 토글 및 주관식 입력 */}
      <div className="pt-4 border-t border-gray-100 space-y-4">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="showText"
            checked={showTextInput}
            onChange={(e) => setShowTextInput(e.target.checked)}
            disabled={isPending}
            className="w-5 h-5 rounded-lg border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2] transition-colors cursor-pointer"
          />
          <label htmlFor="showText" className="text-sm font-black text-gray-600 cursor-pointer select-none">
            🎨 직접 나의 학습 되돌아보기를 남길래요 (선택)
          </label>
        </div>

        {showTextInput && (
          <div className="transition-all duration-300 animate-slide-down">
            <textarea
              placeholder="AI 선생님 힌트를 보며 스스로 배운 점이나 느낀 점을 자유롭게 적어보세요! (예: play 뒤에 ed를 붙여서 과거 시간을 나타내는 규칙을 더 잘 이해하게 됐어요!)"
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              disabled={isPending}
              maxLength={150}
              className="w-full h-24 p-4 rounded-2xl border-2 border-gray-200 focus:border-[#4A90E2] focus:outline-none text-sm font-bold text-gray-700 resize-none shadow-sm transition-all"
            />
            <div className="text-right text-xs text-gray-400 font-medium mt-1">
              {reflectionText.length}/150 자
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#FDEDEC] border border-[#FADBD8] text-[#E74C3C] text-xs font-black px-4 py-3 rounded-xl animate-shake">
          ⚠️ {error}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={selectedTags.length === 0 || isPending}
        className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-md transition-all flex items-center justify-center gap-2 ${
          selectedTags.length === 0 || isPending
            ? "bg-gray-300 cursor-not-allowed shadow-none"
            : "bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] hover:scale-[1.01] active:scale-95"
        }`}
      >
        {isPending ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            <span>성장 리포트 분석 중...</span>
          </>
        ) : (
          <>
            <span>🌱 되돌아보기 완료하고 리포트 확인하기</span>
          </>
        )}
      </button>
    </form>
  );
}
