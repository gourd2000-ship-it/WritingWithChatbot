import React from "react";
import { db } from "@/lib/db";
import TeacherDashboard, { TeacherSessionItem } from "./_components/TeacherDashboard";
import Link from "next/link";

export default async function TeacherPage() {
  // 1. 전체 학생과 그들의 작문 세션 데이터를 JOIN하여 조회
  const rawSessions = await db.query<TeacherSessionItem>(
    `SELECT 
       s.id as student_id,
       s.student_name,
       s.grade,
       s.class_name,
       s.level,
       ws.id as session_id,
       ws.korean_sentence,
       ws.first_english_attempt,
       ws.final_english_sentence,
       ws.revision_count,
       ws.is_overdependent,
       ws.reflection_tags,
       ws.reflection_text,
       ws.feedback,
       ws.created_at as session_created_at,
       ws.completed_at as session_completed_at
     FROM students s
     LEFT JOIN writing_sessions ws ON s.id = ws.student_id
     ORDER BY ws.created_at DESC NULLS LAST, s.student_name ASC`
  );

  // 2. 학급 전체 성장 태그 통계 집계
  const tagCounts: Record<string, number> = {
    vocabulary: 0,
    word_order: 0,
    grammar: 0,
    confidence: 0,
  };

  rawSessions.forEach((session) => {
    if (session.reflection_tags && session.reflection_tags.length > 0) {
      session.reflection_tags.forEach((tag) => {
        if (tagCounts[tag] !== undefined) {
          tagCounts[tag]++;
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 대시보드 타이틀 영역 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-gray-800">
                📊 교사용 실시간 학습 대시보드
              </h1>
              <Link
                href="/"
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 hover:scale-[1.02]"
              >
                🏠 학생 홈
              </Link>
            </div>
            <p className="text-sm font-bold text-gray-400 mt-1.5">
              학생들의 영어 작문 세션 분석, 과의존 모니터링 및 성장 통계 현황판
            </p>
          </div>
          <div className="bg-[#EBF5FB] border border-[#AED6F1] px-5 py-3 rounded-2xl">
            <span className="text-xs text-[#2980B9] font-black uppercase">전체 학습 지표</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-gray-800">
                {rawSessions.filter(s => s.session_id !== null).length}
              </span>
              <span className="text-xs text-gray-500 font-bold">세션 진행 중/완료</span>
            </div>
          </div>
        </div>

        {/* 클라이언트 대시보드 뷰 마운트 */}
        <TeacherDashboard sessions={rawSessions} initialTagCounts={tagCounts} />
      </div>
    </div>
  );
}
