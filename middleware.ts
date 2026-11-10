import { NextRequest, NextResponse } from "next/server";

// Known malicious vulnerability scanner user-agents
const MALICIOUS_USER_AGENTS = [
  "sqlmap",
  "nikto",
  "masscan",
  "zgrab",
  "nmap",
  "dirbuster",
  "gobuster",
  "wpscan",
  "acunetix",
  "havij",
  "nessus",
  "vuln",
];

// Sensitive probe paths targeted by automated attack bots
const SENSITIVE_PROBE_PATHS = [
  "/.env",
  "/.git",
  "/.svn",
  "/.htaccess",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/phpmyadmin",
  "/pma",
  "/actuator",
  "/.aws",
  "/config.json",
  "/server-status",
  "/etc/passwd",
  "/shell",
  "/cmd",
  "/cgi-bin",
];

// Malicious payload patterns (SQL injection, XSS, Path traversal)
const ATTACK_PATTERNS = [
  /\.\.\//i,
  /\.\.\\/i,
  /%2e%2e/i,
  /<script[\s>]/i,
  /javascript:/i,
  /union\s+select/i,
  /information_schema/i,
  /base64_decode/i,
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname.toLowerCase();
  const rawUrl = req.url.toLowerCase();
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  // 1. Block automated vulnerability scanners & attack bots
  if (MALICIOUS_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse(
      JSON.stringify({ error: "Access Denied: Automated vulnerability scanners are blocked." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
      }
    );
  }

  // 2. Block malicious probe paths (e.g. /.env, /wp-admin, /phpmyadmin)
  if (SENSITIVE_PROBE_PATHS.some((probe) => path.startsWith(probe) || path.includes(probe))) {
    return new NextResponse(
      JSON.stringify({ error: "Access Denied: Prohibited resource probe." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
      }
    );
  }

  // 3. Inspect query string and path for SQLi, XSS, and Path Traversal attack vectors
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {}

  if (ATTACK_PATTERNS.some((pattern) => pattern.test(rawUrl) || pattern.test(decodedUrl))) {
    return new NextResponse(
      JSON.stringify({ error: "Bad Request: Malicious request payload detected." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" },
      }
    );
  }

  // 4. Continue with security headers injection
  const response = NextResponse.next();

  // Enterprise Security Headers
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://accounts.google.com https://apis.google.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://*.stripe.com https://www.google.com https://*.googleusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://accounts.google.com",
    "connect-src 'self' https://tiles.openfreemap.org https://*.openfreemap.org https://unpkg.com https://api.stripe.com https://checkout.stripe.com https://accounts.google.com https://rankbid-official.vercel.app https://rankbid-marketplacelive.vercel.app",
    "worker-src 'self' blob: https://unpkg.com",
    "child-src 'self' blob:",
    "form-action 'self' https://checkout.stripe.com https://accounts.google.com",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
