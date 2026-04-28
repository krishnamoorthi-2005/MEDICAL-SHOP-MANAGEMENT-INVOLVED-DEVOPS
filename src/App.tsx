import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { UserLayout } from "@/components/layout/UserLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import FrontPage from "./pages/FrontPage";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StaffInventory from "./pages/StaffInventory";
import SubmitPrescription from "./pages/SubmitPrescription";
import Billing from "./pages/Billing";
import Customers from "./pages/Customers";
import PrescriptionRequests from "./pages/PrescriptionRequests";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Audit from "./pages/Audit";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ExpiryLossReport from "./pages/ExpiryLossReport";
import DeadStockReport from "./pages/DeadStockReport";
import TransactionLookup from "./pages/TransactionLookup";

const queryClient = new QueryClient();

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <FrontPage />
          </PublicLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PublicLayout>
            <About />
          </PublicLayout>
        }
      />
      <Route
        path="/services"
        element={
          <PublicLayout>
            <Services />
          </PublicLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicLayout>
            <Contact />
          </PublicLayout>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Protected Staff Routes */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <StaffLayout>
              <StaffDashboard />
            </StaffLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/inventory"
        element={
          <ProtectedRoute>
            <StaffLayout>
              <StaffInventory />
            </StaffLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/billing"
        element={
          <ProtectedRoute>
            <StaffLayout>
              <Billing />
            </StaffLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/transaction-lookup"
        element={
          <ProtectedRoute>
            <StaffLayout>
              <TransactionLookup />
            </StaffLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/customers"
        element={
          <ProtectedRoute>
            <StaffLayout>
              <Customers />
            </StaffLayout>
          </ProtectedRoute>
        }
      />

      {/* Patient/User Routes */}
      <Route
        path="/submit-prescription"
        element={
          <ProtectedRoute>
            <UserLayout>
              <SubmitPrescription />
            </UserLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction-lookup"
        element={
          <ProtectedRoute>
            <UserLayout>
              <TransactionLookup />
            </UserLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transaction-lookup"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <TransactionLookup />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Billing />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Customers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <PrescriptionRequests />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Inventory />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Purchases />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Audit />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Reports />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/expiry-loss"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <ExpiryLossReport />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/dead-stock"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <DeadStockReport />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Settings />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
