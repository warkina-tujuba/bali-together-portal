/**
 * Google Maps browser-side configuration.
 *
 * Uses the Lovable-managed Google Maps Platform connector's browser key.
 * This key is pre-allowlisted for *.lovable.app and *.lovableproject.com.
 */
export const GOOGLE_MAPS_BROWSER_API_KEY =
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string;

const TRACKING_ID = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

export const GOOGLE_MAPS_JS_LIBRARIES = ["places", "marker"] as const;

/**
 * Builds the Maps JavaScript API script URL.
 * Uses `loading=async` to avoid blocking the main thread.
 */
export function getGoogleMapsScriptUrl(callbackName: string): string {
  const libs = GOOGLE_MAPS_JS_LIBRARIES.join(",");
  const channel = TRACKING_ID ? `&channel=${encodeURIComponent(TRACKING_ID)}` : "";
  return `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_BROWSER_API_KEY}&libraries=${libs}&loading=async&callback=${callbackName}&v=weekly${channel}`;
}
