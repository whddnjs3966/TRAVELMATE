"use client";

import { useEffect, useState } from "react";
import { Card } from "@tripflow/ui";
import { Skeleton } from "@tripflow/ui";
import { api, type Destination } from "../lib/api";

export function PopularDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPopularDestinations()
      .then((data) => setDestinations(data.results))
      .catch(() => {
        // 폴백 데이터
        setDestinations([
          { id: "1", name: "제주도", name_en: "Jeju", country: "대한민국", type: "domestic", tags: ["힐링", "맛집", "자연"], best_months: [3,4,5,9,10], avg_budget_per_day: 80000, climate: "temperate", companion_fit: ["solo","couple","family","friends"], description: "한국의 하와이", thumbnail_url: null, iata_code: "CJU", lat: 33.4996, lng: 126.5312 },
          { id: "2", name: "오사카", name_en: "Osaka", country: "일본", type: "international", tags: ["맛집", "쇼핑", "문화"], best_months: [3,4,5,10,11], avg_budget_per_day: 120000, climate: "temperate", companion_fit: ["solo","couple","friends"], description: "일본의 부엌", thumbnail_url: null, iata_code: "KIX", lat: 34.6937, lng: 135.5023 },
          { id: "3", name: "다낭", name_en: "Da Nang", country: "베트남", type: "international", tags: ["힐링", "맛집", "자연"], best_months: [2,3,4,5], avg_budget_per_day: 60000, climate: "tropical", companion_fit: ["couple","family","friends"], description: "가성비 최고의 휴양지", thumbnail_url: null, iata_code: "DAD", lat: 16.0544, lng: 108.2022 },
          { id: "4", name: "도쿄", name_en: "Tokyo", country: "일본", type: "international", tags: ["쇼핑", "문화", "맛집"], best_months: [3,4,5,10,11], avg_budget_per_day: 150000, climate: "temperate", companion_fit: ["solo","couple","friends"], description: "전통과 현대가 공존", thumbnail_url: null, iata_code: "NRT", lat: 35.6762, lng: 139.6503 },
          { id: "5", name: "방콕", name_en: "Bangkok", country: "태국", type: "international", tags: ["맛집", "쇼핑", "문화"], best_months: [11,12,1,2], avg_budget_per_day: 50000, climate: "tropical", companion_fit: ["solo","couple","friends"], description: "무한 가성비 여행지", thumbnail_url: null, iata_code: "BKK", lat: 13.7563, lng: 100.5018 },
          { id: "6", name: "후쿠오카", name_en: "Fukuoka", country: "일본", type: "international", tags: ["맛집", "쇼핑", "힐링"], best_months: [3,4,5,10,11], avg_budget_per_day: 100000, climate: "temperate", companion_fit: ["solo","couple","friends"], description: "라멘의 성지", thumbnail_url: null, iata_code: "FUK", lat: 33.5904, lng: 130.4017 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {destinations.slice(0, 6).map((dest) => (
        <Card key={dest.id} hover className="text-center !p-3">
          <div className="w-12 h-12 rounded-full bg-primary-light mx-auto mb-2 flex items-center justify-center text-xl">
            {dest.type === "domestic" ? "🇰🇷" : dest.country === "일본" ? "🇯🇵" : dest.country === "베트남" ? "🇻🇳" : dest.country === "태국" ? "🇹🇭" : "✈️"}
          </div>
          <p className="text-caption font-semibold text-text-primary">{dest.name}</p>
          <p className="text-overline text-text-tertiary mt-0.5">
            {dest.avg_budget_per_day ? `${Math.round(dest.avg_budget_per_day / 1000)}K~/일` : ""}
          </p>
          <div className="flex flex-wrap gap-1 justify-center mt-1.5">
            {dest.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-primary bg-primary-light px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
