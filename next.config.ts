import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Hostinger reports many CPUs but limits threads, so the default number of build workers crashes the build.
  experimental: { cpus: 2 },
  // Basic browser protections on every page and API answer.
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self \"https://api.razorpay.com\" \"https://checkout.razorpay.com\")" },
    ] }];
  },
};

export default nextConfig;
