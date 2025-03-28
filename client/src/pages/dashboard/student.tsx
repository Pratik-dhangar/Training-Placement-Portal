import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Building2, Calendar, GraduationCap, Briefcase, FileText, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job, Application } from "@shared/schema";
import { Navbar } from "@/components/nav/navbar";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/user"],
  });

 

  return (
    <div className="min-h-screen bg-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, To Armiet Training And Placement Portal</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <User className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage your personal and academic information. Keep your profile up to date for better placement opportunities.</p>
            </CardContent>
          </Card>

          {/* Job Opportunities Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
              <Briefcase className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>Job Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Explore available job positions from top companies. Apply to positions that match your skills and interests.</p>
            </CardContent>
          </Card>

          {/* Applications Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
              <FileText className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Track the status of your job applications. View interview schedules and company responses.</p>
            </CardContent>
          </Card>

          {/* Academic Details Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
              <GraduationCap className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>Academic Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Update your academic information, including course details, grades, and achievements.</p>
            </CardContent>
          </Card>

          {/* Training Programs Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center">
              <Calendar className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>Training Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Access information about upcoming training sessions, workshops, and skill development programs.</p>
            </CardContent>
          </Card>

          {/* Company Visits Card */}
          <Card className="overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
              <Building2 className="h-24 w-24 text-white" />
            </div>
            <CardHeader>
              <CardTitle>Company Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Stay updated with scheduled company visits, campus recruitment drives, and networking events.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}