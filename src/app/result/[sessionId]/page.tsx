import React from "react";
import { getSessionDetails, getStudentBadges } from "@/app/actions/session";
import { db } from "@/lib/db";
import ReflectionForm from "./_components/ReflectionForm";
import GrowthVisualizer from "./_components/GrowthVisualizer";
import BadgeGallery from "./_components/BadgeGallery";
import Link from "next/link";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ finalAttempt?: string }>;
}

export default async function ResultPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const { finalAttempt: queryFinalAttempt } = await searchParams;
  const sId = parseInt(sessionId, 10);

  if (isNaN(sId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E4E8F0] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-black text-gray-800 mt-4">잘못된 세션 접근</h1>
          <p className="text-sm text-gray-500 mt-2">유효하지 않은 세션 ID입니다.</p>
          <Link
            href="/"
            className="mt-6 inline-block bg-[#4A90E2] text-white font-bold px-6 py-3 rounded-2xl hover:bg-[#357ABD] transition-colors"
          >
            처음으로 가기
          </Link>
        </div>
      </div>
    );
  }

  // 1. 세션 및 학생 상세 정보 조회
  const session = await getSessionDetails(sId);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-[#E4E8F0] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <span className="text-5xl">🔍</span>
          <h1 className="text-xl font-black text-gray-800 mt-4">세션을 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-500 mt-2">존재하지 않거나 삭제된 학습 세션입니다.</p>
          <Link
            href="/"
            className="mt-6 inline-block bg-[#4A90E2] text-white font-bold px-6 py-3 rounded-2xl hover:bg-[#357ABD] transition-colors"
          >
            처음으로 가기
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = session.completed_at !== null;

  // 3. 누적 및 오늘 새로 획득한 뱃지 판단 로직
  const earnedBadges = isCompleted ? await getStudentBadges(session.student_id) : [];
  const newBadges: string[] = [];

  if (isCompleted) {
    // 1) 끈기 대장 (persistence_master): 수정 4회 이상
    if ((session.revision_count || 0) >= 4) {
      newBadges.push("persistence_master");
    }

    // 2) 어휘 탐험가 (word_explorer): 6자 이상 영단어 3개 이상
    const words = (session.final_english_sentence || "")
      .split(/\s+/)
      .map((w: string) => w.replace(/[^a-zA-Z]/g, ""));
    const longWordsCount = words.filter((w: string) => w.length >= 6).length;
    if (longWordsCount >= 3) {
      newBadges.push("word_explorer");
    }

    // 3) 스스로 일어서기 (self_reliant): 과의존이 아니며 고강도 힌트 사용 1회 이하
    if (!session.is_overdependent) {
      const highHintLogs = await db.getOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM conversation_logs 
         WHERE session_id = $1 AND role = 'tutor' AND hint_level >= 4`,
        [sId]
      );
      const highHintCount = highHintLogs ? parseInt(highHintLogs.count, 10) : 0;
      if (highHintCount <= 1) {
        newBadges.push("self_reliant");
      }
    }

    // 4) 성장 메아리 (active_reflector): 주관식 소감 30자 이상
    if (session.reflection_text && session.reflection_text.trim().length >= 30) {
      newBadges.push("active_reflector");
    }

    // 5) 차근차근 성장 (steady_3, steady_5, steady_10)
    const prevCompleted = await db.getOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM writing_sessions 
       WHERE student_id = $1 AND completed_at IS NOT NULL AND id != $2`,
      [session.student_id, sId]
    );
    const prevCount = prevCompleted ? parseInt(prevCompleted.count, 10) : 0;
    const totalCount = prevCount + 1; // 이번 세션 완료 기준

    if (totalCount === 3) newBadges.push("steady_3");
    if (totalCount === 5) newBadges.push("steady_5");
    if (totalCount === 10) newBadges.push("steady_10");

    // 6) 용감한 도전가 (brave_challenger) 🦁
    if (session.is_challenging) {
      newBadges.push("brave_challenger");
    }
  }

  // 4. 미완료 상태일 때, 최종 완성하려고 하던 영어 문장 결정
  let finalAttempt = queryFinalAttempt || "";
  if (!isCompleted && !finalAttempt) {
    // 쿼리 파라미터가 없다면 DB에서 가장 최근 학생의 대화 기록 로드
    const lastStudentLog = await db.getOne<{ message: string }>(
      `SELECT message FROM conversation_logs 
       WHERE session_id = $1 AND role = 'student' 
       ORDER BY created_at DESC LIMIT 1`,
      [sId]
    );
    if (lastStudentLog) {
      finalAttempt = lastStudentLog.message;
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {/* 헤더 영역 */}
        <div className="bg-gradient-to-r from-[#EBF5FB] to-[#E8F8F5] px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-[#2980B9] bg-[#EBF5FB] border border-[#AED6F1] px-3 py-1 rounded-full uppercase tracking-wider">
              {session.level === "elementary_3_4"
                ? "초등 3~4학년"
                : session.level === "elementary_5_6"
                ? "초등 5~6학년"
                : session.level === "middle_school"
                ? "중학생"
                : "고등학생"}
            </span>
            <h1 className="text-2xl font-black text-gray-800 mt-2">
              {session.student_name} 학생의 영어 성장 리포트
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-bold">반성 단계</p>
            <p className="text-sm font-black text-gray-700">
              {isCompleted ? "🎉 완료됨" : "✍️ 진행 중"}
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="p-8">
          {!isCompleted ? (
            // 3. 미완료 세션: 자기반성(성장 카드 선택) 작성 폼
            <ReflectionForm
              sessionId={sId}
              koreanSentence={session.korean_sentence}
              finalAttempt={finalAttempt}
            />
          ) : (
            // 4. 완료된 세션: 성장 리포트 및 게이지 시각화
            <div className="space-y-8 animate-fade-in">
              {/* 학습 성취 시각화 게이지 */}
              <GrowthVisualizer
                firstAttempt={session.first_english_attempt || ""}
                finalSentence={session.final_english_sentence || ""}
                revisionCount={session.revision_count || 0}
              />

              {/* AI 튜터 정성 피드백 */}
              <div className="bg-[#FEF9E7] border-2 border-[#F9E79F] p-6 rounded-2xl relative shadow-sm">
                <div className="absolute -top-3 left-6 bg-[#F4D03F] text-white text-xs font-black px-3 py-1 rounded-full">
                  🤖 AI 튜터의 정성 피드백
                </div>
                <p className="text-sm text-gray-700 font-bold leading-relaxed whitespace-pre-wrap mt-2">
                  {session.feedback}
                </p>
              </div>

              {/* 내가 선택한 성장 태그 및 한 줄 반성 */}
              <div className="bg-[#F8F9FA] border border-gray-100 p-6 rounded-2xl">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-1.5">
                  🌱 내가 선택한 오늘의 영어 성장 카드
                </h3>
                <div className="flex flex-wrap gap-3">
                  {session.reflection_tags && session.reflection_tags.length > 0 ? (
                    session.reflection_tags.map((tag: string, index: number) => {
                      const tagConfig: Record<string, { label: string; icon: string; bg: string; border: string; text: string }> = {
                        vocabulary: {
                          label: "어휘 성장",
                          icon: "🔤",
                          bg: "bg-[#EBF5FB]",
                          border: "border-[#AED6F1]",
                          text: "text-[#2980B9]",
                        },
                        word_order: {
                          label: "어순 정복",
                          icon: "🧩",
                          bg: "bg-[#E8F8F5]",
                          border: "border-[#A9DFBF]",
                          text: "text-[#27AE60]",
                        },
                        grammar: {
                          label: "문법 이해",
                          icon: "⏰",
                          bg: "bg-[#F5EEF8]",
                          border: "border-[#D7BDE2]",
                          text: "text-[#8E44AD]",
                        },
                        confidence: {
                          label: "유능감 뱃지",
                          icon: "💪",
                          bg: "bg-[#FDEDEC]",
                          border: "border-[#FADBD8]",
                          text: "text-[#CB4335]",
                        },
                      };
                      const conf = tagConfig[tag] || {
                        label: tag,
                        icon: "✨",
                        bg: "bg-gray-100",
                        border: "border-gray-200",
                        text: "text-gray-600",
                      };
                      return (
                        <span
                          key={index}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-black shadow-sm ${conf.bg} ${conf.border} ${conf.text}`}
                        >
                          <span>{conf.icon}</span>
                          <span>{conf.label}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">선택된 태그가 없습니다.</span>
                  )}
                </div>

                {session.reflection_text && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <h4 className="text-xs font-black text-gray-500 mb-2">내가 남긴 한 줄 반성 소감</h4>
                    <p className="text-sm font-bold text-gray-700 bg-white p-4 rounded-xl border border-gray-100 shadow-inner">
                      💡 "{session.reflection_text}"
                    </p>
                  </div>
                )}
              </div>

              {/* 누적 성장 뱃지 보관함 */}
              <BadgeGallery earnedBadges={earnedBadges} newBadges={newBadges} />

              {/* 하단 제어 버튼 */}
              <div className="flex justify-center pt-4">
                <Link
                  href="/"
                  className="bg-[#4A90E2] text-white text-sm font-black px-12 py-3.5 rounded-2xl shadow-md hover:bg-[#357ABD] transition-all hover:scale-[1.02] flex items-center justify-center"
                >
                  새 문장 작문하러 가기 🚀
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
