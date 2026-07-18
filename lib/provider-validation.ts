const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export type ValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

export function validateEndpointUrl(
  rawUrl: string,
  isDev: boolean
): ValidationResult {
  if (!rawUrl || !rawUrl.trim()) {
    return { ok: false, error: "Endpoint URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http and https protocols are allowed." };
  }

  const hostname = parsed.hostname;

  const isPrivate = PRIVATE_IP_PATTERNS.some((p) => p.test(hostname));
  if (isPrivate && !isDev) {
    return {
      ok: false,
      error: "Private/internal URLs are not allowed in production. Use https with a public endpoint.",
    };
  }

  if (parsed.protocol === "http:" && !isDev) {
    return {
      ok: false,
      error: "HTTP is not allowed in production. Use HTTPS.",
    };
  }

  return { ok: true, url: parsed };
}

export function sanitizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
