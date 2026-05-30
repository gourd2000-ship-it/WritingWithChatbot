"use client";

import React, { useState, useEffect, useRef } from "react";
import DiffVisualizer from "./DiffVisualizer";
import MessageBubble from "./MessageBubble";
import WritingInput from "./WritingInput";
import { sendChatMessage } from "@/app/actions/chat";
import { useRouter } from "next/navigation";

interface ChatLogItem {
  role: string;
  message: string;
  hint_level: number;
  hint_type: string | null;
}

interface ChatInterfaceProps {
  sessionId: number;
  koreanSentence: string;
  initialLogs: ChatLogItem[];
  firstAttempt: string | null;
  isOverdependent: boolean;
}

export default function ChatInterface({
  sessionId,
  koreanSentence,
  initialLogs,
  firstAttempt: dbFirstAttempt,
  isOverdependent: dbIsOverdependent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatLogItem[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [firstAttempt, setFirstAttempt] = useState<string | null>(dbFirstAttempt);
  const [currentAttempt, setCurrentAttempt] = useState<string>("");
  const [typingValue, setTypingValue] = useState<string>(""); // 실시간 타이핑 입력 상태 추가
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showCompleteBtn, setShowCompleteBtn] = useState(false);
  const [isOverdependent, setIsOverdependent] = useState(dbIsOverdependent);
  const [systemError, setSystemError] = useState<string | null>(null);

  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 로드 시 초기 힌트 레벨 및 현재 작성 문장 바인딩
  useEffect(() => {
    const tutorLogs = initialLogs.filter((l) => l.role === "tutor");
    if (tutorLogs.length > 0) {
      setHintLevel(tutorLogs[tutorLogs.length - 1].hint_level);
    }
    
    const studentLogs = initialLogs.filter((l) => l.role === "student");
    if (studentLogs.length > 0) {
      // 가장 최근 학생 시도 문장을 현재 작성 완료된 문장 상태로 복원
      const lastMessage = studentLogs[studentLogs.length - 1].message;
      setCurrentAttempt(lastMessage);
      setTypingValue(lastMessage);
    }
    
    // 학생 시도 이력이 한 번이라도 존재하면 완료 가능 상태로 전환
    if (studentLogs.length > 0) {
      setShowCompleteBtn(true);
    }
  }, [initialLogs]);

  // 새로운 메시지 도착 시 스크롤을 하단으로 이동시킴
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // 학생의 영어 문장 제출 처리
  const handleSendMessage = async (msg: string) => {
    setIsLoading(true);
    setSystemError(null);
    setTypingValue(""); // 인풋창 비우기
    
    // 1. 학생 메시지 로컬 리스트에 즉시 추가
    const studentLog: ChatLogItem = {
      role: "student",
      message: msg,
      hint_level: 0,
      hint_type: null,
    };
    
    setMessages((prev) => [...prev, studentLog]);
    setCurrentAttempt(msg);
    if (!firstAttempt) {
      setFirstAttempt(msg);
    }

    try {
      // 2. Server Action 호출
      const res = await sendChatMessage(sessionId, msg, false);
      
      if (res.success && res.tutorMessage) {
        const tutorLog: ChatLogItem = {
          role: "tutor",
          message: res.tutorMessage,
          hint_level: res.nextHintLevel || 2,
          hint_type: res.nextHintLevel ? ["meaning", "position", "grammar", "vocabulary", "blank_frame"][res.nextHintLevel - 1] : "position",
        };
        
        setMessages((prev) => [...prev, tutorLog]);
        setHintLevel(res.nextHintLevel || 2);
        
        // 텍스트 필드를 AI가 제공한 최신 피드백 이후에 쉽게 재작성하도록 기본값 셋팅
        setTypingValue(msg);

        if (res.isOverdependent) {
          setIsOverdependent(true);
        }

        // 작문 성공(에러 0개) 여부와 상관없이, 학생 시도 발생 시 완료하기 제공
        setShowCompleteBtn(true);
      } else {
        setSystemError(res.error || "답변을 가져오는 도중 문제가 발생했습니다.");
        setTypingValue(msg); // 실패 시 이전 입력 텍스트 복구
      }
    } catch (err: any) {
      console.error(err);
      setSystemError("네트워크 상태가 원활하지 않습니다. 다시 시도해 주세요.");
      setTypingValue(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 힌트 더 받기 요청 처리
  const handleGetHint = async () => {
    setIsLoading(true);
    setSystemError(null);

    try {
      const res = await sendChatMessage(sessionId, "", true);
      
      if (res.success && res.tutorMessage) {
        const tutorLog: ChatLogItem = {
          role: "tutor",
          message: res.tutorMessage,
          hint_level: res.nextHintLevel || 1,
          hint_type: res.nextHintLevel ? ["meaning", "position", "grammar", "vocabulary", "blank_frame"][res.nextHintLevel - 1] : "meaning",
        };
        
        setMessages((prev) => [...prev, tutorLog]);
        setHintLevel(res.nextHintLevel || 1);
        if (res.isOverdependent) {
          setIsOverdependent(true);
        }
      } else {
        setSystemError(res.error || "힌트를 가져오는 도중 문제가 발생했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setSystemError("네트워크 상태가 원활하지 않습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 작문 도전 완료 단계(자기반성) 페이지로 이동
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      router.push(`/result/${sessionId}?finalAttempt=${encodeURIComponent(currentAttempt)}`);
    } catch (err: any) {
      console.error(err);
      setSystemError("페이지 이동 도중 문제가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* 1. 최상단 실시간 Diff 시각화 카드 (타이핑 중 실시간 갱신 결합) */}
      <div className="px-6 pt-4">
        <DiffVisualizer
          koreanSentence={koreanSentence}
          firstAttempt={firstAttempt}
          currentAttempt={typingValue || currentAttempt}
        />
        
        {/* 과의존 상태 알림 배지 */}
        {isOverdependent && (
          <div className="bg-[#FDEDEC] border border-[#FADBD8] text-[#E74C3C] text-xs font-black px-4 py-2.5 rounded-xl mb-3 flex items-center gap-1.5 animate-pulse-subtle">
            ⚠️ <span>과의존 경고: 힌트에 지나치게 의존하고 있어요! 스스로 문장을 더 고민해 봐요.</span>
          </div>
        )}
        
        {systemError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl mb-3">
            ❌ {systemError}
          </div>
        )}
      </div>

      {/* 2. 대화 말풍선 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="text-4xl mb-3">👋</span>
            <h3 className="text-sm font-black text-gray-500">안녕! AI 튜터 선생님이야.</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">
              위의 우리말 뜻을 보고 첫 영어 문장을 아래 창에 직접 적어보자!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble
              key={index}
              role={msg.role}
              message={msg.message}
              hintLevel={msg.hint_level}
              hintType={msg.hint_type}
            />
          ))
        )}
        {isLoading && (
          <div className="flex justify-start mb-4 animate-pulse">
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold text-gray-400 mb-1 ml-1">🤖 AI 튜터</span>
              <div className="bg-[#FEF9E7] border-2 border-[#F9E79F] text-gray-500 font-medium px-4 py-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 3. 하단 텍스트 입력 및 조작 패널 */}
      <WritingInput
        typingValue={typingValue}
        onTypingChange={setTypingValue}
        onSendMessage={handleSendMessage}
        onGetHint={handleGetHint}
        onComplete={handleComplete}
        isLoading={isLoading}
        hintLevel={hintLevel}
        showCompleteBtn={showCompleteBtn}
      />
    </div>
  );
}
