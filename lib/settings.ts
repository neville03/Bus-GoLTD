import { supabaseServer } from "./supabase/server";
import type { Settings } from "./types";

export async function getSettings(): Promise<Settings | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle<Settings>();
  return data;
}
