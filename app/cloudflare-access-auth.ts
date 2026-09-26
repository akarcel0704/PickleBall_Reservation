import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthenticatedUser } from "@/app/authenticated-user";

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function accessConfiguration() {
  const configuredDomain = env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.CLOUDFLARE_ACCESS_AUD?.trim();
  if (!configuredDomain || !audience) return null;

  const teamDomain = configuredDomain.startsWith("https://")
    ? configuredDomain.replace(/\/$/, "")
    : `https://${configuredDomain.replace(/\/$/, "")}`;

  return { audience, teamDomain };
}

export async function getCloudflareAccessUser(): Promise<AuthenticatedUser | null> {
  const configuration = accessConfiguration();
  if (!configuration) return null;

  const requestHeaders = await headers();
  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!token) return null;

  const certsUrl = `${configuration.teamDomain}/cdn-cgi/access/certs`;
  let jwks = jwksByUrl.get(certsUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(certsUrl));
    jwksByUrl.set(certsUrl, jwks);
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: configuration.teamDomain,
      audience: configuration.audience,
    });
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (!payload.sub || !email) return null;

    const fullName = typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : null;

    return {
      userId: payload.sub,
      displayName: fullName ?? email,
      email,
      fullName,
    };
  } catch {
    return null;
  }
}
