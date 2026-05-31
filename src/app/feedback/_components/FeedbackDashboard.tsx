"use client";

import React, { useState, useMemo } from "react";
import { Star, MessageSquare, Filter, ArrowUpDown } from "lucide-react";
import { FeedbackDashboardData } from "@/app/actions/feedback";

interface FeedbackDashboardProps {
  initialStats: FeedbackDashboardData["stats"];
  initialFeedbacks: FeedbackDashboardData["feedbacks"];
}

export default function FeedbackDashboard({
  initialStats,
  initialFeedbacks,
}: FeedbackDashboardProps) {
  const [ratingFilter, setRatingFilter] = useState<number>(0); // 0: 전체, 1~5: 평점
  const [sortBy, setSortBy] = useState<string>("recent"); // "recent" | "highest" | "lowest"
  const [searchQuery, setSearchQuery] = useState<string>("");

  const ratingStats = initialStats;
  
  // 1. 피드백 필터링 및 검색, 정렬 적용
  const processedFeedbacks = useMemo(() => {
    let result = [...initialFeedbacks];

    // 평점 필터링
    if (ratingFilter > 0) {
      result = result.filter((fb) => fb.rating === ratingFilter);
    }

    // 텍스트 검색 (학생 이름 또는 피드백 본문)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (fb) =>
          (fb.student_name && fb.student_name.toLowerCase().includes(query)) ||
          (fb.comment && fb.comment.toLowerCase().includes(query)) ||
          (fb.grade && fb.grade.toLowerCase().includes(query)) ||
          (fb.class_name && fb.class_name.toLowerCase().includes(query))
      );
    }

    // 정렬
    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "highest") {
      result.sort((a, b) => b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "lowest") {
      result.sort((a, b) => a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [initialFeedbacks, ratingFilter, searchQuery, sortBy]);

  // HSL 만족도 분포 차트 컬러셋
  const scoreColors: Record<number, string> = {
    5: "bg-[hsl(145,63%,49%)]", // Emerald Green
    4: "bg-[hsl(160,60%,55%)]", // Mint Blue
    3: "bg-[hsl(48,89%,60%)]",  // Warm Yellow
    2: "bg-[hsl(28,90%,60%)]",  // Soft Orange
    1: "bg-[hsl(5,85%,60%)]",   // Coral Red
  };

  const scoreText: Record<number, string> = {
    5: "5점 (최고였어요)",
    4: "4점 (만족스러워요)",
    3: "3점 (보통이에요)",
    2: "2점 (아쉬워요)",
    1: "1점 (많이 아쉬워요)",
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
        d.getDate()
      ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  const getLevelLabel = (level: string | null) => {
    if (!level) return "";
    const levelMap: Record<string, string> = {
      elementary_3_4: "초등 3~4학년",
      elementary_5_6: "초등 5~6학년",
      middle_school: "중학생",
      high_school: "고등학생",
    };
    return levelMap[level] || level;
  };

  return (
    <div className="space-y-8">
      
      {/* 1. 요약 메트릭 카드 및 평점 분포 차트 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 메트릭 카드: 총 응답 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-bold">누적 후기 수</span>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-slate-800">{ratingStats.totalCount}</span>
            <span className="text-sm font-bold text-slate-400 ml-1">건 제출됨</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-50">
            실시간 업데이트 완료
          </div>
        </div>

        {/* 메트릭 카드: 평균 평점 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-bold">만족도 평균</span>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Star size={20} className="fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-slate-800">{ratingStats.averageRating}</span>
            <span className="text-sm font-bold text-slate-400">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-50">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                className={`${
                  s <= Math.round(ratingStats.averageRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-slate-100 text-slate-200"
                }`}
              />
            ))}
            <span className="text-[10px] text-slate-400 font-black ml-1">종합 만족도 지수</span>
          </div>
        </div>

        {/* 평점 분포도 차트 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:col-span-1">
          <h3 className="text-sm font-bold text-slate-400 mb-4">점수별 분포 현황</h3>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((score) => {
              const item = ratingStats.distribution[score] || { count: 0, percentage: 0 };
              return (
                <div key={score} className="flex items-center text-xs gap-3">
                  <span className="w-12 text-right font-black text-slate-500">{score}점</span>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreColors[score]} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-bold text-slate-400">
                    {item.count}건 ({item.percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 2. 필터 및 검색 컨트롤 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* 평점 필터 버튼 그룹 */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-black text-slate-400 mr-2 flex items-center gap-1">
            <Filter size={14} /> 만족도 필터:
          </span>
          <button
            onClick={() => setRatingFilter(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
              ratingFilter === 0
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            전체 ({initialFeedbacks.length})
          </button>
          {[5, 4, 3, 2, 1].map((score) => {
            const count = initialFeedbacks.filter((fb) => fb.rating === score).length;
            return (
              <button
                key={score}
                onClick={() => setRatingFilter(score)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors flex items-center gap-0.5 ${
                  ratingFilter === score
                    ? `${scoreColors[score]} text-white shadow-sm`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{score}점</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 검색 및 정렬 드롭다운 */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          <input
            type="text"
            placeholder="학생명, 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all w-full md:w-48 placeholder:text-slate-300"
          />

          <div className="relative flex items-center border border-slate-200 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
            <ArrowUpDown size={14} className="text-slate-400 mr-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="recent">최신순 정렬</option>
              <option value="highest">평점 높은 순</option>
              <option value="lowest">평점 낮은 순</option>
            </select>
          </div>

        </div>

      </div>

      {/* 3. 피드백 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-2">
          <span>검색/필터 결과: {processedFeedbacks.length} 건</span>
        </div>

        {processedFeedbacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 transition-all hover:translate-y-[-2px] hover:shadow-md"
              >
                
                {/* 카드 상단: 학생 메타데이터 & 만족도 별 */}
                <div className="flex justify-between items-start">
                  <div>
                    {fb.student_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 text-sm">
                          {fb.student_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black">
                          {fb.grade || "학년 미정"}-{fb.class_name || "반 미정"}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-400 text-sm italic">익명 학습자</span>
                    )}
                    
                    {fb.level && (
                      <span className="inline-block text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                        {getLevelLabel(fb.level)}
                      </span>
                    )}
                  </div>

                  {/* 별점 */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={`${
                            star <= fb.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-slate-100 text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-black text-slate-400">
                      {scoreText[fb.rating]}
                    </span>
                  </div>
                </div>

                {/* 카드 본문: 서술식 의견 */}
                <div className="text-slate-700 text-xs font-bold leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-50 flex-1">
                  "{fb.comment}"
                </div>

                {/* 카드 하단: 작성 일시 */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-2 border-t border-slate-50">
                  <span>등록 시각</span>
                  <span>{formatDate(fb.created_at)}</span>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <span className="text-4xl block">📦</span>
            <p className="text-sm font-black text-slate-400">조회된 피드백 후기가 없습니다.</p>
            <p className="text-xs text-slate-300">필터나 검색어를 변경해 보세요.</p>
          </div>
        )}
      </div>

    </div>
  );
}
