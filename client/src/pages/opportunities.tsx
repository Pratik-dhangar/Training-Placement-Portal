import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Building2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";
import { Navbar } from "@/components/nav/navbar";

export default function Opportunities() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const handleApply = async (jobId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("jobId", jobId.toString());
    formData.append("resume", file);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      queryClient.invalidateQueries({ queryKey: ["/api/applications/user"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    }
  };

  if (jobsLoading || !user) {
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
        <h2 className="text-2xl font-bold mb-6">Available Opportunities</h2>
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
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
