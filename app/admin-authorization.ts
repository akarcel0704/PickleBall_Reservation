import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export function isAuthorizedAdmin(user: ChatGPTUser) {
  const allowedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(allowedEmail && user.email.trim().toLowerCase() === allowedEmail);
}
