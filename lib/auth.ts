import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { Profile, School } from "./types";

export const isConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

export async function getSession() {
  if (!isConfigured()) redirect("/setup");
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile };
}

export async function requireUser(next = "/") {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s as typeof s & { user: NonNullable<typeof s.user>; profile: Profile };
}

export async function requireAdmin() {
  const s = await requireUser("/admin");
  if (s.profile.role !== "admin") redirect("/");
  return s;
}

export async function requireSchoolOwner(next = "/school") {
  const s = await requireUser(next);
  const { data: school } = await s.supabase.from("schools").select("*").eq("owner_id", s.user.id).maybeSingle<School>();
  return { ...s, school };
}
