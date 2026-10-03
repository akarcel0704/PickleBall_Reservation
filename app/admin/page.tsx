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
    <main className="grid min-h-screen place-items-center bg-[#f6f9fd] px-5 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-white p-7 text-center shadow-[0_18px_60px_rgba(11,53,107,0.11)] sm:p-9">
        <img
          src="/paddle-bay-logo.png"
          alt="Paddle Bay Pickleball Court logo"
          width={72}
          height={72}
          className="mx-auto size-18 rounded-full bg-white object-contain"
        />
        <p className="mt-5 text-sm font-medium text-[#60758d]">Administrator access</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This account is not authorized</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {accessConfigured
            ? "Cloudflare Access did not provide an authorized administrator identity. Sign in with the designated Paddle Bay administrator account."
            : "Sign in with the designated Paddle Bay administrator account to open the reservation dashboard."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-[#f6f9fd]">Customer booking</Link>
          <a href={signOutPath} target="_top" className="rounded-lg bg-[#0b356b] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#082a57]">Switch account</a>
        </div>
      </section>
    </main>
  );
}
