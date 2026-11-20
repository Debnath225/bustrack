const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/$/, "");

export async function getBaseUrl() {
  return API_BASE_URL;
}

export function getApiConfigurationError() {
  if (!API_BASE_URL) {
    return "API URL is not configured. Set EXPO_PUBLIC_API_URL in .env and restart Expo.";
  }
  try {
    const url = new URL(API_BASE_URL);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    if (url.protocol === "http:" && !__DEV__) {
      return "The API must use HTTPS in production.";
    }
  } catch {
    return "API URL must be a valid HTTP or HTTPS URL.";
  }
  return null;
}
export async function request<T = any>(
  path: string,
  opts: RequestInit = {},
  token?: string,
): Promise<T> {
  const configError = getApiConfigurationError();
  if (configError) throw new Error(configError);
  const base = await getBaseUrl();
  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      res = await fetch(`${base}${path}`, {
      ...opts,
      signal: opts.signal || controller.signal,
      headers: {
        Accept: "application/json",
        ...(opts.body &&
        !(typeof FormData !== "undefined" && opts.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    throw new Error(`Cannot reach ${base}. Check the server address, network, and that the API is running.`);
  }
  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") {
    throw new Error(`Server returned an invalid response (${res.status}).`);
  }
  if (!res.ok || json.success === false)
    throw new Error(json.message || `Request failed (${res.status})`);
  return json.data as T;
}
