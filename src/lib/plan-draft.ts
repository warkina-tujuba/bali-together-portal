import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanPlace = {
  name: string;
  address?: string | null;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type PlanStay = PlanPlace & {
  check_in?: string | null;
  check_out?: string | null;
  booking_url?: string | null;
  booking_source?: string | null;
};

export type PlanRadarPlace = PlanPlace & {
  nights?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type PlanArrival = {
  flight_number?: string | null;
  airline?: string | null;
  airline_iata?: string | null;
  scheduled_at?: string | null;
  origin_iata?: string | null;
  origin_city?: string | null;
  destination_iata?: string | null;
  destination_city?: string | null;
};

export type PlanVibe = {
  adventure: number;
  culture: number;
  budget: number;
  foodie: number;
  pace: number;
};

export type PlanDraft = {
  destination: PlanPlace | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  dates_flexible: boolean;
  places: PlanRadarPlace[];
  stays: PlanStay[];
  arrival: PlanArrival | null;
  vibe: PlanVibe | null;
};

const initial: PlanDraft = {
  destination: null,
  start_date: null,
  end_date: null,
  duration_days: null,
  dates_flexible: false,
  places: [],
  stays: [],
  arrival: null,
  vibe: null,
};

type Store = PlanDraft & {
  set: <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => void;
  patch: (p: Partial<PlanDraft>) => void;
  reset: () => void;
};

export const usePlanDraft = create<Store>()(
  persist(
    (set) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<Store>),
      patch: (p) => set(p),
      reset: () => set({ ...initial }),
    }),
    { name: "tl:plan:draft:v1" },
  ),
);
