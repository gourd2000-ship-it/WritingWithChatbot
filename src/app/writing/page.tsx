import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ChatInterface from "./_components/ChatInterface";

interface WritingPageProps {
  searchParams: Promise<{
    sessionId?: string;
  }>;
}

export default async function WritingPage({ searchParams }: WritingPageProps) {
  const { sessionId } = await searchParams;
  
  if (!sessionId) {
    return notFound();
  }
  
  const session = await db.getOne<{
    id: number;
    korean_sentence: string;
    first_english_attempt: string | null;
    is_overdependent: boolean;
  }>(
    "SELECT id, korean_sentence, first_english_attempt, is_overdependent FROM writing_sessions WHERE id = $1",
    [Number(sessionId)]
  );
  
  if (!session) {
    return notFound();
  }
  
  const student = await db.getOne<{
    student_name: string;
    grade: string;
    class_name: string;
    level: string;
  }>(
    "SELECT student_name, grade, class_name, level FROM students WHERE id = (SELECT student_id FROM writing_sessions WHERE id = $1)",
    [session.id]
  );
  
  if (!student) {
    return notFound();
  }
  
  // 이전 대화 이력 로드
  const logs = await db.query<{
    role: string;
    message: string;
    hint_level: number;
    hint_type: string | null;
  }>(
    "SELECT role, message, hint_level, hint_type FROM conversation_logs WHERE session_id = $1 ORDER BY created_at ASC",
    [session.id]
  );
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 px-4 bg-[#FFFDF5]">
      <div className="w-full max-w-4xl bg-white rounded-3xl border-3 border-[#F4EFCF] shadow-lg overflow-hidden flex flex-col h-[85vh]">
        {/* 상단 헤더 */}
        <div className="bg-[#FFFCEB] border-b-2 border-[#F4EFCF] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#2C3E50] flex items-center gap-2">
              ✏️ <span>작문 튜터링 도전</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-500 font-semibold mt-1">
              학생: {student.student_name} ({student.grade}학년 {student.class_name}) | 난이도: {
                student.level === 'elementary_3_4' ? '초등 3-4학년' :
                student.level === 'elementary_5_6' ? '초등 5-6학년' :
                student.level === 'middle_school' ? '중학생' : '고등학생'
              }
            </p>
          </div>
        </div>
        
        {/* 대화 인터페이스 */}
        <ChatInterface
          sessionId={session.id}
          koreanSentence={session.korean_sentence}
          initialLogs={logs}
          firstAttempt={session.first_english_attempt}
          isOverdependent={session.is_overdependent}
        />
      </div>
    </div>
  );
}
