"use client";

import { Card, Badge, Button } from "@tripflow/ui";

export default function TripsPage() {
  // 로그인 전 상태 - 로그인 유도
  return (
    <main className="px-5 pt-6">
      <h1 className="text-h1 text-text-primary mb-6">내 여행 일정</h1>

      {/* Empty State */}
      <div className="text-center py-12">
        <p className="text-5xl mb-4">📋</p>
        <h2 className="text-h2 text-text-primary mb-2">저장된 일정이 없어요</h2>
        <p className="text-body text-text-secondary mb-6">
          항공권을 검색하고 AI 일정을 만들어보세요!
        </p>
        <Button variant="primary" size="lg" onClick={() => window.location.href = "/"}>
          여행 계획 시작하기
        </Button>
      </div>

      {/* 가격 알림 Section (placeholder) */}
      <section className="mt-8">
        <h2 className="text-h3 text-text-primary mb-3">🔔 가격 알림</h2>
        <Card className="!bg-gray-50 !border-0">
          <p className="text-body text-text-secondary text-center py-4">
            가격 알림을 설정하면 여기에 표시됩니다
          </p>
        </Card>
      </section>
    </main>
  );
}
