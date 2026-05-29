import { requireUser } from "@/lib/auth";

// Gate: every route under (app) requires a session. Middleware already
// redirects unauthenticated requests; this is the defense-in-depth check.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
