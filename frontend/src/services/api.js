import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../constants/config.js";

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(data.error || `Request failed (${response.status})`),
        { status: response.status },
      );
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
