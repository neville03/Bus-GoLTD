"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { alertTeam, notifyUser } from "@/lib/notify";
import { fmtRange, ugx } from "@/lib/format";

export type ActState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const keep = (fd: FormData, r: ActState): ActState => (r?.error ? { ...r, values: Object.fromEntries([...fd.entries()].filter(([, x]) => typeof x === "string").map(([k, x]) => [k, String(x)])) } : r);
const v = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => { const x = Number(v(fd, k).replace(/[, ]/g, "")); return Number.isFinite(x) && x > 0 ? Math.round(x) : null; };

async function ctx() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/school");
  const { data: school } = await supabase.from("schools").select("id, name, status").eq("owner_id", user.id).maybeSingle();
  return { supabase, user, school };
}

export async function saveSchool(_: ActState, fd: FormData): Promise<ActState> { return keep(fd, await saveSchoolImpl(fd)); }
async function saveSchoolImpl(fd: FormData): Promise<ActState> {
  const { supabase, user, school } = await ctx();
  const pub = { name: v(fd, "name"), district: v(fd, "district"), area: v(fd, "area") };
  const priv = {
    contact_name: v(fd, "contact_name"), contact_phone: v(fd, "contact_phone"), contact_email: v(fd, "contact_email"),
    payout_method: (["mtn", "airtel", "bank"].includes(v(fd, "payout_method")) ? v(fd, "payout_method") : "mtn") as "mtn" | "airtel" | "bank",
    payout_account: v(fd, "payout_account"), payout_name: v(fd, "payout_name"),
  };
  if (!pub.name || !pub.district) return { error: "Add the school's name and district." };
  if (!priv.contact_name || !priv.contact_phone) return { error: "Add a contact person and phone number." };
  let id = school?.id as string | undefined;
  if (id) {
    const { error } = await supabase.from("schools").update(pub).eq("id", id);
    if (error) return { error: "Couldn't save. Please try again." };
  } else {
    const { data, error } = await supabase.from("schools").insert({ ...pub, owner_id: user.id, status: "draft" }).select("id").single();
    if (error || !data) return { error: "Couldn't create the school. Please try again." };
    id = data.id;
  }
  const { error: pe } = await supabase.from("school_private").upsert({ school_id: id, ...priv });
  if (pe) return { error: "Saved the school but not the contact details. Please try again." };
  revalidatePath("/school", "layout");
  return { ok: "Saved." };
}

export async function submitSchool() {
  const { supabase, school } = await ctx();
  if (!school) redirect("/school/onboarding");
  const { data: docs } = await supabase.from("documents").select("kind").eq("school_id", school.id).is("bus_id", null);
  const kinds = new Set((docs ?? []).map((d) => d.kind));
  const { data: priv } = await supabase.from("school_private").select("payout_account").eq("school_id", school.id).maybeSingle();
  if (!kinds.has("school_registration") || !kinds.has("id_document") || !priv?.payout_account) {
    redirect("/school/onboarding?missing=1");
  }
  await supabase.from("schools").update({ status: "submitted" }).eq("id", school.id);
  await alertTeam(`School application: ${school.name}`, [`${school.name} submitted its documents for review.`]);
  revalidatePath("/school", "layout");
  redirect("/school?submitted=1");
}

function busFields(fd: FormData) {
  const daily = n(fd, "daily_ugx");
  return {
    make_model: v(fd, "make_model"), plate: v(fd, "plate").toUpperCase().replace(/\s+/g, " "), seats: n(fd, "seats") ?? 0,
    year: n(fd, "year"), has_ac: fd.get("has_ac") === "on", has_seatbelts: fd.get("has_seatbelts") === "on", has_gps: fd.get("has_gps") === "on",
    driver_included: fd.get("driver_included") === "on", driver_name: v(fd, "driver_name"),
    daily_ugx: daily ?? 0, weekly_ugx: n(fd, "weekly_ugx"), monthly_ugx: n(fd, "monthly_ugx"),
    description: v(fd, "description").slice(0, 1500), insurer: v(fd, "insurer"), insurance_expiry: v(fd, "insurance_expiry") || null,
  };
}
function busError(f: ReturnType<typeof busFields>) {
  if (!f.make_model || !f.plate) return "Add the make, model and number plate.";
  if (f.seats < 7 || f.seats > 90) return "Seats must be between 7 and 90.";
  if (!f.daily_ugx) return "Set a daily price.";
  return null;
}

