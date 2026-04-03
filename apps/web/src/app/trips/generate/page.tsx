"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Badge, Button, Skeleton } from "@tripflow/ui";
import { api, type GeneratedTrip } from "../../../lib/api";

const weatherIcons: Record<string, string> = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Snow: "❄️",
  "맑음": "☀️",
  "흐림": "☁️",
  "비": "🌧️",
};

function formatBudget(amount: number) {
  if (amount >= 10000) return `${Math.round(amount / 10000)}만원`;
  return `${amount.toLocaleString()}원`;
}

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const destination = searchParams.get("destination") || "";
  const duration = parseInt(searchParams.get("duration") || "3");
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const departureCity = searchParams.get("departureCity") || "";
  const startDate = searchParams.get("startDate") || "";

  const [trip, setTrip] = useState<GeneratedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destination) return;

    setLoading(true);
    api
      .generateTrip({ destination, duration, month, departureCity, startDate })
      .then(setTrip)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [destination, duration, month, departureCity, startDate]);

  if (loading) {
    return (
      <main className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-xl p-1">←</button>
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">✈️</div>
          <p className="text-h3 text-text-primary mb-1">AI가 일정을 만들고 있어요</p>
          <p className="text-caption text-text-secondary">
            날씨, 맛집, 관광지를 분석해서 최적 동선을 짜는 중...
          </p>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-xl p-1">←</button>
          <h1 className="text-h3">일정 생성 실패</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-4xl mb-3">😢</p>
          <p className="text-body text-text-secondary">{error || "다시 시도해주세요"}</p>
          <Button variant="primary" className="mt-4" onClick={() => router.back()}>
            돌아가기
          </Button>
        </div>
      </main>
    );
  }

  const totalBudget = trip.budget_estimate
    ? Object.values(trip.budget_estimate).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <main className="px-5 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-xl p-1">←</button>
        <div>
          <h1 className="text-h3 text-text-primary">{trip.title || `${destination} ${duration}박${duration + 1}일`}</h1>
          {startDate && (
            <p className="text-caption text-text-secondary">{startDate} ~</p>
          )}
        </div>
      </div>

      {/* Weather Summary */}
      {trip.days[0]?.weather_prediction && (
        <Card className="mb-4 !bg-blue-50 !border-0">
          <p className="text-body font-semibold mb-1">🌤️ {month}월 날씨 예측</p>
          <div className="flex items-center gap-3 text-caption text-text-secondary">
            <span>
              평균 {Math.round(
                trip.days.reduce((s, d) => s + (d.weather_prediction?.temp_high || 0), 0) / trip.days.length
              )}°C
            </span>
            <span>·</span>
            <span>
              비올확률 {Math.round(
                trip.days.reduce((s, d) => s + (d.weather_prediction?.rain_prob || 0), 0) / trip.days.length
              )}%
            </span>
          </div>
          <div className="flex gap-1 mt-2">
            {trip.days.map((day) => (
              <span key={day.day_number} className="text-lg">
                {weatherIcons[day.weather_prediction?.condition || ""] || "🌤️"}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Daily Schedule */}
      {trip.days.map((day) => (
        <section key={day.day_number} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-h3 text-text-primary">
              Day {day.day_number}
            </h2>
            {day.weather_prediction && (
              <span className="text-lg">
                {weatherIcons[day.weather_prediction.condition] || "🌤️"}
              </span>
            )}
            <span className="text-caption text-text-secondary">{day.theme}</span>
          </div>

          <div className="space-y-2 ml-2 border-l-2 border-primary-light pl-4">
            {day.spots.map((spot, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-text-tertiary font-medium">
                      {spot.time}
                    </span>
                    <span>
                      {spot.type === "restaurant" ? "🍽️" : spot.type === "cafe" ? "☕" : spot.indoor ? "🏛️" : "🏖️"}
                    </span>
                    <span className="text-body font-medium text-text-primary">{spot.name}</span>
                  </div>
                  {spot.memo && (
                    <p className="text-caption text-text-secondary mt-0.5 ml-12">
                      {spot.memo}
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-1 ml-12">
                    <Badge variant={spot.indoor ? "primary" : "success"} size="sm">
                      {spot.indoor ? "실내" : "야외"}
                    </Badge>
                    {spot.category && (
                      <Badge size="sm">{spot.category}</Badge>
                    )}
                    {spot.duration_min && (
                      <Badge size="sm">{spot.duration_min}분</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Budget */}
      {trip.budget_estimate && (
        <section className="mb-6">
          <Card>
            <h3 className="text-h3 text-text-primary mb-3">💰 예상 비용</h3>
            <div className="space-y-2">
              {Object.entries(trip.budget_estimate).map(([key, value]) => {
                const labels: Record<string, string> = {
                  food: "🍽️ 식비",
                  transport: "🚗 교통",
                  admission: "🎟️ 입장료",
                  accommodation: "🏨 숙박",
                };
                return (
                  <div key={key} className="flex justify-between text-body">
                    <span className="text-text-secondary">{labels[key] || key}</span>
                    <span className="font-medium">{formatBudget(value)}</span>
                  </div>
                );
              })}
              <hr className="border-border" />
              <div className="flex justify-between text-h3">
                <span>총 예상</span>
                <span className="text-primary">약 {formatBudget(totalBudget)}</span>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Packing Tips */}
      {trip.packing_tips?.length > 0 && (
        <section className="mb-6">
          <Card>
            <h3 className="text-h3 text-text-primary mb-2">🧳 준비물</h3>
            <div className="flex flex-wrap gap-2">
              {trip.packing_tips.map((tip, i) => (
                <Badge key={i} variant="primary" size="md">{tip}</Badge>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Actions */}
      <section className="mb-8 space-y-3">
        <Button variant="primary" size="lg" className="w-full">
          💾 일정 저장하기
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="md" className="w-full">
            🔗 공유하기
          </Button>
          <Button variant="outline" size="md" className="w-full">
            📄 PDF 내보내기
          </Button>
        </div>
      </section>
    </main>
  );
}

export default function GenerateTripPage() {
  return (
    <Suspense fallback={
      <main className="px-5 pt-4">
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">✈️</div>
          <p className="text-h3 text-text-primary">AI가 일정을 만들고 있어요</p>
        </div>
      </main>
    }>
      <GenerateContent />
    </Suspense>
  );
}
