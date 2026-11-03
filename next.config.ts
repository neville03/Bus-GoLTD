import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const config: NextConfig = {
  images: { remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [] },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // The original clickable demo lives in public/demo.
  async redirects() { return [{ source: "/demo", destination: "/demo/index.html", permanent: false }]; },
};
export default config;
