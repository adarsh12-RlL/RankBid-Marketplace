module.exports = {
  // The local launcher allows only one server mode at a time. A single build
  // directory prevents dev-generated route types from conflicting with the
  // production typecheck and optimized build.
  distDir: ".next",
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["node:sqlite"],
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};
