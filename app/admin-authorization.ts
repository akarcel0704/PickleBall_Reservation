import { env } from "cloudflare:workers";
import type { AuthenticatedUser } from "@/app/authenticated-user";

export function isAuthorizedAdmin(user: AuthenticatedUser) {
  const allowedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowedEmail && user.email.trim().toLowerCase() === allowedEmail);
}
