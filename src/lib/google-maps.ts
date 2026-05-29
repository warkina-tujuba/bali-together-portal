/**
 * Google Maps browser-side configuration.
 *
 * This key is referrer-restricted in Google Cloud Console to the project's
 * domains (lovable.app, warkina.com, etc.). It is safe to embed in client
 * code because referrer restrictions prevent unauthorized use.
 *
 * Server-side calls (Places API, Routes API, Geocoding) use the separate
 * GOOGLE_MAPS_SERVER_API_KEY secret and never touch this file.
 */
export const GOOGLE_MAPS_BROWSER_API_KEY = "AIzaSyCrMAxmLwIKUF6ZHOp18N-OgpvNwGcn9i8";

export const GOOGLE_MAPS_JS_LIBRARIES = ["places", "marker"] as const;

/**
 * Builds the Maps JavaScript API script URL.
 * Uses `loading=async` to avoid blocking the main thread.
 */
export function getGoogleMapsScriptUrl(callbackName: string): string {
  const libs = GOOGLE_MAPS_JS_LIBRARIES.join(",");
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_BROWSER_API_KEY}&libraries=${libs}&loading=async&callback=${callbackName}&v=weekly`;
}
