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

const createMethod = (method: HttpMethod) => {
  return async <T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {},
  ) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(FREISPACE_API_KEY ? { "x-api-key": FREISPACE_API_KEY } : {}),
      ...options.headers,
    };

    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      ...options,
      method,
      headers,
      ...(data ? { body: JSON.stringify(data) } : {}),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${await response.text()}`,
      );
    }

    return { status: response.status, data: (await response.json()) as T };
  };
};

export const freispaceClient: HttpClient = {
  get: createMethod("GET"),
  post: createMethod("POST"),
  put: createMethod("PUT"),
  delete: createMethod("DELETE"),
  patch: createMethod("PATCH"),
};
