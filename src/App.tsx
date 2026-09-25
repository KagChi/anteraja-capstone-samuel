import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ScrollToTop } from "./components/ScrollToTop";
import { SessionProvider } from "./context/SessionContext";
import { ToastProvider } from "./context/ToastContext";
import { AntrianPengecualianPage } from "./pages/admin/AntrianPengecualianPage";
import { AuditTrailPage } from "./pages/admin/AuditTrailPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { PengaturanRadiusPage } from "./pages/admin/PengaturanRadiusPage";
import { PengecualianDetailPage } from "./pages/admin/PengecualianDetailPage";
import { BuktiFotoPage } from "./pages/courier/BuktiFotoPage";
import { SuksesPage } from "./pages/courier/SuksesPage";
import { TugasPage } from "./pages/courier/TugasPage";
import { VerifikasiPage } from "./pages/courier/VerifikasiPage";
import { LandingPage } from "./pages/LandingPage";

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/courier/tugas" element={<TugasPage />} />
            <Route path="/courier/verifikasi" element={<VerifikasiPage />} />
            <Route path="/courier/bukti-foto" element={<BuktiFotoPage />} />
            <Route path="/courier/sukses" element={<SuksesPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="audit-trail" element={<AuditTrailPage />} />
              <Route
                path="antrian-pengecualian"
                element={<AntrianPengecualianPage />}
              />
              <Route
                path="pengecualian-detail"
                element={<PengecualianDetailPage />}
              />
              <Route
                path="pengaturan-radius"
                element={<PengaturanRadiusPage />}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </SessionProvider>
  );
}
