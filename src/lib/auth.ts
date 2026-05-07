// Single-password gate for DMG. Not "real" multi-user auth — just an
// HMAC-signed cookie that the middleware checks on every request.
// Password is read from `DMG_PASSWORD` env var. Cookie is signed with
// `DMG_AUTH_SECRET`. Both must be set in production.

const COOKIE_NAME = "dmg_session";
const PERSONAL_COOKIE_NAME = "dmg_personal";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const SESSION_COOKIE = COOKIE_NAME;
export const PERSONAL_SESSION_COOKIE = PERSONAL_COOKIE_NAME;

function getSecret(): string {
  const s = process.env.DMG_AUTH_SECRET;
  if (!s || s.length < 16) {
    // In dev we tolerate a short fallback so first-run isn't broken;
    // in prod the build will set this via Vercel env.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DMG_AUTH_SECRET must be set in production (min 16 chars)");
    }
    return "dev-secret-replace-me-in-prod-very-insecure";
  }
  return s;
}

function getPassword(): string | null {
  return process.env.DMG_PASSWORD || null;
}

function getPersonalPassword(): string | null {
  return process.env.PERSONAL_PASSWORD || null;
}

// HMAC-SHA-256 using Web Crypto (works in both Edge and Node runtimes).
async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = String(exp);
  const sig = await hmacHex(getSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmacHex(getSecret(), expStr);
  // Constant-time-ish: same length, full compare.
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(input: string): boolean {
  const real = getPassword();
  if (!real) return false;
  // Constant-time-ish over equal lengths; bail early on length mismatch
  // (length itself isn't really a secret here).
  if (input.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}

export function checkPersonalPassword(input: string): boolean {
  const real = getPersonalPassword();
  if (!real) return false;
  if (input.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}

// Personal-channel session token. Same HMAC scheme as the main session,
// scoped via a domain prefix so a leaked main-session token can't be
// reinterpreted as a personal-session token.
export async function createPersonalSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = "personal:" + String(exp);
  const sig = await hmacHex(getSecret(), payload);
  return `${exp}.${sig}`;
}

export async function verifyPersonalSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmacHex(getSecret(), "personal:" + expStr);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  };
}
