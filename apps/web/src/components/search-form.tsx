"use client";

import { useRouter } from "next/navigation";
import { Select } from "@tripflow/ui";
import { Button } from "@tripflow/ui";
import { KOREAN_AIRPORTS } from "@tripflow/core";
import { useSearchStore } from "../store/search";

const airportOptions = Object.entries(KOREAN_AIRPORTS).map(([code, name]) => ({
  value: code,
  label: `${name} (${code})`,
}));

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

const durationOptions = Array.from({ length: 7 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}박 ${i + 2}일`,
}));

// 인기 도착지
const popularDestinations = [
  { code: "CJU", name: "제주" },
  { code: "KIX", name: "오사카" },
  { code: "NRT", name: "도쿄" },
  { code: "DAD", name: "다낭" },
  { code: "FUK", name: "후쿠오카" },
  { code: "BKK", name: "방콕" },
];

export function SearchForm() {
  const router = useRouter();
  const { origin, destination, month, duration, setOrigin, setDestination, setMonth, setDuration } =
    useSearchStore();

  const handleSearch = () => {
    if (!destination) return;
    router.push(`/search?origin=${origin}&destination=${destination}&month=${month}&duration=${duration}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="출발지"
          icon={<span>🛫</span>}
          options={airportOptions}
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <div>
          <Select
            label="도착지"
            icon={<span>🛬</span>}
            options={[
              { value: "", label: "선택하기" },
              ...popularDestinations.map((d) => ({
                value: d.code,
                label: `${d.name} (${d.code})`,
              })),
            ]}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="여행월"
          icon={<span>📅</span>}
          options={monthOptions}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <Select
          label="일정"
          icon={<span>🌙</span>}
          options={durationOptions}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleSearch}
        disabled={!destination}
      >
        🔍 최저가 항공권 찾기
      </Button>
    </div>
  );
}
