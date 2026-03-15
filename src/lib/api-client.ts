import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export function extractData<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export function extractPaginated<T>(response: {
  data: { data: T[]; meta?: { pagination?: unknown } };
}): { items: T[]; pagination: unknown } {
  return {
    items: response.data.data,
    pagination: response.data.meta?.pagination,
  };
}

/** Extract a user-friendly error message from an API error (e.g. axios error). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const err = error as { response?: { data?: { error?: { message?: string } } } };
  const message = err?.response?.data?.error?.message;
  return typeof message === "string" && message.trim().length > 0 ? message.trim() : fallback;
}

/** Extract field-level validation errors from an API error (VALIDATION_ERROR). */
export function getApiValidationFieldErrors(error: unknown): Record<string, string> | null {
  const err = error as { response?: { data?: { error?: { code?: string; details?: unknown } } } };
  if (err?.response?.data?.error?.code !== "VALIDATION_ERROR") return null;
  const details = err?.response?.data?.error?.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return Object.keys(out).length ? out : null;
}
