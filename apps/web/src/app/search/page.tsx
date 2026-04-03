"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Badge, SkeletonFlightCard } from "@tripflow/ui";
import { KOREAN_AIRPORTS } from "@tripflow/core";
import { api, type CheapestDate, type FlightResult } from "../../lib/api";

const airports = KOREAN_AIRPORTS as Record<string, string>;

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(price);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] || "0";
  const m = match[2] || "0";
  return `${h}h ${m}m`;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const month = searchParams.get("month") || "";
  const duration = searchParams.get("duration") || "3";

  const [cheapestDates, setCheapestDates] = useState<CheapestDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<CheapestDate | null>(null);
  const [flightDetails, setFlightDetails] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination || !month) return;

    setLoading(true);
    setError(null);
    api
      .getCheapestDates({ origin, destination, month, duration })
      .then((data) => {
        setCheapestDates(data.results);
        if (data.results.length > 0) {
          setSelectedDate(data.results[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [origin, destination, month, duration]);

  const loadFlightDetails = useCallback(async (date: CheapestDate) => {
    setSelectedDate(date);
    setLoadingDetails(true);
    try {
      const data = await api.searchFlights({
        origin,
        destination,
        departureDate: date.departureDate,
        returnDate: date.returnDate,
      });
      setFlightDetails(data.results);
    } catch {
      setFlightDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  }, [origin, destination]);

  const handleCreateTrip = (date: CheapestDate) => {
    const params = new URLSearchParams({
      destination: airports[destination] || destination,
      duration,
      month,
      departureCity: airports[origin] || origin,
      startDate: date.departureDate,
    });
    router.push(`/trips/generate?${params}`);
  };

  return (
    <main className="px-5 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-xl p-1">←</button>
        <div>
          <h1 className="text-h3 text-text-primary">
            {airports[origin] || origin} → {airports[destination] || destination}
          </h1>
          <p className="text-caption text-text-secondary">{month}월 · {duration}박{parseInt(duration) + 1}일</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-error rounded-xl p-4 mb-4">
          <p className="text-body">{error}</p>
          <p className="text-caption mt-1">잠시 후 다시 시도해주세요</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonFlightCard key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && !error && cheapestDates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">😢</p>
          <p className="text-h3 text-text-primary mb-1">검색 결과가 없어요</p>
          <p className="text-caption text-text-secondary">다른 조건으로 검색해보세요</p>
        </div>
      )}

      {!loading && cheapestDates.length > 0 && (
        <>
          {/* Cheapest Option */}
          <section className="mb-6">
            <h2 className="text-h3 text-text-primary mb-3">가장 저렴한 날짜</h2>
            <Card className="border-primary !border-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-body font-semibold">
                  {formatDate(cheapestDates[0].departureDate)} ~ {formatDate(cheapestDates[0].returnDate)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">최저가</Badge>
                  <span className="text-h2 text-primary font-bold">
                    {formatPrice(cheapestDates[0].price)}
                  </span>
                </div>
              </div>
              <p className="text-caption text-text-secondary mb-3">왕복 · 1인 기준</p>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => handleCreateTrip(cheapestDates[0])}
              >
                이 날짜로 일정 만들기
              </Button>
            </Card>
          </section>

          {/* Other Dates */}
          {cheapestDates.length > 1 && (
            <section className="mb-6">
              <h2 className="text-h3 text-text-primary mb-3">다른 날짜 옵션</h2>
              <div className="space-y-3">
                {cheapestDates.slice(1).map((date, i) => (
                  <Card
                    key={i}
                    hover
                    onClick={() => loadFlightDetails(date)}
                    className={selectedDate === date ? "border-primary" : ""}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body font-medium">
                          {formatDate(date.departureDate)} ~ {formatDate(date.returnDate)}
                        </p>
                        <p className="text-caption text-text-secondary">왕복 · 1인</p>
                      </div>
                      <span className="text-h3 text-text-primary font-semibold">
                        {formatPrice(date.price)}
                      </span>
                    </div>
                    {selectedDate === date && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateTrip(date);
                        }}
                      >
                        이 날짜로 일정 만들기
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Flight Details */}
          {loadingDetails && (
            <div className="space-y-3">
              <SkeletonFlightCard />
              <SkeletonFlightCard />
            </div>
          )}

          {!loadingDetails && flightDetails.length > 0 && (
            <section className="mb-6">
              <h2 className="text-h3 text-text-primary mb-3">항공편 상세</h2>
              <div className="space-y-3">
                {flightDetails.map((flight) => (
                  <Card key={flight.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body font-semibold">{flight.airline}</span>
                      <span className="text-h3 text-primary font-bold">
                        {formatPrice(flight.price)}
                      </span>
                    </div>
                    {flight.itineraries.map((itin, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                        <span>{idx === 0 ? "가는편" : "오는편"}</span>
                        <span>·</span>
                        <span>{itin.segments[0]?.carrier}</span>
                        <span>·</span>
                        <span>{itin.segments[0]?.stops === 0 ? "직항" : `경유 ${itin.segments[0]?.stops}회`}</span>
                        <span>·</span>
                        <span>{formatDuration(itin.duration)}</span>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Price Alert */}
          <section className="mb-8">
            <Card className="bg-primary-light !border-0">
              <p className="text-body font-semibold text-text-primary mb-1">
                💰 가격 떨어지면 알림 받기
              </p>
              <p className="text-caption text-text-secondary mb-3">
                목표가 이하로 내려가면 알려드려요
              </p>
              <Button variant="outline" size="sm">
                알림 설정
              </Button>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main className="px-5 pt-4">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonFlightCard key={i} />
          ))}
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
