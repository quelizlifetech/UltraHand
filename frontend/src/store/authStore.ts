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
}

/* ------------------------------------
   STORE TYPE
------------------------------------- */
interface AuthState {
  user: AuthUser | null;

  loading: boolean;
  initialized: boolean;

  loginDoctor: (
    email: string,
    password: string
  ) => Promise<void>;

  loginPatient: (
    phone: string,
    password: string
  ) => Promise<void>;

  fetchMe: () => Promise<void>;

  logout: () => void;
}

/* ------------------------------------
   STORE
------------------------------------- */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,

      loading: false,
      initialized: false,

      /* --------------------------
         DOCTOR LOGIN
      --------------------------- */
      loginDoctor: async (
        email,
        password
      ) => {
        try {
          set({ loading: true });

          const res = await authApi.loginDoctor({
            email,
            password,
          });

          setToken(res.token);

          set({
            user: res.user,
            loading: false,
            initialized: true,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      /* --------------------------
         PATIENT LOGIN
      --------------------------- */
      loginPatient: async (
        phone,
        password
      ) => {
        try {
          set({ loading: true });

          const res = await authApi.loginPatient({
            phone,
            password,
          });

          setToken(res.token);

          set({
            user: res.user,
            loading: false,
            initialized: true,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      /* --------------------------
         GET CURRENT USER
      --------------------------- */
      fetchMe: async () => {
        try {
          const res = await authApi.me();

          set({
            user: res.user,
            initialized: true,
          });
        } catch {
          removeToken();

          set({
            user: null,
            initialized: true,
          });
        }
      },

      /* --------------------------
         LOGOUT
      --------------------------- */
      logout: () => {
        removeToken();

        set({
          user: null,
          initialized: true,
        });
      },
    }),
    {
      name: "ultrahand-auth",
    }
  )
);