// Legacy module — kept only for the StayPayload type used by StayPasteForm/StayAddressForm.
// The original Mapbox-based search component has been replaced by PlaceAutocomplete + StayDialog.
export type StayPayload = {
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  place_id?: string;
  check_in?: string;
  check_out?: string;
  booking_source?: string;
  booking_url?: string;
};
