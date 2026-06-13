import { config } from "./config.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type Stage = "development" | "staging" | "demo" | "production";

const FREISPACE_API_KEY =
  config.apiKey || process.env.FREISPACE_API_KEY || process.env.API_KEY;

const STAGE: Stage = (process.env.STAGE as Stage) || "production";

const BASE_URL_DEV = "http://api.mcp.ai.app.freispace.io";
const BASE_URL_STAGING = "https://mcp-api.ai.staging.cloud.freispace.com";
const BASE_URL_DEMO = "https://mcp-api.ai.demo.freispace.com";
const BASE_URL_PROD = "https://mcp-api.ai.freispace.com";

interface HttpClient {
  get<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<{ status: number; data: T }>;
  post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<{ status: number; data: T }>;
  put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<{ status: number; data: T }>;
  delete<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<{ status: number; data: T }>;
  patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<{ status: number; data: T }>;
}

const getBaseUrl = () => {
  switch (STAGE) {
    case "development":
      return BASE_URL_DEV;
    case "staging":
      return BASE_URL_STAGING;
    case "demo":
      return BASE_URL_DEMO;
    case "production":
    default:
      return BASE_URL_PROD;
  }
};

// Keep error text short and actionable — it is returned to the calling LLM.
const buildErrorMessage = async (response: Response): Promise<string> => {
  let detail = "";
  try {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.error || "";
    } catch {
      detail = body;
    }
  } catch {
    detail = "";
  }

  detail = detail.replace(/\s+/g, " ").trim().slice(0, 200);

  switch (response.status) {
    case 401:
    case 403:
      return `Not authorized (${response.status}): ${detail || "invalid or missing API key"}. Do not retry with the same key.`;
    case 404:
      return `Not found (404): ${detail || "no matching record"}.`;
    case 422:
    case 400:
      return `Invalid parameters (${response.status}): ${detail}.`;
    default: {
      const retry = /try again/i.test(detail) ? "" : " Try again later.";
      return `Request failed (${response.status})${detail ? `: ${detail}` : ""}.${retry}`;
    }
  }
};

const request = async <T>(
  method: HttpMethod,
  endpoint: string,
  data?: unknown,
  options: RequestInit = {},
) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(FREISPACE_API_KEY ? { "x-api-key": FREISPACE_API_KEY } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${endpoint}`, {
      ...options,
      method,
      headers,
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? ((error.cause as Error | undefined)?.message ?? error.message)
        : String(error);
    throw new Error(`Cannot reach the freispace API (${cause}).`);
  }

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response));
  }

  return { status: response.status, data: (await response.json()) as T };
};

export const freispaceClient: HttpClient = {
  get: (endpoint, options) => request("GET", endpoint, undefined, options),
  post: (endpoint, data, options) => request("POST", endpoint, data, options),
  put: (endpoint, data, options) => request("PUT", endpoint, data, options),
  delete: (endpoint, data, options) =>
    request("DELETE", endpoint, data, options),
  patch: (endpoint, data, options) => request("PATCH", endpoint, data, options),
};
