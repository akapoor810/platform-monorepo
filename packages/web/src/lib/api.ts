const BASE_URL = import.meta.env.VITE_API_URL || "/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = localStorage.getItem("token");

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Try to refresh the token
      // BUG: race condition if multiple requests hit 401 simultaneously
      // All try to refresh, but only the first succeeds — rest get 401 again
      // See issue #44
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error("Session expired");
      }
      // Retry the original request
      return this.request(method, path, body);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw Object.assign(new Error(error.message || response.statusText), {
        status: response.status,
        data: error,
      });
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem("token", token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export const api = new ApiClient(BASE_URL);
