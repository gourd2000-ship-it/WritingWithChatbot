import StudentEntryForm from "./_components/StudentEntryForm";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-[#FFFDF5]">
      <main className="w-full max-w-3xl bg-white p-8 md:p-10 rounded-3xl border-3 border-[#F4EFCF] shadow-lg">
        {/* 상단 타이틀 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#2C3E50] tracking-tight mb-3">
            ✏️ 영어 작문 튜터 챗봇
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-semibold leading-relaxed">
            표현하고 싶은 생각을 우리말로 적어보세요.
            <br />
            AI 튜터와 함께 고민하며 내 힘으로 영어 문장을 완성하는 기쁨을 느껴봐요!
          </p>
        </div>

        {/* 튜터링 입장 폼 */}
        <StudentEntryForm />
      </main>

      {/* 푸터 영역 교사용 대시보드 링크 */}
      <footer className="mt-8 text-center text-xs">
        <Link
          href="/teacher"
          className="text-gray-400 hover:text-gray-600 transition-colors font-black flex items-center justify-center gap-1 hover:underline"
        >
          <span>📊</span>
          <span>선생님이신가요? 교사 대시보드로 가기</span>
        </Link>
      </footer>
    </div>
  );
}
