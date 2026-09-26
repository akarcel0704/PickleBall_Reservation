declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAIL?: string;
    AUTH_PROVIDER?: string;
    CLOUDFLARE_ACCESS_TEAM_DOMAIN?: string;
    CLOUDFLARE_ACCESS_AUD?: string;
  }
}
