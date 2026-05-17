// Lightweight airline helpers — no API key needed.
// Logo source: airhex content CDN serves square airline logos by IATA code.
export function airlineLogoUrl(iata: string, size: 100 | 200 = 100) {
  const code = iata.trim().toUpperCase();
  return `https://content.airhex.com/content/logos/airlines_${code}_${size}_${size}_s.png`;
}

// Parse the 2-3 char carrier code from a flight number like "SQ938" or "QF 11".
export function parseAirlineCode(flightNumber: string | null | undefined): string | null {
  if (!flightNumber) return null;
  const m = flightNumber.trim().toUpperCase().match(/^([A-Z0-9]{2,3})\s*\d{1,4}[A-Z]?$/);
  return m ? m[1] : null;
}
