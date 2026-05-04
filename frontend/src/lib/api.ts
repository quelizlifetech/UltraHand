const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ----------------------------------
   TOKEN HELPERS
----------------------------------- */
const TOKEN_KEY = "ultrahand-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ----------------------------------
   TYPES
----------------------------------- */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  auth?: boolean;
}

/* ----------------------------------
   CORE REQUEST FUNCTION
----------------------------------- */
async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    data,
    auth = true,
  } = options;

  const token = getToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  let result: any = null;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  /* ------------------------------
     AUTO LOGOUT IF TOKEN EXPIRED
  ------------------------------ */
  if (response.status === 401) {
    removeToken();
  }

  /* ------------------------------
     ERROR HANDLING
  ------------------------------ */
  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return result as T;
}

/* ----------------------------------
   API METHODS
----------------------------------- */
export const api = {
  get: <T = any>(url: string, auth = true) =>
    request<T>(url, {
      method: "GET",
      auth,
    }),

  post: <T = any>(
    url: string,
    data?: unknown,
    auth = true
  ) =>
    request<T>(url, {
      method: "POST",
      data,
      auth,
    }),

  put: <T = any>(
    url: string,
    data?: unknown,
    auth = true
  ) =>
    request<T>(url, {
      method: "PUT",
      data,
      auth,
    }),

  patch: <T = any>(
    url: string,
    data?: unknown,
    auth = true
  ) =>
    request<T>(url, {
      method: "PATCH",
      data,
      auth,
    }),

  delete: <T = any>(url: string, auth = true) =>
    request<T>(url, {
      method: "DELETE",
      auth,
    }),
};

/* ----------------------------------
   READY API HELPERS
----------------------------------- */
export const authApi = {
  registerDoctor: (data: {
    name: string;
    email: string;
    password: string;
  }) =>
    api.post("/auth/register-doctor", data, false),

  loginDoctor: (data: {
    email: string;
    password: string;
  }) =>
    api.post("/auth/login", data, false),

  loginPatient: (data: {
    phone: string;
    password: string;
  }) =>
    api.post("/auth/login", data, false),

  me: () => api.get("/auth/me"),
};

export const patientApi = {
  list: () => api.get("/patients"),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post("/patients", data),
  update: (id: string, data: any) =>
    api.put(`/patients/${id}`, data),
  remove: (id: string) =>
    api.delete(`/patients/${id}`),
};