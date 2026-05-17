export const BOOKING_SOURCES = [
  "booking",
  "airbnb",
  "agoda",
  "expedia",
  "vrbo",
  "trivago",
  "hotels",
  "direct",
  "other",
] as const;

export type BookingSource = (typeof BOOKING_SOURCES)[number];

export function bookingSourceMeta(s: string | null | undefined): { label: string; emoji: string } {
  switch (s) {
    case "booking": return { label: "Booking.com", emoji: "🟦" };
    case "airbnb": return { label: "Airbnb", emoji: "🏠" };
    case "agoda": return { label: "Agoda", emoji: "🟥" };
    case "expedia": return { label: "Expedia", emoji: "✈️" };
    case "vrbo": return { label: "Vrbo", emoji: "🏡" };
    case "trivago": return { label: "Trivago", emoji: "🔎" };
    case "hotels": return { label: "Hotels.com", emoji: "🛏️" };
    case "direct": return { label: "Direct", emoji: "📞" };
    default: return { label: "Other", emoji: "📌" };
  }
}
