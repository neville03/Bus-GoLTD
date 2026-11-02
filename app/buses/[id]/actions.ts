"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { alertTeam } from "@/lib/notify";
import { fmtRange, ugx } from "@/lib/format";

export type BookState = { error?: string; values?: Record<string, string> } | undefined;

export async function requestBooking(prev: BookState, fd: FormData): Promise<BookState> {
  const r = await send(fd);
  return r ? { ...r, values: Object.fromEntries([...fd.entries()].map(([k, x]) => [k, String(x)])) } : r;
}

async function send(fd: FormData): Promise<BookState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const row = {
    bus_id: v("bus_id"), customer_id: user.id, start_date: v("start_date"), end_date: v("end_date"),
    pickup: v("pickup"), destination: v("destination"), passengers: Number(v("passengers")), purpose: v("purpose"),
    note: v("note").slice(0, 1000), contact_name: v("contact_name"), contact_phone: v("contact_phone"),
    quote_ugx: 0, deposit_ugx: 0, commission_pct: 0, // worked out by the database
  };
  if (!row.start_date || !row.end_date || row.end_date < row.start_date) return { error: "Check your dates: the last day can't be before the first." };
  if (!row.pickup || !row.destination) return { error: "Add where we pick you up and where you're going." };
  if (!row.contact_name || !row.contact_phone) return { error: "Add a contact name and phone number for the day." };
  if (!(row.passengers > 0)) return { error: "Add the number of people." };
  const { data, error } = await supabase.from("bookings").insert(row).select("ref, quote_ugx").single();
  if (error) {
    const m = error.message;
    if (m.includes("not free")) return { error: "The bus isn't free on some of those days. Pick dates shown as free on the calendar." };
    if (m.includes("after today")) return { error: "Choose a start date after today." };
    if (m.includes("not available")) return { error: "This bus isn't taking bookings right now." };
    return { error: "We couldn't send your request. Please try again." };
  }
  await alertTeam(`New booking request ${data.ref}`, [`${row.contact_name} (${row.contact_phone}) requested a bus.`, `${fmtRange(row.start_date, row.end_date)} · ${row.pickup} → ${row.destination} · ${row.passengers} people · ${row.purpose}`, `Quote ${ugx(data.quote_ugx)}`]);
  redirect(`/account?sent=${data.ref}`);
}