export async function createBus(_: ActState, fd: FormData): Promise<ActState> { return keep(fd, await createBusImpl(fd)); }
async function createBusImpl(fd: FormData): Promise<ActState> {
  const { supabase, school } = await ctx();
  if (!school) redirect("/school/onboarding");
  const f = busFields(fd), e = busError(f);
  if (e) return { error: e };
  const { data, error } = await supabase.from("buses").insert({ ...f, school_id: school.id, status: "draft" }).select("id").single();
  if (error) return { error: error.message.includes("plate") || error.code === "23505" ? "A bus with this number plate is already on Bus&Go." : "Couldn't save the bus. Please try again." };
  redirect(`/school/buses/${data.id}?new=1`);
}

export async function updateBus(_: ActState, fd: FormData): Promise<ActState> { return keep(fd, await updateBusImpl(fd)); }
async function updateBusImpl(fd: FormData): Promise<ActState> {
  const { supabase } = await ctx();
  const id = v(fd, "id"), f = busFields(fd), e = busError(f);
  if (e) return { error: e };
  const { error } = await supabase.from("buses").update(f).eq("id", id);
  if (error) return { error: error.code === "23505" ? "A bus with this number plate is already on Bus&Go." : "Couldn't save. Please try again." };
  revalidatePath(`/school/buses/${id}`);
  return { ok: "Saved." };
}

export async function setBusStatus(fd: FormData) {
  const { supabase, school } = await ctx();
  const id = v(fd, "id"), to = v(fd, "to");
  if (to === "submitted") {
    const { data: bus } = await supabase.from("buses").select("photos, plate").eq("id", id).single();
    const { data: docs } = await supabase.from("documents").select("kind").eq("bus_id", id);
    const kinds = new Set((docs ?? []).map((d) => d.kind));
    if (!bus?.photos?.length || !kinds.has("logbook") || !kinds.has("insurance")) redirect(`/school/buses/${id}?missing=1`);
    await alertTeam(`Bus submitted: ${bus?.plate}`, [`${school?.name} submitted ${bus?.plate} for inspection and approval.`]);
  }
  if (["submitted", "paused", "listed"].includes(to)) await supabase.from("buses").update({ status: to }).eq("id", id);
  revalidatePath("/school", "layout");
  redirect(`/school/buses/${id}`);
}

export async function deleteBus(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("buses").delete().eq("id", v(fd, "id"));
  revalidatePath("/school");
  redirect("/school");
}

export async function respondBooking(to: string, fd: FormData) {
  const { supabase, school } = await ctx();
  const id = v(fd, "id"), note = v(fd, "school_note").slice(0, 500);
  if (!["accepted", "declined", "cancelled", "completed"].includes(to)) return;
  const { data, error } = await supabase.from("bookings").update({ status: to, school_note: note }).eq("id", id)
    .select("ref, start_date, end_date, deposit_ugx, customer:profiles!bookings_customer_id_fkey(email)").single<{ ref: string; start_date: string; end_date: string; deposit_ugx: number; customer: { email: string } | null }>();
  if (error) redirect(`/school?err=${encodeURIComponent(error.message.includes("taken") ? "Those days are already taken. Open them in the calendar first, or decline." : "Couldn't update the booking.")}`);
  if (data && (to === "accepted" || to === "declined" || to === "cancelled")) {
    const when = fmtRange(data.start_date, data.end_date);
    await notifyUser(data.customer?.email, to === "accepted" ? `Booking ${data.ref} accepted: pay your deposit` : `Booking ${data.ref} ${to}`,
      to === "accepted"
        ? [`Good news: ${school?.name} accepted your trip on ${when}.`, `Pay the deposit of ${ugx(data.deposit_ugx)} to confirm it. Payment details are on your bookings page.`, note ? `Note from the school: ${note}` : ""]
        : [`${school?.name} can't take your trip on ${when}.`, note ? `Note from the school: ${note}` : "", "Any deposit you paid will be refunded in full. You can find another bus on Bus&Go."],
      "/account");
  }
  await alertTeam(`Booking ${data?.ref} ${to} by ${school?.name}`, [to === "accepted" ? "Send the hirer deposit instructions and record the payment in Admin when it arrives." : `New status: ${to}.`]);
  revalidatePath("/school");
}
