import React from "react";
export const dynamic = "force-dynamic";
import { getFeedbackDashboardData } from "@/app/actions/feedback";
import FeedbackDashboard from "./_components/FeedbackDashboard";
import Link from "next/link";

export default async function FeedbackPage() {
  const response = await getFeedbackDashboardData();

  if (!response.success || !response.data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-black text-slate-800 mt-4">데이터 로드 실패</h1>
          <p className="text-sm text-slate-500 mt-2">
            {response.error || "피드백 데이터를 가져오는 중 오류가 발생했습니다."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block bg-[#4A90E2] text-white font-bold px-6 py-3 rounded-2xl hover:bg-[#357ABD] transition-colors"
          >
            홈으로 가기
          </Link>
        </div>
      </div>
    );
  }

  const { stats, feedbacks } = response.data;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 관리자 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              제작자 전용 어드민
            </span>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-1.5 flex items-center gap-2">
              사용후기 분석 대시보드 📊
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs font-black text-slate-400 hover:text-slate-600 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
          >
            ← 서비스 홈화면
          </Link>
        </div>

        {/* 대시보드 메인 클라이언트 컴포넌트 */}
        <FeedbackDashboard initialStats={stats} initialFeedbacks={feedbacks} />

      </div>
    </div>
  );
}
