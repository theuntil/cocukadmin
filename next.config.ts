import type { NextConfig } from "next";

const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://localhost").hostname; }
  catch { return "localhost"; }
})();

const nextConfig: NextConfig = {
  // Docker imajı için tek dosyalık çıktı
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  experimental: { optimizePackageImports: ["@hugeicons/react"] },

  /* Mail kütüphaneleri paketlenmez, Node'da doğrudan çalışır.
     nodemailer / imapflow / mailparser yerel Node modüllerine (net, tls,
     dns) dayanıyor; webpack bunları paketlemeye çalışırsa derleme
     kırılır ya da çalışma anında "module not found" verir. */
  serverExternalPackages: ["nodemailer", "imapflow", "mailparser", "xlsx", "pdf-lib", "@pdf-lib/fontkit", "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};
export default nextConfig;
