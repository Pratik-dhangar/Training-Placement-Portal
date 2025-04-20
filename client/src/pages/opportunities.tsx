import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Upload,
  Building2,
  Calendar,
  MapPin,
  BadgeCheck,
  Clock,
  User,
  BriefcaseBusiness,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";
import { Navbar } from "@/components/nav/navbar";
import { useState } from "react";

// Define an extended type for Job that may include skills
interface ExtendedJob extends Omit<Job, 'salary' | 'imagePath'> {
  skills?: string;
  salary: string | null;
  imagePath: string | null;
}

// Define Application type for tracking applied jobs
interface Application {
  id: number;
  jobId: number;
  userId: number;
  status: "pending" | "accepted" | "rejected";
}

// Helper function to correct image paths
const getImageUrl = (imagePath: string | null | undefined): string | undefined => {
  if (!imagePath) return undefined;
  
  // If the path already contains "job-images", use it as is
  if (imagePath.includes('job-images')) {
    return `/uploads/${imagePath.replace(/^uploads[\\\/]/, '')}`;
  }
  
  // Otherwise, assume it's just the filename and add the job-images path
  return `/uploads/job-images/${imagePath.replace(/^uploads[\\\/]job-images[\\\/]/, '')}`;
};

export default function Opportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<ExtendedJob | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery<ExtendedJob[]>({
    queryKey: ["/api/jobs"],
  });

  // Fetch user's applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications/user", user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 10000, // Re-fetch after 10 seconds
  });

  // Check if user has already applied to a job
  const hasApplied = (jobId: number) => {
    if (!applications || !user) return false;
    return applications.some(app => app.jobId === jobId && app.userId === user.id) || false;
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Resume must be under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Resume must be PDF, DOC, DOCX, or JPEG",
        variant: "destructive",
      });
      return;
    }

    // Valid file, set it
    setResumeFile(file);
    toast({
      title: "Resume selected",
      description: `Selected: ${file.name}`,
    });
  };

  const handleApply = async (jobId: number) => {
    if (!resumeFile) {
      toast({
        title: "Resume required",
        description: "Please upload your resume before applying",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Attempting to apply to job ID:", jobId);
      console.log("Resume file:", resumeFile.name, resumeFile.type, resumeFile.size);
      
      const formData = new FormData();
      formData.append("jobId", jobId.toString());
      formData.append("resume", resumeFile);

      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Application submission error:", errorText);
        throw new Error(errorText || "Failed to submit application");
      }

      const data = await res.json();
      console.log("Application submitted successfully:", data);
      
      queryClient.invalidateQueries({ queryKey: ["/api/applications/user"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully",
      });

      // Reset state after successful submission
      setResumeFile(null);
      setSelectedJobId(null);
      setDialogOpen(false); // Close the dialog after successful submission
    } catch (error) {
      console.error("Error applying to job:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewJob = (job: ExtendedJob) => {
    setSelectedJob(job);
    setDialogOpen(true);
    setSelectedJobId(job.id);
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
      <Navbar />

      {/* Detailed Job View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white w-4 z-10 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BriefcaseBusiness className="h-6 w-6" />
              {selectedJob?.title}
            </DialogTitle>
            {/* <button 
              onClick={() => setDialogOpen(false)} 
              className="absolute top-4 right-4 rounded-full p-1 hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button> */}
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4 pt-4">
              {/* Company Image */}
              {selectedJob.imagePath && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={getImageUrl(selectedJob.imagePath)}
                    alt={`${selectedJob.company} logo`} 
                    className="max-h-40 object-contain rounded-md"
                    onError={(e) => {
                      // Hide the image if it fails to load
                      e.currentTarget.style.display = 'none';
                      console.log('Image failed to load:', selectedJob.imagePath);
                    }}
                  />
                </div>
              )}
            
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-5 w-5" />
                <span className="font-medium text-lg">
                  {selectedJob.company}
                </span>
              </div>

              {/* Application Status Badge */}
              {hasApplied(selectedJob.id) && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    You've already applied for this job
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-md">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{selectedJob.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {selectedJob.type === "fulltime"
                      ? "Full Time"
                      : "Internship"}
                  </span>
                </div>
                {/* Salary information if available */}
                {selectedJob.salary && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 18V6"/>
                    </svg>
                    <span>Salary: {selectedJob.salary}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Posted:{" "}
                    {selectedJob.createdAt &&
                      new Date(selectedJob.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Status: {hasApplied(selectedJob.id) ? "Applied" : "Open"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Job Description</h3>
                <p className="text-gray-700 whitespace-pre-line bg-white p-4 rounded-md border">
                  {selectedJob.description}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Requirements</h3>
                <p className="text-gray-700 whitespace-pre-line bg-white p-4 rounded-md border">
                  {selectedJob.requirements}
                </p>
              </div>

              {/* Resume upload and apply button section - only show if not already applied */}
              {!hasApplied(selectedJob.id) && (
                <div className="pt-4 border-t mt-6 bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold text-lg mb-4">Apply for this position</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resume-upload" className="block mb-2">
                        Upload Resume (PDF, DOC, DOCX)
                      </Label>
                      <Input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="bg-white"
                      />
                      {resumeFile && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {resumeFile.name} selected
                        </p>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="w-full bg-[#9f1c33] hover:bg-[#8a1a2d] transition-colors"
                        onClick={() => handleApply(selectedJob.id)}
                        disabled={!resumeFile}
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Job Opportunities</h1>

        {jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                {job.imagePath ? (
                  <div className="h-40 overflow-hidden bg-gray-100 flex items-center justify-center p-4 border-b">
                    <img 
                      src={getImageUrl(job.imagePath)}
                      alt={`${job.company} logo`} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        console.log('Image failed to load:', job.imagePath);
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-40 overflow-hidden bg-gray-100 flex items-center justify-center p-4 border-b">
                    <div className="text-gray-400 flex flex-col items-center">
                      <Building2 className="h-12 w-12 mb-2" />
                      <span className="text-sm">{job.company}</span>
                    </div>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold line-clamp-1">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.company}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                      {job.type === "fulltime" ? "Full Time" : "Internship"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-2">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px]">{job.location}</span>
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                          <path d="M12 18V6"/>
                        </svg>
                        <span className="truncate max-w-[100px]">{job.salary}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full bg-[#9f1c33] hover:bg-[#8a1a2d] transition-colors"
                    onClick={() => handleViewJob(job)}
                    disabled={user.role !== "student"}
                  >
                    {hasApplied(job.id) ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Applied
                      </span>
                    ) : (
                      "View Details"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 rounded-lg">
            <BriefcaseBusiness className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Job Listings Available</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              There are currently no job opportunities available. Please check back later for new postings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
