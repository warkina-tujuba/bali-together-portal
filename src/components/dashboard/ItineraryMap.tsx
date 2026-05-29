import { GoogleMap, type GMapPin } from "@/components/maps/GoogleMap";

export function ItineraryMap(props: {
  center: [number, number];
  zoom: number;
  pins: GMapPin[];
  focusedId?: string | null;
}) {
  return <GoogleMap {...props} />;
}
