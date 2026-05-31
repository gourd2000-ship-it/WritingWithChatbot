"use client";

import React from "react";

interface GrowthVisualizerProps {
  firstAttempt: string;
  finalSentence: string;
  revisionCount: number;
}

export default function GrowthVisualizer({
  firstAttempt,
  finalSentence,
  revisionCount,
}: GrowthVisualizerProps) {
  // 단어 수 파싱
  const getWordCount = (sentence: string) => {
    if (!sentence.trim()) return 0;
    return sentence.trim().split(/\s+/).length;
  };

  const firstWords = getWordCount(firstAttempt);
  const finalWords = getWordCount(finalSentence);

  // 단어 수 변화 비율 계산 (최대 12개 단어 기준 게이지 백분율)
  const maxWords = Math.max(12, firstWords, finalWords);
  const firstPercent = Math.min(100, (firstWords / maxWords) * 100);
  const finalPercent = Math.min(100, (finalWords / maxWords) * 100);

  return (
    <div className="space-y-6">
      {/* 1. 문장 성장 대조 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 처음 쓴 문장 */}
        <div className="bg-[#FDEDEC] border border-[#FADBD8] p-5 rounded-2xl relative shadow-sm">
          <span className="absolute -top-3 left-4 bg-[#EC7063] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            ❌ 처음 쓴 문장
          </span>
          <p className="text-sm text-gray-500 font-bold font-mono mt-2 min-h-12 flex items-center">
            "{firstAttempt || "(문장을 직접 쓰지 않고 완료했어요)"}"
          </p>
          <div className="text-right text-[10px] text-gray-400 font-bold mt-2">
            단어 수: {firstWords}개
          </div>
        </div>

        {/* 최종 완성 문장 */}
        <div className="bg-[#E8F8F5] border border-[#A9DFBF] p-5 rounded-2xl relative shadow-sm">
          <span className="absolute -top-3 left-4 bg-[#2ECC71] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            ✅ 최종 완성 문장
          </span>
          <p className="text-base text-gray-800 font-bold font-mono mt-2 min-h-12 flex items-center">
            "{finalSentence}"
          </p>
          <div className="text-right text-[10px] text-gray-400 font-bold mt-2">
            단어 수: {finalWords}개
          </div>
        </div>
      </div>

      {/* 2. 유능감 유도 게이지 및 배지 */}
      <div className="bg-[#F8F9FA] border border-gray-100 p-6 rounded-2xl">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex justify-between items-center">
          <span>📊 나의 문장 성장 게이지</span>
          <span className="text-[#3498DB] text-xs font-black">
            단어 {firstWords}개 ➡️ {finalWords}개로 성장!
          </span>
        </h3>

        <div className="space-y-4">
          {/* 처음 단어 수 막대 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>시작한 힘</span>
              <span>{firstWords} Words</span>
            </div>
            <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden">
              <div
                className="bg-[#EC7063] h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${firstPercent}%` }}
              ></div>
            </div>
          </div>

          {/* 최종 단어 수 막대 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1">
                <span>자라난 힘</span>
                {finalWords > firstWords && (
                  <span className="text-[10px] font-black bg-[#E8F8F5] text-[#27AE60] px-1.5 py-0.5 rounded-md">
                    +{finalWords - firstWords}단어 추가!
                  </span>
                )}
              </span>
              <span className="text-gray-800 font-black">{finalWords} Words</span>
            </div>
            <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2ECC71] h-full rounded-full transition-all duration-1000 ease-out shadow-inner"
                style={{ width: `${finalPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 노력 배지 */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-xs font-black text-gray-400">도전과 반성의 흔적</p>
              <p className="text-sm font-black text-gray-800 mt-0.5">
                총 <span className="text-[#E74C3C]">{revisionCount}회</span> 스스로 문장 다듬기 성공!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
