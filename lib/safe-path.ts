// Only allow same-site relative redirects (block "//evil.com", "https://...",
// and backslash tricks) so a crafted ?redirect= can't bounce users off-site.
export function safePath(p: unknown, fallback = "/"): string {
  if (typeof p !== "string") return fallback;
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return fallback;
  return p;
}
