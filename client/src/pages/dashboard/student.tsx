import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Building2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job, Application } from "@shared/schema";

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/user"],
  });

  const applyMutation = useMutation({
    mutationFn: async ({ jobId, resume }: { jobId: number; resume: File }) => {
      const formData = new FormData();
      formData.append("jobId", jobId.toString());
      formData.append("resume", resume);

      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/user"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully",
      });
    },
  });

  const handleApply = async (jobId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await applyMutation.mutateAsync({ jobId, resume: file });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    }
  };

  if (jobsLoading || applicationsLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.fullName}</h1>
            <p className="text-gray-600">Find and apply for opportunities</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Available Opportunities</h2>
            <div className="space-y-4">
              {jobs?.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {job.title} at {job.company}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{job.description}</p>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm text-gray-600">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {job.createdAt && new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium">
                        {job.type === "fulltime" ? "Full Time" : "Internship"}
                      </span>
                    </div>
                    <div>
                      <Label htmlFor={`resume-${job.id}`} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload Resume & Apply</span>
                        </div>
                      </Label>
                      <Input
                        id={`resume-${job.id}`}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleApply(job.id, e)}
                        disabled={applications?.some((app) => app.jobId === job.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">My Applications</h2>
            <div className="space-y-4">
              {applications?.map((application) => {
                const job = jobs?.find((j) => j.id === application.jobId);
                if (!job) return null;

                return (
                  <Card key={application.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-2">{job.title}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{job.company}</span>
                        <span
                          className={`text-sm font-medium ${
                            application.status === "accepted"
                              ? "text-green-600"
                              : application.status === "rejected"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}