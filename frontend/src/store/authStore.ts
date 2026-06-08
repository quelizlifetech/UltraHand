import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role } from "@/lib/types";
import {
  authApi,
  setToken,
  removeToken,
} from "@/lib/api";

/* ------------------------------------
   USER TYPE
------------------------------------- */
interface AuthUser {
  id: string;
  name: string;
  role: Role;

  email?: string | null;
  phone?: string | null;

  patientId?: string;

  mustChangePassword?: boolean;
  mustSetupProfile?: boolean;
  hasDoctorProfile?: boolean;
}

/* ------------------------------------
   STORE TYPE
------------------------------------- */
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;

  loginDoctor: (email: string, password: string) => Promise<void>;
  loginPatient: (phone: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

/* ------------------------------------
   HELPERS
------------------------------------- */
function extractToken(res: any): string | null {
  if (!res) return null;
  if (typeof res.token === "string" && res.token.length > 10)
    return res.token;
  if (
    typeof res.data?.token === "string" &&
    res.data.token.length > 10
  )
    return res.data.token;
  if (
    typeof res.user?.token === "string" &&
    res.user.token.length > 10
  )
    return res.user.token;
  if (
    typeof res.accessToken === "string" &&
    res.accessToken.length > 10
  )
    return res.accessToken;
  if (typeof res.jwt === "string" && res.jwt.length > 10)
    return res.jwt;
  return null;
}

function extractUser(res: any): AuthUser | null {
  if (!res) return null;
  if (res.user && typeof res.user === "object") return res.user;
  if (res.data?.user && typeof res.data.user === "object")
    return res.data.user;
  if (res.id && res.role) return res as AuthUser;
  return null;
}

/* ------------------------------------
   STORE
------------------------------------- */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,

      /* DOCTOR LOGIN */
      loginDoctor: async (email, password) => {
        try {
          set({ loading: true });

          const res = await authApi.loginDoctor({
            email,
            password,
          });

          const token = extractToken(res);
          const user = extractUser(res);

          if (!token)
            throw new Error(
              "Login succeeded but no token in response."
            );
          if (!user)
            throw new Error(
              "Login succeeded but no user in response."
            );

          setToken(token);
          set({ user, loading: false, initialized: true });
        } catch (error) {
          console.error("❌ LOGIN ERROR:", error);
          set({ loading: false });
          throw error;
        }
      },

      /* PATIENT LOGIN */
      loginPatient: async (phone, password) => {
        try {
          set({ loading: true });

          const res = await authApi.loginPatient({
            phone,
            password,
          });

          const token = extractToken(res);
          const user = extractUser(res);

          if (!token)
            throw new Error(
              "Login succeeded but no token in response."
            );
          if (!user)
            throw new Error(
              "Login succeeded but no user in response."
            );

          setToken(token);
          set({ user, loading: false, initialized: true });
        } catch (error) {
          console.error("❌ LOGIN ERROR:", error);
          set({ loading: false });
          throw error;
        }
      },

      /* FETCH ME */
      fetchMe: async () => {
        try {
          const res = await authApi.me();
          const user = extractUser(res);
          if (!user) throw new Error("No user in /me response");
          set({ user, initialized: true });
        } catch {
          removeToken();
          set({ user: null, initialized: true });
        }
      },

      /* UPDATE USER (local patch) */
      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },

      /* LOGOUT */
      logout: () => {
        removeToken();
        set({ user: null, initialized: true });
      },
    }),
    { name: "ultrahand-auth" }
  )
);