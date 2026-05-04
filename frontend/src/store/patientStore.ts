import { create } from "zustand";
import { Patient, SessionLog, TherapyPlan } from "@/lib/types";
import { mockPatients } from "@/lib/mockData";

interface PatientState {
  patients: Patient[];
  addPatient: (p: Patient) => void;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  updatePlan: (id: string, plan: Partial<TherapyPlan>) => void;
  addSession: (id: string, s: SessionLog) => void;
  getById: (id: string) => Patient | undefined;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: mockPatients,
  addPatient: (p) => set((s) => ({ patients: [p, ...s.patients] })),
  updatePatient: (id, patch) =>
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  removePatient: (id) => set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),
  updatePlan: (id, plan) =>
    set((s) => ({
      patients: s.patients.map((p) => (p.id === id ? { ...p, plan: { ...p.plan, ...plan } } : p)),
    })),
  addSession: (id, sess) =>
    set((s) => ({
      patients: s.patients.map((p) =>
        p.id === id ? { ...p, sessions: [...p.sessions, sess] } : p
      ),
    })),
  getById: (id) => get().patients.find((p) => p.id === id),
}));
