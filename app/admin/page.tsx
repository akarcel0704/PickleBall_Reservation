import {
  adminSignOutPath,
  requireAdminPageUser,
  usesCloudflareAccess,
} from "@/app/admin-auth";
import { isAuthorizedAdmin } from "@/app/admin-authorization";
import Link from "next/link";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminPageUser("/admin");
  const signOutPath = adminSignOutPath();

  if (!user || !isAuthorizedAdmin(user)) {
    return (
      <AdminAccessDenied
        signOutPath={signOutPath}
        accessConfigured={usesCloudflareAccess()}
      />
    );
  }

  return (
    <AdminDashboard
      adminName={user.displayName}
      adminEmail={user.email}
      signOutPath={signOutPath}
    />
  );
}

function AdminAccessDenied({
  signOutPath,
  accessConfigured,
}: {
  signOutPath: string;
  accessConfigured: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f8f7] px-5 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-white p-7 text-center shadow-[0_18px_60px_rgba(11,31,42,0.10)] sm:p-9">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#0b1f2a] text-sm font-black text-[#d7ff3f]">CS</span>
        <p className="mt-5 text-sm font-medium text-[#607681]">Administrator access</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This account is not authorized</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {accessConfigured
            ? "Cloudflare Access did not provide an authorized administrator identity. Sign in with the designated CourtSide administrator account."
            : "Sign in with the designated CourtSide administrator account to open the reservation dashboard."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-[#f5f8f7]">Customer booking</Link>
          <a href={signOutPath} target="_top" className="rounded-lg bg-[#0b1f2a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#173847]">Switch account</a>
        </div>
      </section>
    </main>
  );
}
