export type Role = "customer" | "school" | "admin";
export type SchoolStatus = "draft" | "submitted" | "verified" | "rejected" | "suspended";
export type BusStatus = "draft" | "submitted" | "listed" | "rejected" | "paused";
export type BookingStatus = "requested" | "accepted" | "declined" | "deposit_paid" | "completed" | "cancelled";
export type DocKind = "school_registration" | "board_resolution" | "id_document" | "logbook" | "insurance" | "inspection" | "other";

export type Profile = { id: string; full_name: string; email: string; phone: string; org_name: string; role: Role };
export type School = {
  id: string; owner_id: string; name: string; district: string; area: string;
  status: SchoolStatus; admin_note: string; verified_at: string | null; created_at: string;
};
export type Bus = {
  id: string; school_id: string; make_model: string; plate: string; seats: number; year: number | null;
  has_ac: boolean; has_seatbelts: boolean; has_gps: boolean; driver_included: boolean; driver_name: string;
  daily_ugx: number; weekly_ugx: number | null; monthly_ugx: number | null; description: string; photos: string[];
  insurer: string; insurance_expiry: string | null; inspected_on: string | null; inspected_by: string;
  status: BusStatus; admin_note: string; created_at: string;
};
export type Booking = {
  id: string; ref: string; bus_id: string; customer_id: string; start_date: string; end_date: string;
  pickup: string; destination: string; passengers: number; purpose: string; note: string;
  contact_name: string; contact_phone: string; quote_ugx: number; deposit_ugx: number; commission_pct: number;
  status: BookingStatus; school_note: string; admin_note: string; payment_ref: string; created_at: string;
};
export type Doc = { id: string; school_id: string; bus_id: string | null; kind: DocKind; path: string; file_name: string; uploaded_at: string };
export type Settings = {
  commission_pct: number; deposit_pct: number; driver_bonus_ugx: number;
  support_phone: string; support_whatsapp: string; support_email: string; payment_instructions: string;
};
export type SchoolPrivate = {
  school_id: string; contact_name: string; contact_phone: string; contact_email: string;
  payout_method: "mtn" | "airtel" | "bank"; payout_account: string; payout_name: string;
};
