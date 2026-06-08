import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login";
import RegisterDoctor from "./pages/RegisterDoctor";
import ForgotPassword from "./pages/ForgotPassword";

import { RoleGuard } from "@/components/RoleGuard";

import DoctorLayout from "@/components/layout/DoctorLayout";
import DoctorOverview from "./pages/doctor/Overview";
import PatientsList from "./pages/doctor/PatientsList";
import AddPatient from "./pages/doctor/AddPatient";
import PatientDetail from "./pages/doctor/PatientDetail";
import Alerts from "./pages/doctor/Alerts";
import DoctorProfileSetup from "./pages/doctor/DoctorProfileSetup";
import DoctorProfile from "./pages/doctor/DoctorProfile";

import PatientLayout from "@/components/layout/PatientLayout";
import PatientHome from "./pages/patient/Home";
import Session from "./pages/patient/Session";
import Progress from "./pages/patient/Progress";
import Medications from "./pages/patient/Medications";
import PatientProfile from "./pages/patient/PatientProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-doctor" element={<RegisterDoctor />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Doctor Profile Setup — STANDALONE (no DoctorLayout) */}
          <Route
            path="/doctor/profile-setup"
            element={
              <RoleGuard role="doctor">
                <DoctorProfileSetup />
              </RoleGuard>
            }
          />

          {/* Doctor Routes (with sidebar layout) */}
          <Route
            path="/doctor"
            element={
              <RoleGuard role="doctor">
                <DoctorLayout />
              </RoleGuard>
            }
          >
            <Route index element={<DoctorOverview />} />
            <Route path="patients" element={<PatientsList />} />
            <Route path="patients/new" element={<AddPatient />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="profile" element={<DoctorProfile />} />
          </Route>

          {/* Patient Routes */}
          <Route
            path="/patient"
            element={
              <RoleGuard role="patient">
                <PatientLayout />
              </RoleGuard>
            }
          >
            <Route index element={<PatientHome />} />
            <Route path="session" element={<Session />} />
            <Route path="progress" element={<Progress />} />
            <Route path="medications" element={<Medications />} />
            <Route path="profile" element={<PatientProfile />} />
          </Route>

          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;