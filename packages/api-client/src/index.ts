import type {
  Trip,
  FlightSearch,
  Destination,
  GenerateTripRequest,
  GenerateTripResponse,
  RecommendRequest,
  Review,
  PriceAlert,
  WeatherData,
} from "@tripflow/core";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class TripFlowClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, headers, ...rest } = options;

    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  // Auth
  auth = {
    me: () => this.request("/auth/me"),
    logout: () => this.request("/auth/logout", { method: "POST" }),
  };

  // Flights
  flights = {
    search: (params: {
      origin: string;
      destination: string;
      month: number;
      duration: number;
    }) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      );
      return this.request<FlightSearch>(`/flights/search?${qs}`);
    },
    cheapestDates: (origin: string, destination: string) =>
      this.request(`/flights/cheapest-dates?origin=${origin}&destination=${destination}`),
    inspiration: (origin: string) =>
      this.request(`/flights/inspiration?origin=${origin}`),
    createAlert: (alert: Omit<PriceAlert, "id" | "user_id" | "is_active" | "last_checked_at" | "last_price" | "created_at">) =>
      this.request<PriceAlert>("/flights/alerts", { method: "POST", body: alert }),
    deleteAlert: (id: string) =>
      this.request(`/flights/alerts/${id}`, { method: "DELETE" }),
    listAlerts: () =>
      this.request<PriceAlert[]>("/flights/alerts"),
  };

  // Trips
  trips = {
    generate: (req: GenerateTripRequest) =>
      this.request<GenerateTripResponse>("/trips/generate", { method: "POST", body: req }),
    list: () =>
      this.request<Trip[]>("/trips"),
    get: (id: string) =>
      this.request<Trip>(`/trips/${id}`),
    update: (id: string, data: Partial<Trip>) =>
      this.request<Trip>(`/trips/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      this.request(`/trips/${id}`, { method: "DELETE" }),
    share: (id: string) =>
      this.request<{ token: string }>(`/trips/${id}/share`, { method: "POST" }),
    getShared: (token: string) =>
      this.request<Trip>(`/trips/shared/${token}`),
    exportPdf: (id: string) =>
      this.request(`/trips/${id}/export/pdf`),
    getChecklist: (id: string) =>
      this.request(`/trips/${id}/checklist`),
    updateChecklist: (id: string, items: unknown) =>
      this.request(`/trips/${id}/checklist`, { method: "PUT", body: { items } }),
  };

  // Destinations
  destinations = {
    recommend: (req: RecommendRequest) => {
      const qs = new URLSearchParams(
        Object.entries(req).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)])
      );
      return this.request<Destination[]>(`/destinations/recommend?${qs}`);
    },
    popular: () =>
      this.request<Destination[]>("/destinations/popular"),
    get: (id: string) =>
      this.request<Destination>(`/destinations/${id}`),
  };

  // Weather
  weather = {
    history: (location: string, month: number, year: number) =>
      this.request<WeatherData[]>(`/weather/history?location=${location}&month=${month}&year=${year}`),
    forecast: (location: string) =>
      this.request(`/weather/forecast?location=${location}`),
  };

  // Places
  places = {
    restaurants: (location: string, category?: string) =>
      this.request(`/places/restaurants?location=${location}${category ? `&category=${category}` : ""}`),
    attractions: (location: string) =>
      this.request(`/places/attractions?location=${location}`),
    get: (id: string) =>
      this.request(`/places/${id}`),
  };

  // Reviews
  reviews = {
    list: (destination: string) =>
      this.request<Review[]>(`/reviews?destination=${encodeURIComponent(destination)}`),
    create: (review: Omit<Review, "id" | "user_id" | "created_at">) =>
      this.request<Review>("/reviews", { method: "POST", body: review }),
  };
}

export function createClient(baseUrl?: string) {
  return new TripFlowClient(baseUrl ?? "http://localhost:8787");
}
