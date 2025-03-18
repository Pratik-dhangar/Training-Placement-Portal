import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import StudentDashboard from "@/pages/dashboard/student";
import AdminDashboard from "@/pages/dashboard/admin";
import PersonalDetails from "@/pages/personal-details";
import AcademicDetails from "@/pages/academic-details";
import Opportunities from "@/pages/opportunities";
import Applications from "@/pages/applications";
import ManageJobs from "@/pages/manage-jobs";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={({ user }) => (
        user?.role === "admin" ? <AdminDashboard /> : <StudentDashboard />
      )} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/personal-details" component={PersonalDetails} />
      <ProtectedRoute path="/academic-details" component={AcademicDetails} />
      <ProtectedRoute path="/opportunities" component={Opportunities} />
      <ProtectedRoute path="/applications" component={Applications} />
      <ProtectedRoute path="/manage-jobs" component={ManageJobs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;