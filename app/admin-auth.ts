import { env } from "cloudflare:workers";
import type { AuthenticatedUser } from "@/app/authenticated-user";
import { getCloudflareAccessUser } from "@/app/cloudflare-access-auth";
import {
  chatGPTSignOutPath,
  getChatGPTUser,
  requireChatGPTUser,
} from "@/app/chatgpt-auth";

const CLOUDFLARE_ACCESS_PROVIDER = "cloudflare-access";

export function usesCloudflareAccess() {
  return env.AUTH_PROVIDER === CLOUDFLARE_ACCESS_PROVIDER;
}

export async function getAdminUser(): Promise<AuthenticatedUser | null> {
  return usesCloudflareAccess()
    ? getCloudflareAccessUser()
    : getChatGPTUser();
}

export async function requireAdminPageUser(
  returnTo: string,
): Promise<AuthenticatedUser | null> {
  if (usesCloudflareAccess()) return getCloudflareAccessUser();
  return requireChatGPTUser(returnTo);
}

export function adminSignOutPath() {
  return usesCloudflareAccess()
    ? "/cdn-cgi/access/logout"
    : chatGPTSignOutPath("/");
}
