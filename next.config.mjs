import withSerwist from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Required for Cloudflare Pages / standalone deployments
  output: "standalone",
};

// Chain plugins: next-intl → serwist → nextConfig
const withPlugins = withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withPlugins(withNextIntl(nextConfig));
