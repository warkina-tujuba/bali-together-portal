import { GoogleMap, type GMapPin, type GMapAvatar } from "@/components/maps/GoogleMap";

export type SnapPin = GMapPin;
export type SnapAvatar = GMapAvatar;

export function SnapMap(props: {
  center: [number, number];
  zoom: number;
  pins: SnapPin[];
  avatars?: SnapAvatar[];
  focusedId?: string | null;
  onPinClick?: (id: string) => void;
  routeCoords?: [number, number][];
}) {
  return <GoogleMap {...props} />;
}
