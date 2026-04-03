// ── IATA Codes (Korean Airports) ──
export const KOREAN_AIRPORTS = {
  ICN: "인천",
  GMP: "김포",
  PUS: "부산(김해)",
  TAE: "대구",
  CJU: "제주",
  CJJ: "청주",
  KWJ: "광주",
  RSU: "여수",
  USN: "울산",
  MWX: "무안",
} as const;

// ── Travel Styles ──
export const TRAVEL_STYLES = [
  { id: "healing", label: "힐링/휴양", emoji: "🏖️" },
  { id: "food", label: "맛집투어", emoji: "🍜" },
  { id: "nature", label: "자연/경치", emoji: "🏔️" },
  { id: "activity", label: "액티비티", emoji: "🎢" },
  { id: "culture", label: "역사/문화", emoji: "🏛️" },
  { id: "shopping", label: "쇼핑", emoji: "🛍️" },
] as const;

// ── Companion Types ──
export const COMPANION_TYPES = [
  { id: "solo", label: "혼자", emoji: "🧑" },
  { id: "couple", label: "연인", emoji: "💑" },
  { id: "family", label: "가족", emoji: "👨‍👩‍👧" },
  { id: "friends", label: "친구", emoji: "👫" },
] as const;

// ── Budget Ranges ──
export const BUDGET_RANGES = [
  { id: "low", label: "30만원 이하", description: "가성비 여행" },
  { id: "mid", label: "30~70만원", description: "적당한 여행" },
  { id: "high", label: "70만원 이상", description: "럭셔리 여행" },
] as const;

// ── Cache TTL (seconds) ──
export const CACHE_TTL = {
  FLIGHTS: 30 * 60,              // 30분
  WEATHER_CURRENT: 60 * 60,      // 1시간
  PLACES: 7 * 24 * 60 * 60,      // 7일
  AI_SCHEDULE: 24 * 60 * 60,     // 24시간
} as const;

// ── Design Tokens ──
export const COLORS = {
  primary: "#0066FF",
  primaryLight: "#E8F1FF",
  secondary: "#FF6B35",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;
