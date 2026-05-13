const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/* =========================================
   TOKEN HELPERS
========================================= */

const TOKEN_KEY =
  "ultrahand-token";

export function getToken():
  | string
  | null {
  return localStorage.getItem(
    TOKEN_KEY
  );
}

export function setToken(
  token: string
): void {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );
}

export function removeToken(): void {
  localStorage.removeItem(
    TOKEN_KEY
  );
}

/* =========================================
   TRANSFORM → FRONTEND → ML FORMAT
========================================= */

function transformPatientToML(
  data: any
) {
  return {
    ...data,

    diagnosis:
      String(
        data.diagnosis
      ),

    category:
      String(
        data.category
      ),

    ml_input: {
      ...data.ml_input,

      therapy_mode:
        String(
          data.ml_input
            ?.therapy_mode
        ),

      joints: {
        ...data.ml_input
          ?.joints,
      },
    },
  };
}

/* =========================================
   NORMALIZE ANALYTICS
========================================= */

function normalizeAnalytics(
  analytics: any
) {
  if (!analytics)
    return null;

  return {
    ...analytics,

    /* =====================
       SUMMARY
    ===================== */
    summary: {
      estimated_days:
        analytics.summary
          ?.estimated_days ??
        analytics.summary
          ?.estimatedDays ??
        analytics.metrics
          ?.estimated_days ??
        0,

      recovery_percent:
        analytics.summary
          ?.recovery_percent ??
        analytics.summary
          ?.recoveryPercent ??
        analytics.metrics
          ?.recovery_percent ??
        0,

      success_chance:
        analytics.summary
          ?.success_chance ??
        analytics.summary
          ?.successChance ??
        analytics.metrics
          ?.success_chance ??
        0,

      risk_level:
        analytics.summary
          ?.risk_level ??
        analytics.summary
          ?.riskLevel ??
        analytics.metrics
          ?.risk_level ??
        "Unknown",
    },

    /* =====================
       RECOVERY CURVE
    ===================== */
    recovery_curve:
      analytics
        ?.recovery_curve ||
      analytics
        ?.recoveryCurve ||
      analytics
        ?.rom_prediction ||
      [],

    /* =====================
       DAYWISE REPORT
    ===================== */
    daywise_plan:
      analytics
        ?.daywise_plan ||
      analytics
        ?.daywisePlan ||
      analytics
        ?.daily_report ||
      [],

    /* =====================
       JOINT ANALYSIS
    ===================== */
    joint_analysis:
      analytics
        ?.joint_analysis ||
      analytics
        ?.jointAnalysis ||
      analytics
        ?.joint_improvement ||
      [],

    /* =====================
       THERAPY MODES
    ===================== */
    mode_distribution:
      analytics
        ?.mode_distribution ||
      analytics
        ?.modeDistribution ||
      analytics
        ?.therapy_phase_split ||
      {},

    /* =====================
       SESSION PLAN
    ===================== */
    session_plan:
      analytics
        ?.session_plan ||
      analytics
        ?.sessionPlan ||
      [],

    /* =====================
       FATIGUE
    ===================== */
    fatigue_summary:
      analytics
        ?.fatigue_summary ||
      analytics
        ?.fatigueSummary ||
      {},

    /* =====================
       ROM FORECAST
    ===================== */
    rom_prediction:
      analytics
        ?.rom_prediction ||
      analytics
        ?.romPrediction ||
      [],

    /* =====================
       WARNINGS
    ===================== */
    warnings:
      analytics
        ?.warnings ||
      [],

    /* =====================
       RAW
    ===================== */
    raw: analytics,
  };
}

/* =========================================
   RESPONSE NORMALIZER
========================================= */

function normalizeResponse(
  data: any
) {
  if (!data)
    return data;

  const normalized = {
    ...data,
  };

  /* =====================================
     DIRECT PLAN
  ===================================== */

  if (
    normalized.aiReport
  ) {
    normalized.aiReport =
      normalizeAnalytics(
        normalized.aiReport
      );
  }

  /* =====================================
     PLAN.aiReport
  ===================================== */

  if (
    normalized.plan
      ?.aiReport
  ) {
    normalized.plan.aiReport =
      normalizeAnalytics(
        normalized.plan
          .aiReport
      );
  }

  /* =====================================
     PATIENT PLANS
  ===================================== */

  if (
    normalized.patient
      ?.plans
  ) {
    normalized.patient.plans =
      normalized.patient.plans.map(
        (plan: any) => ({
          ...plan,

          aiReport:
            normalizeAnalytics(
              plan.aiReport
            ),
        })
      );
  }

  /* =====================================
     RAW ANALYTICS
  ===================================== */

  if (
    normalized.analytics
  ) {
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

async function request<
  T = any
>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    data,
    auth = true,
  } = options;

  const token =
    getToken();

  const headers: Record<
    string,
    string
  > = {
    Accept:
      "application/json",
  };

  if (data) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }

  if (auth && token) {
    headers[
      "Authorization"
    ] = `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${BASE_URL}${endpoint}`,
      {
        method,
        headers,

        body: data
          ? JSON.stringify(
              data
            )
          : undefined,
      }
    );

  let result: any =
    null;

  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    result =
      await response.json();
  } else {
    result =
      await response.text();
  }

  if (
    response.status ===
    401
  ) {
    removeToken();
  }

  if (!response.ok) {
    const message =
      result?.error ||
      result?.message ||
      `Request failed (${response.status})`;

    throw new Error(
      message
    );
  }

  return normalizeResponse(
    result
  );
}

/* =========================================
   API METHODS
========================================= */

export const api = {
  get: <T = any>(
    url: string,
    auth = true
  ) =>
    request<T>(url, {
      method: "GET",
      auth,
    }),

  post: <T = any>(
    url: string,
    data?: any,
    auth = true
  ) => {
    if (
      url === "/patients"
    ) {
      data =
        transformPatientToML(
          data
        );
    }

    return request<T>(
      url,
      {
        method: "POST",
        data,
        auth,
      }
    );
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
  registerDoctor: (
    data: {
      name: string;
      email: string;
      password: string;
    }
  ) =>
    api.post(
      "/auth/register-doctor",
      data,
      false
    ),

  loginDoctor: (
    data: {
      email: string;
      password: string;
    }
  ) =>
    api.post(
      "/auth/login",
      data,
      false
    ),

  loginPatient: (
    data: {
      phone: string;
      password: string;
    }
  ) =>
    api.post(
      "/auth/login",
      data,
      false
    ),

  me: () =>
    api.get("/auth/me"),
};

/* =========================================
   PATIENT API
========================================= */

export const patientApi = {
  list: () =>
    api.get("/patients"),

  getById: (
    id: string
  ) =>
    api.get(
      `/patients/${id}`
    ),

  create: (data: any) =>
    api.post(
      "/patients",
      data
    ),

  update: (
    id: string,
    data: any
  ) =>
    api.put(
      `/patients/${id}`,
      data
    ),

  remove: (
    id: string
  ) =>
    api.delete(
      `/patients/${id}`
    ),
};