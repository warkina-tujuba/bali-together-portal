/// <reference types="google.maps" />
/**
 * Singleton loader for the Google Maps JavaScript API.
 * Ensures the script tag is injected only once across the app.
 */
import { getGoogleMapsScriptUrl } from "./google-maps";

declare global {
  interface Window {
    google?: typeof google;
    __tl_gmaps_init__?: () => void;
  }
}

let loaderPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = "__tl_gmaps_init__";
    window[callbackName] = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps failed to initialize"));
    };
    const script = document.createElement("script");
    script.src = getGoogleMapsScriptUrl(callbackName);
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
