"use client";

import React from "react";

interface MessageBubbleProps {
  role: string; // 'student' | 'tutor'
  message: string;
  hintLevel?: number;
  hintType?: string | null;
}

export default function MessageBubble({
  role,
  message,
  hintLevel,
  hintType,
}: MessageBubbleProps) {
  const isStudent = role === "student";

  // 단어 칩(Word Chips) 파싱 및 렌더링 도우미
  const renderMessageContent = (text: string) => {
    // "필요한 단어 칩: play, yesterday" 형식 탐지
    const wordChipRegex = /(?:필요한 단어 칩|단어 칩|단어 칩들)\s*:\s*([A-Za-z\s,!?'-]+)/i;
    const match = text.match(wordChipRegex);

    if (match) {
      const wordsString = match[1];
      const wordChips = wordsString
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w !== "");

      // 매칭된 태그 라인을 지운 본문
      const textWithoutChips = text.replace(wordChipRegex, "").trim();

      return (
        <div>
          <p className="whitespace-pre-wrap leading-relaxed">{textWithoutChips}</p>
          <div className="mt-3 flex flex-wrap gap-2 animate-bounce-subtle">
            {wordChips.map((word, idx) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 text-xs font-black text-[#8E44AD] bg-[#F5EEF8] border-2 border-[#D7BDE2] rounded-full shadow-sm hover:scale-105 transition-transform duration-200"
              >
                🔤 {word}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  };

  // 힌트 레벨 한글 명칭 맵
  const getHintLevelBadge = (level: number) => {
    const badges = [
      "💡 1단계: 의미 확인",
      "💡 2단계: 오류 위치",
      "💡 3단계: 문법 개념",
      "💡 4단계: 단어 카드",
      "💡 5단계: 빈칸 문장틀",
    ];
    return badges[level - 1] || "💡 힌트";
  };

  if (isStudent) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="flex flex-col items-end max-w-[75%]">
          <span className="text-xs font-bold text-gray-400 mb-1 mr-1">나</span>
          <div className="bg-[#EBF5FB] border-2 border-[#AED6F1] text-[#2C3E50] font-semibold px-4 py-3 rounded-2xl rounded-tr-none shadow-sm text-sm md:text-base leading-relaxed">
            {message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <span className="inline-block text-base">🤖</span>
          <span className="text-xs font-black text-[#34495E]">AI 튜터 선생님</span>
          
          {/* 튜터 힌트 레벨 배지 */}
          {hintLevel && hintLevel > 0 ? (
            <span className="inline-block px-2 py-0.5 text-[10px] font-black text-white bg-[#E67E22] rounded-full">
              {getHintLevelBadge(hintLevel)}
            </span>
          ) : null}
        </div>
        
        <div className="bg-[#FEF9E7] border-2 border-[#F9E79F] text-[#2C3E50] font-semibold px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm md:text-base leading-relaxed">
          {renderMessageContent(message)}
        </div>
      </div>
    </div>
  );
}
