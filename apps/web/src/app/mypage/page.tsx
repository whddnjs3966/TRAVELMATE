"use client";

import { Card, Button } from "@tripflow/ui";

export default function MyPage() {
  return (
    <main className="px-5 pt-6">
      <h1 className="text-h1 text-text-primary mb-6">마이페이지</h1>

      {/* Login CTA */}
      <Card className="text-center mb-6">
        <p className="text-4xl mb-3">👤</p>
        <p className="text-h3 text-text-primary mb-1">로그인이 필요해요</p>
        <p className="text-caption text-text-secondary mb-4">
          일정 저장, 가격 알림 등을 사용할 수 있어요
        </p>
        <div className="space-y-2">
          <Button variant="primary" size="md" className="w-full">
            카카오로 시작하기
          </Button>
          <Button variant="outline" size="md" className="w-full">
            Google로 시작하기
          </Button>
        </div>
      </Card>

      {/* Menu */}
      <div className="space-y-0">
        {[
          { label: "여행 스타일 설정", icon: "✈️" },
          { label: "알림 설정", icon: "🔔" },
          { label: "공지사항", icon: "📢" },
          { label: "의견 보내기", icon: "💬" },
        ].map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center justify-between py-4 border-b border-border text-body text-text-primary hover:bg-gray-50 transition-colors"
          >
            <span>
              {item.icon} {item.label}
            </span>
            <span className="text-text-tertiary">→</span>
          </button>
        ))}
      </div>

      <p className="text-caption text-text-tertiary text-center mt-8">
        TripFlow v0.1.0
      </p>
    </main>
  );
}
