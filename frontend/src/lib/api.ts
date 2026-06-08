const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/* =========================================
   TOKEN HELPERS
========================================= */

const TOKEN_KEY = "ultrahand-token";

export function getToken():
  | string
  | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(
  token: string
): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* =========================================
   TRANSFORM → FRONTEND → ML FORMAT
========================================= */

function transformPatientToML(data: any) {
  return {
    ...data,
    diagnosis: String(data.diagnosis),
    category: String(data.category),
    ml_input: {
      ...data.ml_input,
      therapy_mode: String(
        data.ml_input?.therapy_mode
      ),
      joints: {
        ...data.ml_input?.joints,
      },
    },
  };
}

/* =========================================
   NORMALIZE ANALYTICS
   ────────────────────────────────────────
   Preserves ALL fields the backend sends.
   Only adds fallbacks for the most common
   fields — does not strip anything.
========================================= */

function normalizeAnalytics(analytics: any) {
  if (!analytics) return null;

  const s =
    analytics.summary ||
    analytics.metrics ||
    {};

  return {
    // Preserve everything the backend sends
    ...analytics,

    // Then enrich the summary with all expected fields
    // (fallbacks ensure nothing is undefined)
    summary: {
      // Spread original summary first so all fields are kept
      ...s,

      // Timeline
      estimated_days:
        s.estimated_days ??
        s.estimatedDays ??
        s.totalDays ??
        0,

      target_reached_day:
        s.target_reached_day ??
        s.targetReachedDay ??
        null,

      // ROM metrics
      current_avg_rom:
        s.current_avg_rom ??
        s.currentAvgROM ??
        0,

      target_avg_rom:
        s.target_avg_rom ??
        s.targetAvgROM ??
        0,

      final_avg_rom:
        s.final_avg_rom ??
        s.finalAvgROM ??
        0,

      // Recovery — clearly labeled
      baseline_recovery_percent:
        s.baseline_recovery_percent ??
        s.baselineRecoveryPercent ??
        0,

      predicted_recovery_percent:
        s.predicted_recovery_percent ??
        s.predictedRecoveryPercent ??
        0,

      final_rom_percent:
        s.final_rom_percent ??
        s.finalROMPercent ??
        0,

      // Backward-compatible alias
      recovery_percent:
        s.recovery_percent ??
        s.recoveryPercent ??
        s.predicted_recovery_percent ??
        s.predictedRecoveryPercent ??
        0,

      // Risk + success
      success_chance:
        s.success_chance ??
        s.successChance ??
        0,

      risk_level:
        s.risk_level ||
        s.riskLevel ||
        "Unknown",
    },

    // Preserve arrays — backend may send camelCase OR snake_case
    recovery_curve:
      analytics.recovery_curve ||
      analytics.recoveryCurve ||
      analytics.rom_prediction ||
      [],

    daywise_plan:
      analytics.daywise_plan ||
      analytics.daywisePlan ||
      analytics.daily_report ||
      [],

    joint_analysis:
      analytics.joint_analysis ||
      analytics.jointAnalysis ||
      analytics.joint_improvement ||
      [],

    mode_distribution:
      analytics.mode_distribution ||
      analytics.modeDistribution ||
      analytics.therapy_phase_split ||
      {},

    session_plan:
      analytics.session_plan ||
      analytics.sessionPlan ||
      [],

    fatigue_summary:
      analytics.fatigue_summary ||
      analytics.fatigueSummary ||
      {},

    rom_prediction:
      analytics.rom_prediction ||
      analytics.romPrediction ||
      [],

    journey: analytics.journey || [],

    warnings: analytics.warnings || [],

    raw: analytics,
  };
}

/* =========================================
   RESPONSE NORMALIZER
========================================= */

function normalizeResponse(data: any) {
  if (!data) return data;

  const normalized = { ...data };

  if (normalized.aiReport) {
    normalized.aiReport =
      normalizeAnalytics(
        normalized.aiReport
      );
  }

  if (normalized.plan?.aiReport) {
    normalized.plan.aiReport =
      normalizeAnalytics(
        normalized.plan.aiReport
      );
  }

  if (normalized.patient?.plans) {
    normalized.patient.plans =
      normalized.patient.plans.map(
        (plan: any) => ({
          ...plan,
          aiReport: normalizeAnalytics(
            plan.aiReport
          ),
        })
      );
  }

  if (normalized.analytics) {
    normalized.analytics =
      normalizeAnalytics(
        normalized.analytics
      );
  }

  return normalized;
}

/* =========================================
   REQUEST CORE
========================================= */

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  auth?: boolean;
}

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
    headers["Content-Type"] =
      "application/json";
  }

  if (auth && token) {
    headers["Authorization"] =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      method,
      headers,
      body: data
        ? JSON.stringify(data)
        : undefined,
    }
  );

  let result: any = null;

  const contentType =
    response.headers.get("content-type");

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  // Only clear token when an authenticated
  // request is rejected — protects against
  // 401s from public endpoints (login etc.)
  if (
    response.status === 401 &&
    auth &&
    token
  ) {
    removeToken();
  }

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return normalizeResponse(result);
}

/* =========================================
   API METHODS
========================================= */

export const api = {
  get: <T = any>(
    url: string,
    auth = true
  ) =>
    request<T>(url, { method: "GET", auth }),

  post: <T = any>(
    url: string,
    data?: any,
    auth = true
  ) => {
    if (url === "/patients") {
      data = transformPatientToML(data);
    }
    return request<T>(url, {
      method: "POST",
      data,
      auth,
    });
  },

  put: <T = any>(
    url: string,
    data?: any,
    auth = true
  ) =>
    request<T>(url, {
      method: "PUT",
      data,
      auth,
    }),

  patch: <T = any>(
    url: string,
    data?: any,
    auth = true
  ) =>
    request<T>(url, {
      method: "PATCH",
      data,
      auth,
    }),

  delete: <T = any>(
    url: string,
    auth = true
  ) =>
    request<T>(url, {
      method: "DELETE",
      auth,
    }),
};

/* =========================================
   AUTH API
========================================= */

export const authApi = {
  registerDoctor: (data: {
    name: string;
    email: string;
    password: string;
  }) =>
    api.post(
      "/auth/register-doctor",
      data,
      false
    ),

  loginDoctor: (data: {
    email: string;
    password: string;
  }) =>
    api.post(
      "/auth/login",
      data,
      false
    ),

  loginPatient: (data: {
    phone: string;
    password: string;
  }) =>
    api.post(
      "/auth/login",
      data,
      false
    ),

  me: () => api.get("/auth/me"),
};

/* =========================================
   PATIENT API
========================================= */

export const patientApi = {
  list: () => api.get("/patients"),

  getById: (id: string) =>
    api.get(`/patients/${id}`),

  create: (data: any) =>
    api.post("/patients", data),

  update: (id: string, data: any) =>
    api.put(`/patients/${id}`, data),

  remove: (id: string) =>
    api.delete(`/patients/${id}`),
};