// ── User ──
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: "kakao" | "google";
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  travel_style?: string[];
  preferred_climate?: string;
  budget_range?: string;
}

// ── Trip ──
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  destination_type: "domestic" | "international";
  departure_city: string;
  start_date: string | null;
  end_date: string | null;
  duration_nights: number;
  status: "draft" | "saved" | "completed";
  share_token: string | null;
  total_budget_estimate: number | null;
  created_at: string;
  updated_at: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  weather_summary: WeatherSummary | null;
  spots: Spot[];
  restaurants: Restaurant[];
  transport_notes: string | null;
}

export interface Spot {
  name: string;
  type: "attraction" | "restaurant" | "cafe" | "hotel";
  category: string;
  lat: number;
  lng: number;
  time: string;
  duration_min: number;
  memo: string;
  indoor: boolean;
}

export interface Restaurant {
  name: string;
  category: string;
  rating: number;
  lat: number;
  lng: number;
  meal: "breakfast" | "lunch" | "dinner";
}

// ── Flight ──
export interface FlightSearch {
  id: string;
  user_id: string | null;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  cheapest_price: number | null;
  currency: string;
  results: FlightResult[] | null;
  searched_at: string;
}

export interface FlightResult {
  airline: string;
  price: number;
  currency: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
}

// ── Price Alert ──
export interface PriceAlert {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  month: number;
  duration_nights: number;
  target_price: number;
  is_active: boolean;
  last_checked_at: string | null;
  last_price: number | null;
  created_at: string;
}

// ── Weather ──
export interface WeatherSummary {
  temp_high: number;
  temp_low: number;
  condition: string;
  rain_prob: number;
}

export interface WeatherCache {
  id: string;
  location: string;
  date: string;
  source: "kma" | "openweather";
  data: WeatherData;
}

export interface WeatherData {
  temp_high: number;
  temp_low: number;
  rain: number;
  humidity: number;
  condition: string;
}

// ── Destination ──
export interface Destination {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  type: "domestic" | "international";
  tags: string[];
  best_months: number[];
  avg_budget_per_day: number | null;
  climate: "tropical" | "temperate" | "cold" | null;
  companion_fit: ("solo" | "couple" | "family" | "friends")[];
  description: string | null;
  thumbnail_url: string | null;
  iata_code: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
}

// ── Checklist ──
export interface Checklist {
  id: string;
  trip_id: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
  category: string;
  priority: "must" | "recommend" | "optional";
}

// ── Review ──
export interface Review {
  id: string;
  user_id: string;
  trip_id: string;
  destination: string;
  rating: number;
  content: string | null;
  photos: string[];
  created_at: string;
}

// ── AI Generation ──
export interface GenerateTripRequest {
  destination: string;
  destination_type?: "domestic" | "international";
  departureCity?: string;
  startDate?: string;
  endDate?: string;
  duration: number;
  month: number;
  styles?: string[];
}

export interface GenerateTripResponse {
  days: GeneratedDay[];
  packing_tips: string[];
  budget_estimate: BudgetEstimate;
}

export interface GeneratedDay {
  day_number: number;
  theme: string;
  spots: Spot[];
}

export interface BudgetEstimate {
  food: number;
  transport: number;
  admission: number;
  accommodation: number;
}

// ── Recommendation ──
export interface RecommendRequest {
  budget: "low" | "mid" | "high";
  styles: string[];
  companion: "solo" | "couple" | "family" | "friends";
  month: number;
  departure_city: string;
}
