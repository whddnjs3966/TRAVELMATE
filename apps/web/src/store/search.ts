import { create } from "zustand";
import type { FlightResult, CheapestDate } from "../lib/api";

interface SearchState {
  origin: string;
  destination: string;
  month: string;
  duration: string;
  results: CheapestDate[];
  flightDetails: FlightResult[];
  isLoading: boolean;
  error: string | null;

  setOrigin: (origin: string) => void;
  setDestination: (destination: string) => void;
  setMonth: (month: string) => void;
  setDuration: (duration: string) => void;
  setResults: (results: CheapestDate[]) => void;
  setFlightDetails: (details: FlightResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  origin: "TAE",
  destination: "",
  month: String(new Date().getMonth() + 1),
  duration: "3",
  results: [] as CheapestDate[],
  flightDetails: [] as FlightResult[],
  isLoading: false,
  error: null as string | null,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setMonth: (month) => set({ month }),
  setDuration: (duration) => set({ duration }),
  setResults: (results) => set({ results }),
  setFlightDetails: (details) => set({ flightDetails: details }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
