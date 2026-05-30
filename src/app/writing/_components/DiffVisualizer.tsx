"use client";

import React from "react";

export interface DiffToken {
  type: "added" | "removed" | "equal";
  value: string;
}

/**
 * 단어 단위로 마침표/쉼표 등 구두점 차이를 정규화하여 두 문장을 비교 분석합니다.
 */
export function diffWords(oldStr: string, newStr: string): DiffToken[] {
  const oldWords = oldStr.trim().split(/\s+/).filter(Boolean);
  const newWords = newStr.trim().split(/\s+/).filter(Boolean);
  
  const n = oldWords.length;
  const m = newWords.length;
  
  const dp: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0));
    
  // DP 테이블 빌드 (LCS)
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const word1Clean = oldWords[i - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      const word2Clean = newWords[j - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      
      if (word1Clean === word2Clean) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const diff: DiffToken[] = [];
  let i = n, j = m;
  
  // 역추적하여 토큰 구분
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const word1Clean = oldWords[i - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      const word2Clean = newWords[j - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      
      if (word1Clean === word2Clean) {
        diff.unshift({ type: "equal", value: newWords[j - 1] });
        i--;
        j--;
        continue;
      }
    }
    
    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: "added", value: newWords[j - 1] });
      j--;
    } else {
      diff.unshift({ type: "removed", value: oldWords[i - 1] });
      i--;
    }
  }
  
  return diff;
}

interface DiffVisualizerProps {
  koreanSentence: string;
  firstAttempt: string | null;
  currentAttempt: string;
}

export default function DiffVisualizer({
  koreanSentence,
  firstAttempt,
  currentAttempt,
}: DiffVisualizerProps) {
  
  // 비교할 대상이 아직 없는 경우 가이드 제공
  if (!firstAttempt) {
    return (
      <div className="bg-[#FFFDF9] border border-[#F4EFCF] p-4 rounded-2xl mb-4 shadow-sm transition-all duration-300">
        <div className="text-sm font-bold text-[#E67E22] mb-1">🎯 도전할 우리말 문장</div>
        <div className="text-base font-extrabold text-[#2C3E50] mb-3">“ {koreanSentence} ”</div>
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center font-medium">
          💡 첫 문장을 아래에 적어서 튜터링을 시작해 보세요!
        </div>
      </div>
    );
  }

  // 비교 분석 수행
  const diffs = diffWords(firstAttempt, currentAttempt || "");

  return (
    <div className="bg-[#FFFDF9] border border-[#F4EFCF] p-4 rounded-2xl mb-4 shadow-sm transition-all duration-300">
      {/* 우리말 문장 표시 */}
      <div className="text-sm font-bold text-[#E67E22] mb-1">🎯 도전할 우리말 문장</div>
      <div className="text-base font-extrabold text-[#2C3E50] mb-4">“ {koreanSentence} ”</div>

      <hr className="border-[#F4EFCF] mb-3" />

      {/* 첫 시도 문장 표시 */}
      <div className="mb-2">
        <span className="text-xs font-bold text-gray-400 block mb-1">처음 시도했던 문장</span>
        <div className="text-sm font-semibold text-gray-500 italic bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
          {firstAttempt}
        </div>
      </div>

      {/* 실시간 단어 Diff 표시 */}
      <div>
        <span className="text-xs font-bold text-[#3498DB] block mb-1">나의 문장 실시간 변화 (수정 비교)</span>
        <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-gray-100 min-h-[44px] items-center">
          {diffs.length === 0 ? (
            <span className="text-xs text-gray-400 font-medium">입력된 문장이 없습니다.</span>
          ) : (
            diffs.map((token, index) => {
              if (token.type === "added") {
                return (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs font-extrabold text-[#27AE60] bg-[#E8F8F5] border border-[#A3E4D7] rounded-md animate-fade-in"
                  >
                    + {token.value}
                  </span>
                );
              }
              if (token.type === "removed") {
                return (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs font-extrabold text-[#E74C3C] bg-[#FDEDEC] border border-[#FADBD8] rounded-md line-through"
                  >
                    - {token.value}
                  </span>
                );
              }
              return (
                <span
                  key={index}
                  className="inline-block px-1.5 py-0.5 text-xs font-semibold text-gray-700"
                >
                  {token.value}
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
