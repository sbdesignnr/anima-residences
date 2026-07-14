import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Dev only. Next blocks cross-origin requests to dev resources (HMR, etc.)
   * from any host other than the one it booted on. Testing on a phone means
   * loading http://192.168.1.11:3000, so that LAN host has to be allowed or
   * hot reload silently dies on the device.
   *
   * The matcher splits on "." and `*` matches one segment, so this survives a
   * DHCP lease change (…1.11 → …1.42) without touching the config again.
   */
  allowedDevOrigins: ["192.168.1.*"],

  images: {
    // AVIF first: building.avif is 225 KB where the PNG master is 4.4 MB.
    formats: ["image/avif", "image/webp"],
    // Next 16 only allows quality 75 unless listed explicitly.
    qualities: [50, 62, 75, 90],
  },

  /**
   * Everything under /public is served by Vercel with `max-age=0,
   * must-revalidate` by default. For a 35 MB hero that the hero SCRUBS — issuing
   * range request after range request as the visitor scrolls — that is a
   * revalidation round-trip in front of every seek.
   *
   * `s-maxage` is what the CDN honours, and Vercel purges its edge on every
   * deployment, so a year is safe even though these filenames carry no hash: a
   * re-encoded video ships with a new deployment, and the new deployment clears
   * the cache that was holding the old one.
   */
  async headers() {
    const long = [
      { key: "Cache-Control", value: "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400" },
    ];
    return [
      { source: "/videos/:path*", headers: long },
      { source: "/images/:path*", headers: long },
    ];
  },
};

export default nextConfig;
