const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((error as { error: string }).error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Flights
  searchFlights: (params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
  }) => {
    const searchParams = new URLSearchParams(params as Record<string, string>);
    return request<{ results: FlightResult[] }>(`/flights/search?${searchParams}`);
  },

  getCheapestDates: (params: {
    origin: string;
    destination: string;
    month: string;
    duration?: string;
  }) => {
    const searchParams = new URLSearchParams(params as Record<string, string>);
    return request<{ results: CheapestDate[] }>(`/flights/cheapest-dates?${searchParams}`);
  },

  getInspiration: (origin: string, month?: string) => {
    const params = new URLSearchParams({ origin });
    if (month) params.set("month", month);
    return request<{ results: InspirationResult[] }>(`/flights/inspiration?${params}`);
  },

  // Destinations
  getPopularDestinations: () =>
    request<{ results: Destination[] }>("/destinations/popular"),

  recommendDestinations: (params: {
    budget?: string;
    styles?: string;
    companion?: string;
    month?: string;
  }) => {
    const searchParams = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    );
    return request<{ results: Destination[] }>(`/destinations/recommend?${searchParams}`);
  },

  // Trips
  generateTrip: (body: {
    destination: string;
    duration: number;
    month: number;
    departureCity?: string;
    startDate?: string;
    styles?: string[];
  }) => request<GeneratedTrip>("/trips/generate", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  // Weather
  getWeatherForecast: (lat: string, lng: string) =>
    request<{ forecast: WeatherDay[] }>(`/weather/forecast?lat=${lat}&lng=${lng}`),
};

// Types for API responses
export interface FlightResult {
  id: string;
  price: number;
  currency: string;
  airline: string;
  airlineCode: string;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrier: string;
      flightNumber: string;
      stops: number;
      duration: string;
    }>;
  }>;
}

export interface CheapestDate {
  departureDate: string;
  returnDate: string;
  price: number;
}

export interface InspirationResult {
  destination: string;
  departureDate: string;
  returnDate: string;
  price: number;
}

export interface Destination {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  type: string;
  tags: string[];
  best_months: number[];
  avg_budget_per_day: number | null;
  climate: string | null;
  companion_fit: string[];
  description: string | null;
  thumbnail_url: string | null;
  iata_code: string | null;
  lat: number | null;
  lng: number | null;
}

export interface GeneratedTrip {
  title: string;
  days: Array<{
    day_number: number;
    theme: string;
    weather_prediction?: {
      condition: string;
      temp_high: number;
      temp_low: number;
      rain_prob: number;
    };
    spots: Array<{
      time: string;
      name: string;
      type: string;
      category: string;
      duration_min: number;
      memo: string;
      indoor: boolean;
    }>;
  }>;
  packing_tips: string[];
  budget_estimate: {
    food: number;
    transport: number;
    admission: number;
    accommodation: number;
  };
}

export interface WeatherDay {
  date: string;
  temp_high: number;
  temp_low: number;
  humidity: number;
  rain_prob: number;
  condition: string;
  description: string;
  icon: string;
}
