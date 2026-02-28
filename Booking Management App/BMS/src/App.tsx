import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Providers from "./pages/Providers";
import ProviderDetail from "./pages/ProviderDetail";
import BookingConfirm from "./pages/BookingConfirm";
import UserDashboard from "./pages/dashboard/UserDashboard";
import UserProfile from "./pages/dashboard/UserProfile";
import ProviderDashboard from "./pages/dashboard/ProviderDashboard";
import ProviderProfile from "./pages/dashboard/ProviderProfile";
import ProviderAvailability from "./pages/dashboard/ProviderAvailability";
import ProviderSettings from "./pages/dashboard/ProviderSettings";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import GoogleCalendarCallback from "./pages/auth/GoogleCalendarCallback";
import BlockedAccount from "./pages/BlockedAccount";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import Rewards from "./pages/Rewards";
import Favorites from "./pages/Favorites";
import Analytics from "./pages/Analytics";
import Compare from "./pages/Compare";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/providers/:id" element={<ProviderDetail />} />
              <Route path="/booking/confirm" element={<BookingConfirm />} />
              <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
              <Route path="/blocked" element={<BlockedAccount />} />
              
              {/* Protected Feature Routes */}
              <Route path="/messages" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><Messages /></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><Rewards /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><Favorites /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><Analytics /></ProtectedRoute>} />
              <Route path="/compare" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><Compare /></ProtectedRoute>} />
              
              {/* Protected User Routes */}
              <Route path="/dashboard/user" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><UserDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/user/profile" element={<ProtectedRoute allowedRoles={["user", "provider", "admin"]}><UserProfile /></ProtectedRoute>} />
              
              {/* Protected Provider Routes */}
              <Route path="/dashboard/provider" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/provider/profile" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderProfile /></ProtectedRoute>} />
              <Route path="/dashboard/provider/availability" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderAvailability /></ProtectedRoute>} />
              <Route path="/dashboard/provider/settings" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderSettings /></ProtectedRoute>} />
              
              {/* Protected Admin Routes */}
              <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
