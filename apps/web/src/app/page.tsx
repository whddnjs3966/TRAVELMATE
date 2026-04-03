"use client";

import { useRouter } from "next/navigation";
import { Button } from "@tripflow/ui";
import { SearchForm } from "../components/search-form";
import { PopularDestinations } from "../components/popular-destinations";

export default function Home() {
  const router = useRouter();

  return (
    <main className="px-5 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-primary font-bold">TripFlow</h1>
        <button className="text-xl p-2 hover:bg-gray-100 rounded-full transition-colors">
          🔔
        </button>
      </div>

      {/* Hero */}
      <div className="mb-6">
        <h2 className="text-h2 text-text-primary mb-1">어디로 떠나볼까요?</h2>
        <p className="text-caption text-text-secondary">
          출발지와 여행 조건을 선택하면 최저가 항공권을 찾아드려요
        </p>
      </div>

      {/* Search Form */}
      <section className="mb-8">
        <SearchForm />
      </section>

      {/* Divider */}
      <hr className="border-border mb-6" />

      {/* Recommendation CTA */}
      <section className="mb-8">
        <div className="bg-primary-light rounded-2xl p-5">
          <p className="text-h3 text-text-primary mb-1">🎯 여행지 고민 중이라면?</p>
          <p className="text-caption text-text-secondary mb-3">
            예산, 스타일, 동반자만 선택하면 딱 맞는 여행지를 추천해드려요
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/recommend")}
          >
            나에게 맞는 여행지 추천 →
          </Button>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="mb-8">
        <h3 className="text-h3 text-text-primary mb-4">🔥 지금 뜨는 여행지</h3>
        <PopularDestinations />
      </section>
    </main>
  );
}
