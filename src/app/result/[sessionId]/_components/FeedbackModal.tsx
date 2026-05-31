"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { createFeedbackAction } from "@/app/actions/feedback";

interface FeedbackModalProps {
  sessionId: number;
  studentId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackModal({
  sessionId,
  studentId,
  onClose,
  onSuccess,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const ratingTexts: Record<number, string> = {
    1: "많이 아쉬워요 😢",
    2: "조금 더 좋아지면 좋겠어요 😐",
    3: "보통이에요 🙂",
    4: "재미있고 만족스러워요 😊",
    5: "정말 최고였어요! 😍",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMsg("만족도 별점을 선택해 주세요!");
      return;
    }
    if (comment.trim().length < 5) {
      setErrorMsg("느낀 점을 최소 5자 이상 입력해 주세요.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await createFeedbackAction(studentId, rating, comment);
      if (res.success) {
        localStorage.setItem(`feedback_submitted_session_${sessionId}`, "true");
        setIsSubmitted(true);
      } else {
        setErrorMsg(res.error || "피드백 제출에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100 animate-scale-in">
        
        {/* 상단 파스텔톤 그라디언트 데코 */}
        <div className="h-2 bg-gradient-to-r from-[#85C1E9] via-[#85D6FF] to-[#82E0AA]" />

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                소중한 사용후기를 남겨주세요 💬
              </h2>
              <p className="text-sm text-gray-500 font-bold mt-2">
                더 유익하고 재미있는 영어 공부가 될 수 있도록 의견을 들려주세요.
              </p>
            </div>

            {/* 별점 영역 */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3 bg-[#F8F9FA] rounded-2xl border border-gray-50">
              <span className="text-xs font-black text-gray-400">서비스 만족도</span>
              
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <button
                    key={starIdx}
                    type="button"
                    onMouseEnter={() => setHoverRating(starIdx)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(starIdx);
                      setErrorMsg("");
                    }}
                    className="p-1 hover:scale-125 active:scale-95 transition-all focus:outline-none"
                  >
                    <Star
                      size={36}
                      className={`transition-colors duration-150 ${
                        activeRating >= starIdx
                          ? "fill-[#F4D03F] text-[#F4D03F]"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {activeRating > 0 ? (
                <span className="text-sm font-black text-[#2980B9] animate-pulse">
                  {ratingTexts[activeRating]}
                </span>
              ) : (
                <span className="text-xs font-bold text-gray-400">별에 마우스를 올려 선택해 주세요</span>
              )}
            </div>

            {/* 주관식 느낀 점 입력 영역 */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 block">
                오늘 공부하면서 느낀 점이나 바라는 점 ✍️
              </label>
              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (e.target.value.trim().length >= 5) setErrorMsg("");
                }}
                placeholder="예: AI 힌트가 친절해서 혼자서 문장을 끝까지 쓰는 데 큰 도움이 되었어요! 더 어려운 문제도 풀어보고 싶어요."
                rows={4}
                maxLength={500}
                className="w-full p-4 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-2xl focus:border-[#4A90E2] focus:ring-4 focus:ring-[#4A90E2]/10 outline-none transition-all placeholder:text-gray-300 resize-none shadow-inner"
              />
              <div className="text-right text-[10px] text-gray-400 font-bold">
                {comment.trim().length} / 500자 (최소 5자 필수)
              </div>
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
              <p className="text-xs font-black text-red-500 text-center animate-shake">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm rounded-2xl transition-colors active:scale-98 disabled:opacity-50"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] py-3.5 bg-gradient-to-r from-[#4A90E2] to-[#3B7BBF] hover:from-[#357ABD] hover:to-[#2B609E] text-white font-black text-sm rounded-2xl transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "후기 제출하기 🚀"
                )}
              </button>
            </div>
          </form>
        ) : (
          /* 제출 완료 및 진심 어린 감사 화면 */
          <div className="p-8 text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#E8F8F5] to-[#D5F5E3] rounded-full flex items-center justify-center mx-auto shadow-sm">
              <span className="text-4xl animate-bounce">💖</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-gray-800">
                소중한 후기를 남겨주셔서<br />진심으로 감사드립니다!
              </h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-xs mx-auto">
                보내주신 따뜻한 피드백은 저희가 서비스를 고도화하는 데 가장 큰 힘이 됩니다. 
                학생들이 더욱 쉽고 즐겁게 영어를 배울 수 있도록 끊임없이 노력하겠습니다.
              </p>
            </div>

            <div className="py-3 px-6 bg-[#E8F8F5] border border-[#A9DFBF] rounded-2xl text-xs font-black text-[#27AE60]">
              💡 작성해 주신 피드백이 DB에 안전하게 기록되었습니다.
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] hover:from-[#27AE60] hover:to-[#219653] text-white font-black text-sm rounded-2xl transition-all shadow-md active:scale-98"
            >
              학습 완료 화면으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
