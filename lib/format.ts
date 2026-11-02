export const ugx = (n: number | null | undefined) => "UGX " + Math.round(n ?? 0).toLocaleString("en-US");

export const toDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s: string, n: number) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);
export const todayKampala = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

export const fmtDate = (s: string | null | undefined, year = false) =>
  s ? toDate(s.slice(0, 10)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) }) : "";
export const fmtRange = (a: string, b: string) => (a === b ? fmtDate(a, true) : `${fmtDate(a)} – ${fmtDate(b, true)}`);

/** Same rule as public.quote_for in the database, used only to show an estimate before submitting. */
export function estimate(bus: { daily_ugx: number; weekly_ugx: number | null; monthly_ugx: number | null }, start: string, end: string) {
  const n = daysBetween(start, end) + 1;
  if (n < 1) return 0;
  if (bus.monthly_ugx && n >= 30) return Math.floor(n / 30) * bus.monthly_ugx + Math.min((n % 30) * bus.daily_ugx, bus.monthly_ugx);
  if (bus.weekly_ugx && n >= 7) return Math.floor(n / 7) * bus.weekly_ugx + Math.min((n % 7) * bus.daily_ugx, bus.weekly_ugx);
  return n * bus.daily_ugx;
}

/** Turn a Ugandan number like 0772 123 456 into a wa.me link. */
export function whatsapp(phone: string, text = "") {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "256" + d.slice(1);
  if (d.length === 9) d = "256" + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const SEAT_SIZES = [14, 18, 25, 30, 33, 45, 60];
export const SUGGESTED_DAILY: Record<number, number> = { 14: 350000, 18: 450000, 25: 600000, 30: 700000, 33: 750000, 45: 920000, 60: 1150000 };
export const suggestedDaily = (seats: number) => {
  const k = SEAT_SIZES.reduce((a, b) => (Math.abs(b - seats) < Math.abs(a - seats) ? b : a));
  return SUGGESTED_DAILY[k];
};
export const DISTRICTS = ["Kampala", "Wakiso", "Mukono", "Entebbe", "Jinja", "Mpigi", "Luweero", "Masaka", "Mbarara", "Gulu", "Mbale", "Other"];
export const PURPOSES = ["School trip", "Church event", "Wedding", "Funeral", "Corporate staff trip", "Tour", "Sports club", "NGO field programme", "University or student group", "Other"];

export const BOOKING_LABEL: Record<string, [string, string]> = {
  requested: ["Waiting for school", "info"], accepted: ["Accepted · pay deposit", "acc"], declined: ["Declined", "bad"],
  deposit_paid: ["Confirmed", "ok"], completed: ["Completed", "ok"], cancelled: ["Cancelled", ""],
};
export const BUS_LABEL: Record<string, [string, string]> = {
  draft: ["Draft", ""], submitted: ["Under review", "info"], listed: ["Live", "ok"], rejected: ["Needs changes", "bad"], paused: ["Paused", "warn"],
};
export const SCHOOL_LABEL: Record<string, [string, string]> = {
  draft: ["Not submitted", ""], submitted: ["Under review", "info"], verified: ["Verified", "ok"], rejected: ["Needs changes", "bad"], suspended: ["Suspended", "bad"],
};
export const DOC_LABEL: Record<string, string> = {
  school_registration: "School registration certificate", board_resolution: "Board or director approval to hire out buses",
  id_document: "ID of the person signing", logbook: "Logbook (registration)", insurance: "Insurance certificate",
  inspection: "Inspection certificate", other: "Other document",
};
