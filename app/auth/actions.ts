"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const safeNext = (n: FormDataEntryValue | null) => { const s = String(n ?? ""); return s.startsWith("/") && !s.startsWith("//") ? s : ""; };
async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const r = await signInImpl(fd);
  return r?.error ? { ...r, values: { email: String(fd.get("email") ?? "") } } : r;
}
async function signInImpl(fd: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("password")) });
  if (error) return { error: error.message === "Email not confirmed" ? "Please confirm your email first. Check your inbox for the link we sent." : "That email and password don't match. Try again or reset your password." };
  const next = safeNext(fd.get("next"));
  if (next) redirect(next);
  const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(p?.role === "admin" ? "/admin" : p?.role === "school" ? "/school" : "/account");
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const r = await signUpImpl(fd);
  return r?.error ? { ...r, values: Object.fromEntries([...fd.entries()].filter(([k]) => k !== "password").map(([k, x]) => [k, String(x)])) } : r;
}
async function signUpImpl(fd: FormData): Promise<FormState> {
  const role = fd.get("role") === "school" ? "school" : "customer";
  const email = String(fd.get("email")).trim(), password = String(fd.get("password"));
  const full_name = String(fd.get("full_name")).trim(), phone = String(fd.get("phone")).trim(), org_name = String(fd.get("org_name") ?? "").trim();
  if (!full_name || !phone) return { error: "Add your name and phone number." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  const next = safeNext(fd.get("next")) || (role === "school" ? "/school/onboarding" : "/account");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { role, full_name, phone, org_name }, emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message.includes("registered") ? "An account with this email already exists. Sign in instead." : error.message };
  if (data.session) redirect(next); // email confirmation turned off in Supabase
  return { ok: `We sent a confirmation link to ${email}. Open it on this device to finish signing up.` };
}

export async function sendReset(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(String(fd.get("email")).trim(), { redirectTo: `${await siteUrl()}/auth/callback?next=/reset` });
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function setPassword(_: FormState, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password"));
  if (pw.length < 8) return { error: "Use a password of at least 8 characters." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: "That link has expired. Ask for a new reset link." };
  redirect("/login?reset=1");
}
