import type { NextConfig } from "next";

let supabaseHost: string | undefined;
try { supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL.trim()).hostname : undefined; } catch { supabaseHost = undefined; }

const config: NextConfig = {
  images: { remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [] },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // The original clickable demo lives in public/demo.
  async redirects() { return [{ source: "/demo", destination: "/demo/index.html", permanent: false }]; },
};
export default config;
