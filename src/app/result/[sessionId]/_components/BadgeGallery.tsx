"use client";

import React from "react";

interface BadgeDef {
  code: string;
  label: string;
  description: string;
  icon: string;
  bgActive: string;
  borderActive: string;
  textActive: string;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    code: "persistence_master",
    label: "끈기 대장 뱃지",
    description: "포기하지 않고 4번 이상 문장을 고쳤어요!",
    icon: "🏅",
    bgActive: "bg-[#FEF9E7]",
    borderActive: "border-[#F4D03F]",
    textActive: "text-[#B7950B]",
  },
  {
    code: "word_explorer",
    label: "어휘 탐험가 뱃지",
    description: "6자 이상의 유창한 단어를 3개 이상 썼어요!",
    icon: "🔤",
    bgActive: "bg-[#EBF5FB]",
    borderActive: "border-[#5DADE2]",
    textActive: "text-[#1B4F72]",
  },
  {
    code: "self_reliant",
    label: "스스로 일어서기",
    description: "고강도 AI 힌트 없이 스스로 작문을 해결했어요!",
    icon: "🚀",
    bgActive: "bg-[#E8F8F5]",
    borderActive: "border-[#48C9B0]",
    textActive: "text-[#0E6251]",
  },
  {
    code: "active_reflector",
    label: "성장 메아리 뱃지",
    description: "나의 학습 되돌아보기를 30자 이상 진심으로 적었어요!",
    icon: "💬",
    bgActive: "bg-[#F5EEF8]",
    borderActive: "border-[#AF7AC5]",
    textActive: "text-[#512E5F]",
  },
  {
    code: "steady_3",
    label: "차근차근 3회 완료",
    description: "꾸준한 작문 완료 성공 3회 달성!",
    icon: "🌱",
    bgActive: "bg-[#EAFAF1]",
    borderActive: "border-[#58D68D]",
    textActive: "text-[#145A32]",
  },
  {
    code: "steady_5",
    label: "차근차근 5회 완료",
    description: "꾸준한 작문 완료 성공 5회 달성!",
    icon: "🌟",
    bgActive: "bg-[#FDF2E9]",
    borderActive: "border-[#F0B27A]",
    textActive: "text-[#7E5109]",
  },
  {
    code: "steady_10",
    label: "차근차근 10회 완료",
    description: "꾸준한 작문 완료 성공 10회 달성!",
    icon: "🏆",
    bgActive: "bg-[#FDEDEC]",
    borderActive: "border-[#EC7063]",
    textActive: "text-[#7B241C]",
  },
  {
    code: "brave_challenger",
    label: "용감한 도전가 🦁",
    description: "내 수준보다 어려운 문장에 당당히 도전해 완수했어요!",
    icon: "🦁",
    bgActive: "bg-[#FDF2E9]",
    borderActive: "border-[#E67E22]",
    textActive: "text-[#D35400]",
  },
];

interface BadgeGalleryProps {
  earnedBadges: string[];
  newBadges?: string[];
  title?: string;
  subtitle?: string;
}

export default function BadgeGallery({
  earnedBadges,
  newBadges = [],
  title = "🏅 나의 영어 성장 뱃지 보관함",
  subtitle = "작문을 하며 획득한 다양한 성장 뱃지 도감입니다. 도전하여 모두 수집해 봐요!",
}: BadgeGalleryProps) {
  return (
    <div className="bg-[#F8F9FA] border border-gray-100 p-6 rounded-3xl space-y-4">
      <div>
        <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
          {title}
        </h3>
        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {BADGE_DEFS.map((badge) => {
          const isEarned = earnedBadges.includes(badge.code);
          const isNew = newBadges.includes(badge.code);

          return (
            <div
              key={badge.code}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all duration-300 relative overflow-hidden ${
                isEarned
                  ? `${badge.bgActive} ${badge.borderActive} shadow-sm ${
                      isNew ? "animate-pulse-subtle ring-2 ring-offset-2 ring-yellow-400" : ""
                    }`
                  : "bg-white border-gray-100 opacity-60 grayscale"
              }`}
            >
              {/* 오늘 새로 획득한 뱃지 태그 */}
              {isNew && (
                <span className="absolute top-0 right-0 bg-yellow-400 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm">
                  NEW! 🎉
                </span>
              )}

              {/* 뱃지 아이콘 */}
              <div className="text-3xl select-none flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-inner border border-gray-50">
                {isEarned ? badge.icon : "🔒"}
              </div>

              {/* 뱃지 이름 및 설명 */}
              <div className="min-w-0">
                <h4
                  className={`text-xs font-black truncate ${
                    isEarned ? badge.textActive : "text-gray-400"
                  }`}
                >
                  {badge.label}
                </h4>
                {isEarned && (
                  <p className="text-[9px] font-bold text-gray-400 mt-0.5 leading-snug line-clamp-2 animate-fade-in">
                    {badge.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
