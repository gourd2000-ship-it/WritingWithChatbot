"use client";

import React, { useState, useTransition } from "react";
import { getSessionLogs, getStudentBadges } from "@/app/actions/session";
import BadgeGallery from "../../result/[sessionId]/_components/BadgeGallery";

export interface TeacherSessionItem {
  student_id: number;
  student_name: string;
  grade: string;
  class_name: string;
  level: string;
  session_id: number | null;
  korean_sentence: string | null;
  first_english_attempt: string | null;
  final_english_sentence: string | null;
  revision_count: number;
  is_overdependent: boolean;
  reflection_tags: string[] | null;
  reflection_text: string | null;
  feedback: string | null;
  session_created_at: Date | null;
  session_completed_at: Date | null;
}

interface TeacherDashboardProps {
  sessions: TeacherSessionItem[];
  initialTagCounts: Record<string, number>;
}

interface LogItem {
  role: string;
  message: string;
  hint_level: number;
  hint_type: string | null;
  detected_errors: string[] | null;
  created_at: Date;
}

export default function TeacherDashboard({
  sessions,
  initialTagCounts,
}: TeacherDashboardProps) {
  // 필터 상태
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // 상세 대화 전문 보기 모달 상태
  const [activeSession, setActiveSession] = useState<TeacherSessionItem | null>(null);
  const [sessionLogs, setSessionLogs] = useState<LogItem[]>([]);
  const [studentBadges, setStudentBadges] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // 1. 고유 학년 및 반 목록 추출 (필터용)
  const grades = Array.from(new Set(sessions.map((s) => s.grade))).sort();
  const classes = Array.from(new Set(sessions.map((s) => s.class_name))).sort();

  // 2. 필터 처리
  const filteredSessions = sessions.filter((s) => {
    const matchGrade = selectedGrade === "all" || s.grade === selectedGrade;
    const matchClass = selectedClass === "all" || s.class_name === selectedClass;
    
    let matchStatus = true;
    if (selectedStatus === "completed") {
      matchStatus = s.session_completed_at !== null;
    } else if (selectedStatus === "writing") {
      matchStatus = s.session_id !== null && s.session_completed_at === null;
    } else if (selectedStatus === "overdependent") {
      matchStatus = s.is_overdependent === true;
    }
    
    return matchGrade && matchClass && matchStatus;
  });

  // 3. 과의존 학생(is_overdependent = true) 목록 필터링 (최상단 경고용)
  const overdependentSessions = sessions.filter(
    (s) => s.is_overdependent === true && s.session_id !== null
  );

  // 4. 상세 모달 열기 및 대화 로그/뱃지 비동기 조회
  const handleOpenDetail = (session: TeacherSessionItem) => {
    if (!session.session_id) return;
    setActiveSession(session);
    setSessionLogs([]);
    setStudentBadges([]);

    startTransition(async () => {
      try {
        const [logs, badges] = await Promise.all([
          getSessionLogs(session.session_id!),
          getStudentBadges(session.student_id)
        ]);
        // Date 파싱 후 상태 갱신
        const parsedLogs = logs.map((l: any) => ({
          ...l,
          created_at: new Date(l.created_at),
        }));
        setSessionLogs(parsedLogs);
        setStudentBadges(badges);
      } catch (err) {
        console.error("상세 정보 조회 실패:", err);
      }
    });
  };

  // 5. 성장 태그 통계 비율 계산용 도우미
  const totalTagsSelected = Object.values(initialTagCounts).reduce((a, b) => a + b, 0);
  const getTagPercent = (count: number) => {
    if (totalTagsSelected === 0) return 0;
    return Math.round((count / totalTagsSelected) * 100);
  };

  const tagLabels: Record<string, { label: string; icon: string; bg: string; barColor: string }> = {
    vocabulary: { label: "어휘 성장", icon: "🔤", bg: "bg-[#EBF5FB]", barColor: "bg-[#3498DB]" },
    word_order: { label: "어순 정복", icon: "🧩", bg: "bg-[#E8F8F5]", barColor: "bg-[#2ECC71]" },
    grammar: { label: "문법 이해", icon: "⏰", bg: "bg-[#F5EEF8]", barColor: "bg-[#9B59B6]" },
    confidence: { label: "유능감 뱃지", icon: "💪", bg: "bg-[#FDEDEC]", barColor: "bg-[#E74C3C]" },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* (1) 과의존 학생 ⚠️ 최상단 경고 영역 */}
      {overdependentSessions.length > 0 && (
        <div className="bg-[#FDEDEC] border-2 border-[#FADBD8] rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-black text-[#CB4335] flex items-center gap-2">
            ⚠️ <span>AI 힌트 과의존 경고 그룹 ({overdependentSessions.length}명)</span>
          </h2>
          <p className="text-xs text-[#E74C3C] font-bold mt-1">
            한 작문 세션 내에서 고강도 힌트(단어 카드, 문장틀)를 연속 2회 이상 사용하여 AI 의존도가 높은 학생 리스트입니다. 개별 학습 지도를 권장합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {overdependentSessions.slice(0, 3).map((os, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-[#FADBD8] shadow-sm hover:scale-[1.01] transition-transform flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-gray-800">{os.student_name}</span>
                    <span className="text-[10px] font-black bg-[#FDEDEC] text-[#E74C3C] px-2 py-0.5 rounded-full">
                      {os.grade}학년 {os.class_name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold mt-2 truncate">
                    원래 뜻: "{os.korean_sentence}"
                  </p>
                  <p className="text-xs font-bold text-gray-700 font-mono mt-1 truncate">
                    최종/진행: "{os.final_english_sentence || os.first_english_attempt || "입력 전"}"
                  </p>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-black">수정 {os.revision_count}회</span>
                  <button
                    onClick={() => handleOpenDetail(os)}
                    className="text-xs font-black text-[#CB4335] hover:underline"
                  >
                    대화 모니터링 🔍
                  </button>
                </div>
              </div>
            ))}
            {overdependentSessions.length > 3 && (
              <div className="bg-[#FDEDEC]/50 border border-dashed border-[#FADBD8] rounded-2xl flex items-center justify-center p-4">
                <span className="text-xs text-[#CB4335] font-black">외 {overdependentSessions.length - 3}명의 학생이 더 존재합니다. 아래 목록에서 확인 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* (2) 성장 통계 차트 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 성장 카드 통계 그래프 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-base font-black text-gray-800">🌱 우리 학급의 영어 성장 도달 통계</h3>
          <p className="text-xs text-gray-400 font-bold">
            학생들이 작문을 성공적으로 마치고 스스로 꼽은 배움의 핵심 통계 정보입니다.
          </p>

          <div className="space-y-4 pt-2">
            {Object.keys(tagLabels).map((tagId) => {
              const labelInfo = tagLabels[tagId];
              const count = initialTagCounts[tagId] || 0;
              const percent = getTagPercent(count);
              return (
                <div key={tagId} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 font-black text-gray-700">
                      <span>{labelInfo.icon}</span>
                      <span>{labelInfo.label}</span>
                    </span>
                    <span className="font-black text-gray-500">{count}회 ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className={`${labelInfo.barColor} h-full rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 요약 대시보드 정보 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-base font-black text-gray-800">📈 실시간 모니터링 지표</h3>
          
          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-[#EBF5FB] p-4 rounded-2xl text-center border border-[#AED6F1]">
              <span className="text-[10px] text-[#2980B9] font-black uppercase">평균 수정 횟수</span>
              <p className="text-xl font-black text-gray-800 mt-1">
                {(
                  sessions.reduce((acc, curr) => acc + (curr.revision_count || 0), 0) /
                  (sessions.filter((s) => s.session_id !== null).length || 1)
                ).toFixed(1)}회
              </p>
            </div>
            <div className="bg-[#E8F8F5] p-4 rounded-2xl text-center border border-[#A9DFBF]">
              <span className="text-[10px] text-[#27AE60] font-black uppercase">작문 완료율</span>
              <p className="text-xl font-black text-gray-800 mt-1">
                {(
                  (sessions.filter((s) => s.session_completed_at !== null).length /
                    (sessions.filter((s) => s.session_id !== null).length || 1)) *
                  100
                ).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-bold bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            💡 **지표 활용 가이드**: 수정(Revision) 횟수가 높을수록 주도적 연습량이 많음을 뜻하며, 과의존 학생이 많을 시 스캐폴딩 힌트 Fading 설정을 보완하는 척도로 사용합니다.
          </div>
        </div>
      </div>

      {/* (3) 필터 컨트롤 영역 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-1">
          🔍 <span>학생 레코드 정밀 필터링</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 학년 필터 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-400">학년</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-[#4A90E2] focus:outline-none text-xs font-black text-gray-700 bg-white"
            >
              <option value="all">전체 학년</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
          </div>

          {/* 반 필터 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-400">반</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-[#4A90E2] focus:outline-none text-xs font-black text-gray-700 bg-white"
            >
              <option value="all">전체 반</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-400">세션 진행 상태</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-3.5 border-2 border-gray-100 rounded-xl focus:border-[#4A90E2] focus:outline-none text-xs font-black text-gray-700 bg-white"
            >
              <option value="all">전체 세션 상태</option>
              <option value="completed">완료된 세션</option>
              <option value="writing">진행 중인 세션</option>
              <option value="overdependent">과도한 의존 ⚠️</option>
            </select>
          </div>
        </div>
      </div>

      {/* (4) 메인 세션 테이블 */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-800">
            📋 대화 세션 목록 ({filteredSessions.length}개 검색됨)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-black text-gray-400 bg-gray-50/20">
                <th className="px-6 py-4">학생 정보</th>
                <th className="px-6 py-4">목표 뜻 (한글)</th>
                <th className="px-6 py-4">최종/최근 영어 문장</th>
                <th className="px-6 py-4 text-center">수정 횟수</th>
                <th className="px-6 py-4 text-center">과의존</th>
                <th className="px-6 py-4">배운 점 (반성)</th>
                <th className="px-6 py-4 text-center">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                    필터링 조건에 일치하는 학생 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session, index) => {
                  const isComp = session.session_completed_at !== null;
                  return (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        session.is_overdependent ? "bg-[#FDEDEC]/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-800 text-sm">{session.student_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {session.grade}학년 {session.class_name} • {session.level === "elementary_3_4" ? "초등3-4" : session.level === "elementary_5_6" ? "초등5-6" : session.level === "middle_school" ? "중등" : "고등"}
                        </p>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate font-medium text-gray-500">
                        {session.korean_sentence || "-"}
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate font-mono">
                        {isComp ? (
                          <span className="text-[#27AE60] font-black">
                            ✓ {session.final_english_sentence}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            {session.first_english_attempt || "입력 시도 중..."}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-black">
                        {session.session_id ? `${session.revision_count}회` : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {session.is_overdependent ? (
                          <span className="text-[#E74C3C] text-sm font-black" title="과의존 경고">
                            ⚠️
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {session.reflection_tags && session.reflection_tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {session.reflection_tags.map((t, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                                  tagLabels[t]?.bg || "bg-gray-100"
                                }`}
                              >
                                {tagLabels[t]?.label || t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">미완료/반성 없음</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {session.session_id ? (
                          <button
                            onClick={() => handleOpenDetail(session)}
                            className="bg-white border-2 border-gray-100 text-gray-600 hover:text-gray-800 hover:border-gray-200 px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
                          >
                            상세 분석
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* (5) 대화 상세 분석 모달 */}
      {activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-100 animate-scale-in">
            {/* 모달 헤더 */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
              <div>
                <span className="text-[10px] font-black bg-[#EBF5FB] text-[#2980B9] border border-[#AED6F1] px-2.5 py-1 rounded-full">
                  {activeSession.grade}학년 {activeSession.class_name} • {activeSession.student_name}
                </span>
                <h3 className="text-lg font-black text-gray-800 mt-2">
                  작문 튜터링 상세 대화 로그 모니터링
                </h3>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light p-1"
              >
                &times;
              </button>
            </div>

            {/* 모달 바디 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 기본 요약 카드 */}
              <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-100 space-y-3">
                <p className="text-xs font-black text-gray-400">우리말 원문: <span className="text-gray-700">"{activeSession.korean_sentence}"</span></p>
                <p className="text-xs font-black text-gray-400">처음 영어 시도: <span className="text-gray-700 font-mono">"{activeSession.first_english_attempt || "-"}"</span></p>
                <p className="text-xs font-black text-gray-400">최종 영어 완성: <span className="text-[#27AE60] font-mono font-black">"{activeSession.final_english_sentence || "진행 중"}"</span></p>
              </div>

              {/* 대화 타임라인 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 border-b border-gray-100 pb-2">작문 학습 타임라인</h4>
                
                {isPending ? (
                  <div className="flex justify-center items-center py-12">
                    <span className="animate-spin rounded-full h-8 w-8 border-2 border-[#4A90E2] border-t-transparent"></span>
                    <span className="text-xs text-gray-400 font-bold ml-2">대화 로그를 로드하는 중...</span>
                  </div>
                ) : sessionLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">대화 내용이 존재하지 않습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {sessionLogs.map((log, index) => {
                      const isStudent = log.role === "student";
                      return (
                        <div
                          key={index}
                          className={`flex flex-col ${isStudent ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1">
                            {isStudent ? "🧑‍🎓 학생" : `🤖 AI 튜터 (${log.hint_level}단계: ${log.hint_type})`}
                          </span>
                          <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs font-bold leading-relaxed whitespace-pre-wrap shadow-sm border ${
                              isStudent
                                ? "bg-[#EBF5FB] border-[#AED6F1] text-[#2980B9] rounded-tr-none font-mono"
                                : "bg-[#FEF9E7] border-[#F9E79F] text-gray-800 rounded-tl-none"
                            }`}
                          >
                            {log.message}
                            
                            {/* 감지된 오류 태그 노출 */}
                            {!isStudent && log.detected_errors && log.detected_errors.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-[#FADBD8]/40">
                                <span className="text-[9px] text-gray-400 font-black">감지된 오류:</span>
                                {log.detected_errors.map((err, eIdx) => (
                                  <span
                                    key={eIdx}
                                    className="bg-red-50 text-red-500 border border-red-200 text-[8px] font-black px-1.5 py-0.5 rounded"
                                  >
                                    {err}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 완료 시 정성 피드백 및 소감 모아보기 */}
              {activeSession.session_completed_at && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="bg-[#FEF9E7] border border-[#F9E79F] p-4 rounded-2xl">
                    <h5 className="text-[10px] font-black text-yellow-600 mb-1.5">🤖 제공된 AI 정성 피드백</h5>
                    <p className="text-xs text-gray-700 leading-relaxed font-bold">
                      {activeSession.feedback}
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h5 className="text-[10px] font-black text-gray-400 mb-1.5">🧑‍🎓 학생의 자기반성 소감</h5>
                      <p className="text-xs text-gray-700 italic font-bold">
                        {activeSession.reflection_text ? `"${activeSession.reflection_text}"` : "(작성한 한 줄 소감이 없습니다)"}
                      </p>
                    </div>
                    {activeSession.reflection_tags && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {activeSession.reflection_tags.map((t, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                              tagLabels[t]?.bg || "bg-gray-100"
                            }`}
                          >
                            {tagLabels[t]?.label || t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 학생의 누적 획득 뱃지 도감 모아보기 */}
              <div className="pt-4 border-t border-gray-100">
                <BadgeGallery 
                  earnedBadges={studentBadges} 
                  title="🏅 학생의 누적 성장 뱃지 도감" 
                  subtitle="이 학생이 지금까지 획득한 성장 뱃지 수집 현황입니다."
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end rounded-b-3xl">
              <button
                onClick={() => setActiveSession(null)}
                className="bg-[#4A90E2] text-white hover:bg-[#357ABD] text-xs font-black px-6 py-2.5 rounded-xl shadow-md transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
