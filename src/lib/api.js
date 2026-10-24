/**
 * Small fetch wrapper for the Doctor Tracker API.
 *
 * All requests go through the Next.js `/api` rewrite, so the httpOnly auth
 * cookie is first-party and is sent automatically with `credentials: "include"`.
 * The JWT never reaches JavaScript and is never stored in localStorage.
 */

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(message, { status = 0, errors = [], cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = Array.isArray(errors) ? errors : [];
    this.cause = cause;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  /** Turns `[{ field, message }]` into `{ field: message }` for form rendering. */
  get fieldErrors() {
    return this.errors.reduce((accumulator, entry) => {
      if (entry?.field && entry?.message) {
        accumulator[entry.field] = entry.message;
      }
      return accumulator;
    }, {});
  }
}

const isJsonResponse = (response) =>
  (response.headers.get("content-type") || "").includes("application/json");

async function readPayload(response) {
  if (response.status === 204) return null;
  if (!isJsonResponse(response)) {
    const text = await response.text().catch(() => "");
    return { raw: text };
  }
  return response.json().catch(() => null);
}

/**
 * @param {string} path  API path without the `/api` prefix, e.g. `/doctors`.
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 * @returns {Promise<any>} the parsed response envelope (`{ success, data, pagination }`)
 */
export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${normalizedPath}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      { status: 0, cause: error }
    );
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status >= 500
          ? "The server is unavailable right now. Please try again in a moment."
          : `The request failed (HTTP ${response.status}).`);

    throw new ApiError(message, {
      status: response.status,
      errors: payload?.errors,
    });
  }

  // A 204 has no body by design (e.g. deletes).
  if (response.status === 204) return null;

  // A 200 response without a JSON body is not something the API does; treat it
  // as a server problem rather than silently handing back `undefined` data.
  if (payload === null) {
    throw new ApiError("The server returned an empty response.", {
      status: response.status,
    });
  }

  if (payload?.success === false) {
    throw new ApiError(payload.message || "The request failed.", {
      status: response.status,
      errors: payload.errors,
    });
  }

  return payload;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    apiRequest(path, { ...options, method: "POST", body }),
  patch: (path, body, options) =>
    apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

/** Builds a query string, skipping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Human-readable fallback for anything thrown by the client. */
export function getErrorMessage(error) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
