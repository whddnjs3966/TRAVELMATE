"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@tripflow/ui";
import { TRAVEL_STYLES, COMPANION_TYPES, BUDGET_RANGES } from "@tripflow/core";
import { api, type Destination } from "../../lib/api";

type Step = "budget" | "style" | "companion" | "result";

export default function RecommendPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("budget");
  const [budget, setBudget] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [companion, setCompanion] = useState("");
  const [results, setResults] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleStyle = (id: string) => {
    setStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const currentMonth = String(new Date().getMonth() + 1);
      const styleLabels = styles.map(
        (s) => TRAVEL_STYLES.find((ts) => ts.id === s)?.label || s
      );
      const data = await api.recommendDestinations({
        budget,
        styles: styleLabels.join(","),
        companion,
        month: currentMonth,
      });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setStep("result");
    }
  };

  return (
    <main className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (step === "budget") router.back();
            else if (step === "style") setStep("budget");
            else if (step === "companion") setStep("style");
            else setStep("companion");
          }}
          className="text-xl p-1"
        >
          ←
        </button>
        <h1 className="text-h2 text-text-primary">어떤 여행을 찾고 계신가요?</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-1 mb-8">
        {["budget", "style", "companion", "result"].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              ["budget", "style", "companion", "result"].indexOf(step) >= i
                ? "bg-primary"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Budget */}
      {step === "budget" && (
        <section className="space-y-4">
          <h2 className="text-h3 text-text-primary">💰 1인 예산은?</h2>
          <div className="space-y-3">
            {BUDGET_RANGES.map((range) => (
              <Card
                key={range.id}
                hover
                onClick={() => {
                  setBudget(range.id);
                  setStep("style");
                }}
                className={budget === range.id ? "border-primary !border-2" : ""}
              >
                <p className="text-body font-semibold text-text-primary">{range.label}</p>
                <p className="text-caption text-text-secondary">{range.description}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Style */}
      {step === "style" && (
        <section className="space-y-4">
          <h2 className="text-h3 text-text-primary">어떤 스타일이 좋아요?</h2>
          <p className="text-caption text-text-secondary">복수 선택 가능</p>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_STYLES.map((style) => (
              <Chip
                key={style.id}
                selected={styles.includes(style.id)}
                onClick={() => toggleStyle(style.id)}
              >
                {style.emoji} {style.label}
              </Chip>
            ))}
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full mt-4"
            onClick={() => setStep("companion")}
            disabled={styles.length === 0}
          >
            다음
          </Button>
        </section>
      )}

      {/* Step 3: Companion */}
      {step === "companion" && (
        <section className="space-y-4">
          <h2 className="text-h3 text-text-primary">누구와 함께 가나요?</h2>
          <div className="grid grid-cols-2 gap-3">
            {COMPANION_TYPES.map((type) => (
              <Card
                key={type.id}
                hover
                onClick={() => {
                  setCompanion(type.id);
                  handleSearch();
                }}
                className={`text-center !py-6 ${companion === type.id ? "border-primary !border-2" : ""}`}
              >
                <span className="text-3xl">{type.emoji}</span>
                <p className="text-body font-medium mt-2">{type.label}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Step 4: Results */}
      {step === "result" && (
        <section className="space-y-4">
          <h2 className="text-h3 text-text-primary">이런 여행지는 어때요?</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin text-3xl mb-3">🔍</div>
              <p className="text-body text-text-secondary">추천 여행지를 찾는 중...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🤔</p>
              <p className="text-body text-text-secondary">조건에 맞는 여행지를 찾지 못했어요</p>
              <Button variant="outline" className="mt-3" onClick={() => setStep("budget")}>
                다시 선택하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((dest, i) => (
                <Card key={dest.id} hover>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-primary-light flex items-center justify-center text-2xl flex-shrink-0">
                      {i === 0 ? "🏆" : `${i + 1}`}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {i === 0 && <span className="text-overline text-secondary font-semibold">1위 추천</span>}
                      </div>
                      <h3 className="text-h3 text-text-primary">{dest.name}</h3>
                      <p className="text-caption text-text-secondary">
                        {dest.country} · {dest.tags.join(" · ")}
                      </p>
                      {dest.avg_budget_per_day && (
                        <p className="text-caption text-primary mt-1">
                          예산 약 {formatBudget(dest.avg_budget_per_day * 3)}/3박
                        </p>
                      )}
                    </div>
                  </div>
                  {dest.description && (
                    <p className="text-caption text-text-secondary mt-2">{dest.description}</p>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => {
                      const params = new URLSearchParams({
                        destination: dest.iata_code || dest.name,
                      });
                      router.push(`/search?origin=TAE&${params}&month=${new Date().getMonth() + 1}&duration=3`);
                    }}
                  >
                    이 여행지로 계획 →
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function formatBudget(amount: number) {
  if (amount >= 10000) return `${Math.round(amount / 10000)}만원`;
  return `${amount.toLocaleString()}원`;
}
