"use client";

import React from "react";

interface WritingInputProps {
  typingValue: string;
  onTypingChange: (val: string) => void;
  onSendMessage: (msg: string) => void;
  onGetHint: () => void;
  onComplete: () => void;
  isLoading: boolean;
  hintLevel: number;
  showCompleteBtn: boolean; // 작문이 완료(성공) 단계에 도달하여 종료할 수 있는지 여부
}

export default function WritingInput({
  typingValue,
  onTypingChange,
  onSendMessage,
  onGetHint,
  onComplete,
  isLoading,
  hintLevel,
  showCompleteBtn,
}: WritingInputProps) {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typingValue.trim() || isLoading) return;
    onSendMessage(typingValue.trim());
  };

  return (
    <div className="bg-[#FFFCEB] border-t-2 border-[#F4EFCF] p-4 flex flex-col gap-3">
      {/* 힌트 및 완료 조작 버튼 바 */}
      <div className="flex justify-between items-center gap-2">
        <button
          type="button"
          onClick={onGetHint}
          disabled={isLoading || hintLevel >= 5}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-black rounded-full border-2 shadow-sm transition-all duration-300 ${
            hintLevel >= 5
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white border-[#F9E79F] text-[#D35400] hover:bg-[#FEF9E7] hover:scale-105"
          }`}
        >
          💡 <span>힌트 더 받기</span>
          {hintLevel < 5 && (
            <span className="bg-[#E67E22] text-white px-1.5 py-0.5 rounded-full text-[10px]">
              {hintLevel}/5 단계
            </span>
          )}
        </button>

        {showCompleteBtn && (
          <button
            type="button"
            onClick={onComplete}
            disabled={isLoading}
            className="flex items-center gap-1 px-5 py-2 text-xs md:text-sm font-black text-white bg-[#27AE60] border-2 border-[#219653] rounded-full shadow-md hover:bg-[#219653] hover:scale-105 transition-all duration-300 animate-pulse-subtle"
          >
            🎉 <span>도전 완료하기</span>
          </button>
        )}
      </div>

      {/* 문장 입력 폼 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={typingValue}
          onChange={(e) => onTypingChange(e.target.value)}
          disabled={isLoading}
          placeholder={
            isLoading
              ? "튜터 선생님이 생각하고 있어요..."
              : "여기에 영어 문장을 입력하고 전송 버튼을 누르세요!"
          }
          className="flex-1 px-4 py-3 bg-white border-2 border-[#F4EFCF] rounded-2xl text-sm md:text-base font-semibold text-[#2C3E50] placeholder-gray-400 focus:outline-none focus:border-[#F9D976] focus:ring-2 focus:ring-[#F9D976]/20 transition-all duration-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!typingValue.trim() || isLoading}
          className={`px-5 py-3 rounded-2xl font-black text-white shadow-md border-2 transition-all duration-300 flex items-center justify-center ${
            !typingValue.trim() || isLoading
              ? "bg-gray-300 border-gray-400 cursor-not-allowed"
              : "bg-[#F39C12] border-[#E67E22] hover:bg-[#E67E22] hover:scale-105 active:scale-95"
          }`}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            "보내기"
          )}
        </button>
      </form>
    </div>
  );
}

