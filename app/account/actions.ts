"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { alertTeam } from "@/lib/notify";

export async function cancelBooking(fd: FormData) {
  const supabase = await supabaseServer();
  const id = String(fd.get("id"));
  const { data } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id).select("ref").single();
  if (data) await alertTeam(`Booking ${data.ref} cancelled by hirer`, ["Check whether a refund is due under the cancellation tiers."]);
  revalidatePath("/account");
}

export async function updateProfile(fd: FormData) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({
    full_name: String(fd.get("full_name")).trim(), phone: String(fd.get("phone")).trim(), org_name: String(fd.get("org_name")).trim(),
  }).eq("id", user.id);
  revalidatePath("/account");
}
