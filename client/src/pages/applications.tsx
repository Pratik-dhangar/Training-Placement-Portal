import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Job, Application } from "@shared/schema";
import { Navbar } from "@/components/nav/navbar";

export default function Applications() {
  const { user } = useAuth();

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/user"],
  });

  if (applicationsLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">My Applications</h2>
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
  );
}
