"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { fmtRange, ugx } from "@/lib/format";

const v = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function schoolEmail(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], schoolId: string) {
  const { data } = await supabase.from("schools").select("name, owner:profiles!schools_owner_id_fkey(email), school_private(contact_email)").eq("id", schoolId)
    .single<{ name: string; owner: { email: string } | null; school_private: { contact_email: string } | null }>();
  return { name: data?.name ?? "", email: data?.school_private?.contact_email || data?.owner?.email || "" };
}

export async function reviewSchool(to: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = v(fd, "id"), note = v(fd, "admin_note");
  if (!["verified", "rejected", "suspended"].includes(to)) return;
  await supabase.from("schools").update({ status: to, admin_note: to === "verified" ? "" : note }).eq("id", id);
  const s = await schoolEmail(supabase, id);
  await notifyUser(s.email, to === "verified" ? `${s.name} is approved on Bus&Go` : `Your Bus&Go application needs changes`,
    to === "verified" ? ["Your school is verified. Add your buses and send them for inspection to start taking bookings."] : [note || "Please check your application.", "Update it and send it again."], "/school");
  revalidatePath("/admin");
}

export async function reviewBus(to: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = v(fd, "id"), note = v(fd, "admin_note");
  if (!["listed", "rejected", "paused"].includes(to)) return;
  const patch: Record<string, unknown> = { status: to, admin_note: to === "listed" ? "" : note };
  if (to === "listed") { patch.inspected_on = v(fd, "inspected_on") || null; patch.inspected_by = v(fd, "inspected_by"); }
  const { data: bus } = await supabase.from("buses").update(patch).eq("id", id).select("plate, school_id").single();
  if (bus) {
    const s = await schoolEmail(supabase, bus.school_id);
    await notifyUser(s.email, to === "listed" ? `${bus.plate} is live on Bus&Go` : `${bus.plate} needs changes`,
      to === "listed" ? ["Your bus passed inspection and is now visible to hirers. Keep your calendar up to date."] : [note || "Please check the bus details."], `/school/buses/${id}`);
  }
  revalidatePath("/admin");
}

export async function adminBooking(to: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = v(fd, "id");
  const patch: Record<string, unknown> = { admin_note: v(fd, "admin_note") };
  if (["deposit_paid", "completed", "cancelled"].includes(to)) patch.status = to;
  if (to === "deposit_paid") patch.payment_ref = v(fd, "payment_ref");
  const { data: b } = await supabase.from("bookings").update(patch).eq("id", id)
    .select("ref, start_date, end_date, deposit_ugx, bus_id, customer:profiles!bookings_customer_id_fkey(email), buses(school_id)")
    .single<{ ref: string; start_date: string; end_date: string; deposit_ugx: number; customer: { email: string } | null; buses: { school_id: string } | null }>();
  if (b && to === "deposit_paid") {
    const when = fmtRange(b.start_date, b.end_date);
    await notifyUser(b.customer?.email, `Booking ${b.ref} confirmed`, [`We received your deposit of ${ugx(b.deposit_ugx)}. Your trip on ${when} is confirmed.`, "The school's contact details are now on your bookings page."], "/account");
    if (b.buses) { const s = await schoolEmail(supabase, b.buses.school_id); await notifyUser(s.email, `Booking ${b.ref} confirmed`, [`The hirer paid the deposit. The trip on ${when} is confirmed. Please keep the bus free.`], "/school"); }
  }
  revalidatePath("/admin");
}

export async function saveSettings(fd: FormData) {
  const { supabase } = await requireAdmin();
  const num = (k: string) => Number(v(fd, k));
  await supabase.from("settings").update({
    commission_pct: num("commission_pct"), deposit_pct: num("deposit_pct"), driver_bonus_ugx: num("driver_bonus_ugx"),
    support_phone: v(fd, "support_phone"), support_whatsapp: v(fd, "support_whatsapp"), support_email: v(fd, "support_email"),
    payment_instructions: v(fd, "payment_instructions"),
  }).eq("id", 1);
  revalidatePath("/", "layout");
}
