"use server";

import { db } from "@/lib/db";
import { ActionResponse } from "./session";

export interface CreateFeedbackInput {
  studentId: number | null;
  rating: number;
  comment: string;
}

export interface FeedbackDashboardData {
  stats: {
    totalCount: number;
    averageRating: number;
    distribution: {
      [key: number]: {
        count: number;
        percentage: number;
      };
    };
  };
  feedbacks: Array<{
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    student_name: string | null;
    grade: string | null;
    class_name: string | null;
    level: string | null;
  }>;
}

/**
 * 사용후기(피드백)를 저장하는 Server Action
 */
export async function createFeedbackAction(
  studentId: number | null,
  rating: number,
  comment: string
): Promise<ActionResponse<void>> {
  // 서버 사이드 유효성 검사
  if (rating < 1 || rating > 5) {
    return { success: false, error: "만족도는 1점부터 5점 사이여야 합니다." };
  }
  if (!comment || comment.trim().length < 5) {
    return { success: false, error: "느낀 점은 최소 5자 이상 작성해 주세요." };
  }

  try {
    await db.query(
      `INSERT INTO feedbacks (student_id, rating, comment) VALUES ($1, $2, $3)`,
      [studentId, rating, comment.trim()]
    );
    return { success: true };
  } catch (error) {
    console.error("Create Feedback Error:", error);
    return { success: false, error: "후기 저장에 실패했습니다. 다시 시도해 주세요." };
  }
}

/**
 * 제작자용 대시보드 통계 및 피드백 목록을 조회하는 Server Action
 */
export async function getFeedbackDashboardData(): Promise<ActionResponse<FeedbackDashboardData>> {
  try {
    // 1. 전체 피드백 개수 및 평점 계산
    const statsResult = await db.getOne<{ count: string; avg: string }>(
      `SELECT COUNT(*) as count, AVG(rating) as avg FROM feedbacks`
    );
    const totalCount = statsResult ? parseInt(statsResult.count, 10) : 0;
    const averageRating = statsResult && statsResult.avg ? parseFloat(parseFloat(statsResult.avg).toFixed(1)) : 0.0;

    // 2. 평점별(1~5점) 분포 집계
    const distributionResult = await db.query<{ rating: number; count: string }>(
      `SELECT rating, COUNT(*) as count FROM feedbacks GROUP BY rating`
    );

    const distribution: Record<number, { count: number; percentage: number }> = {
      1: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      3: { count: 0, percentage: 0 },
      4: { count: 0, percentage: 0 },
      5: { count: 0, percentage: 0 },
    };

    distributionResult.forEach((row) => {
      const r = row.rating;
      const count = parseInt(row.count, 10);
      if (r >= 1 && r <= 5) {
        distribution[r] = {
          count,
          percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
        };
      }
    });

    // 3. 학생 정보와 조인하여 피드백 목록 가져오기
    const feedbacks = await db.query<{
      id: number;
      rating: number;
      comment: string;
      created_at: Date;
      student_name: string | null;
      grade: string | null;
      class_name: string | null;
      level: string | null;
    }>(
      `SELECT f.id, f.rating, f.comment, f.created_at, s.student_name, s.grade, s.class_name, s.level
       FROM feedbacks f
       LEFT JOIN students s ON f.student_id = s.id
       ORDER BY f.created_at DESC`
    );

    // 날짜 포맷팅을 안전하게 처리하기 위해 string 변환
    const formattedFeedbacks = feedbacks.map((fb) => ({
      ...fb,
      created_at: fb.created_at ? fb.created_at.toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      data: {
        stats: {
          totalCount,
          averageRating,
          distribution,
        },
        feedbacks: formattedFeedbacks,
      },
    };
  } catch (error) {
    console.error("Get Feedback Dashboard Data Error:", error);
    return { success: false, error: "대시보드 데이터를 가져오는데 실패했습니다." };
  }
}
