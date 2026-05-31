"use client";

import React, { useState, useEffect } from "react";
import FeedbackModal from "./FeedbackModal";

interface FeedbackTriggerProps {
  sessionId: number;
  studentId: number | null;
}

export default function FeedbackTrigger({ sessionId, studentId }: FeedbackTriggerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const submitted = localStorage.getItem(`feedback_submitted_session_${sessionId}`);
    if (submitted === "true") {
      setIsSubmitted(true);
    }
  }, [sessionId]);

  if (!isMounted) {
    return null; // 클라이언트 마운트 전 하이드레이션 오류 방지
  }

  if (isSubmitted) {
    return (
      <div className="text-center text-xs font-black text-gray-400 py-2">
        💚 이 학습 세션의 사용후기 제출이 완료되었습니다. 감사합니다!
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto bg-[#F4F6F7] hover:bg-gray-200 text-[#5D6D7E] text-sm font-black px-8 py-3.5 rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>💬</span>
        <span>사용후기 남기기</span>
      </button>

      {isOpen && (
        <FeedbackModal
          sessionId={sessionId}
          studentId={studentId}
          onClose={() => setIsOpen(false)}
          onSuccess={() => setIsSubmitted(true)}
        />
      )}
    </>
  );
}
