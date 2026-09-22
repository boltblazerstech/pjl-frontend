// All requests are relative — in dev, Vite proxies /api → http://localhost:8080.
// In production the same path is served by whatever reverse proxy sits in front,
// or via an explicit URL defined in the VITE_API_BASE_URL environment variable.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** Parse JSON body from an error response and surface the backend message. */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return (
      body?.message ||
      body?.error ||
      `API error: ${response.status} ${response.statusText}`
    );
  } catch {
    return `API error: ${response.status} ${response.statusText}`;
  }
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * POST with a pre-built FormData body (multipart/form-data).
   * Do NOT set Content-Type — browser sets it automatically with the boundary.
   */
  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * PATCH with a pre-built FormData body (multipart/form-data).
   */
  async patchForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      body: formData,
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
