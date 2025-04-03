import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Building2, User, Eye, Pencil, Trash2, FileText, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Job, Application, User as UserType } from "@shared/schema";
import { Navbar } from "@/components/nav/navbar";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extended Application type with user information
interface ApplicationWithUser extends Application {
  user?: UserType;
}

// Type for accepted applicants that will be exported
interface AcceptedApplicant {
  id: number;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
}

export default function ReviewJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [selectedResumePath, setSelectedResumePath] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [acceptedApplicants, setAcceptedApplicants] = useState<AcceptedApplicant[]>([]);

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications, isLoading: applicationsLoading, error: applicationsError } = useQuery<ApplicationWithUser[]>({
    queryKey: ["/api/applications/job", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) {
        return [];
      }
      const response = await fetch(`/api/applications/job/${selectedJobId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch applications: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: selectedJobId !== null,
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Deleted",
        description: "The job posting has been deleted successfully.",
      });
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
    }: {
      applicationId: number;
      status: "accepted" | "rejected";
    }) => {
      const res = await apiRequest("PATCH", `/api/applications/${applicationId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/job", selectedJobId] });
      toast({
        title: "Status Updated",
        description: "Application status has been updated successfully.",
      });
    },
  });
  
  const handleViewResume = (resumePath: string) => {
    try {
      // Extract just the filename from the path if needed
      let filename = resumePath;
      if (resumePath.includes('/') || resumePath.includes('\\')) {
        const pathParts = resumePath.split(/[\/\\]/);
        filename = pathParts[pathParts.length - 1];
      }
      
      setSelectedResumePath(filename);
      setResumeDialogOpen(true);
    } catch (error) {
      console.error("Error viewing resume:", error);
      toast({
        title: "Error",
        description: "Failed to view resume",
        variant: "destructive",
      });
    }
  };

  // Function to prepare the accepted applicants list for a job
  const prepareAcceptedApplicantsList = (jobId: number) => {
    if (!applications || !jobs) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Filter accepted applications
    const acceptedList = applications
      .filter(app => app.status === "accepted" && app.jobId === jobId)
      .map(app => ({
        id: app.id,
        name: app.user?.fullName || "Unknown",
        email: app.user?.email || "No email",
        phone: app.user?.phone || "No phone",
        jobTitle: job.title,
        company: job.company
      }));

    setAcceptedApplicants(acceptedList);
    setSelectedJobId(jobId);
    setShareDialogOpen(true);
  };

  // Function to export the list as PDF
  const exportAsPDF = () => {
    if (acceptedApplicants.length === 0) {
      toast({
        title: "No accepted applicants",
        description: "There are no accepted applicants for this job.",
        variant: "destructive",
      });
      return;
    }

    // Get the job info for the title
    const job = jobs?.find(j => j.id === selectedJobId);
    
    // Create a string with the data
    let content = `Accepted Applicants for ${job?.title} at ${job?.company}\n\n`;
    content += "Name\tEmail\tPhone\n";
    
    acceptedApplicants.forEach(applicant => {
      content += `${applicant.name}\t${applicant.email}\t${applicant.phone}\n`;
    });
    
    // Create a Blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a link to download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = `accepted-applicants-${job?.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Export successful",
      description: "Applicant list has been exported to a text file.",
    });
    
    setShareDialogOpen(false);
  };

  // Function to export the list as Excel (CSV)
  const exportAsExcel = () => {
    if (acceptedApplicants.length === 0) {
      toast({
        title: "No accepted applicants",
        description: "There are no accepted applicants for this job.",
        variant: "destructive",
      });
      return;
    }

    // Get the job info for the title
    const job = jobs?.find(j => j.id === selectedJobId);
    
    // Create a CSV string
    let csv = "Name,Email,Phone\n";
    
    acceptedApplicants.forEach(applicant => {
      csv += `"${applicant.name}","${applicant.email}","${applicant.phone}"\n`;
    });
    
    // Create a Blob with the CSV content
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Create a link to download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = `accepted-applicants-${job?.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Export successful",
      description: "Applicant list has been exported to a CSV file.",
    });
    
    setShareDialogOpen(false);
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
      
      {/* Resume Viewer Dialog */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resume Viewer</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh]">
            {selectedResumePath && (
              <iframe 
                src={`/api/applications/resume/${selectedResumePath}`}
                className="w-full h-full border-0"
                title="Resume Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Share Applicants List Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Accepted Applicants List</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              {acceptedApplicants.length === 0 
                ? "There are no accepted applicants for this job yet." 
                : `Export a list of ${acceptedApplicants.length} accepted applicant(s) in your preferred format.`
              }
            </p>
            
            {acceptedApplicants.length > 0 && (
              <div className="space-y-4">
                <Tabs defaultValue="pdf" className="w-full" onValueChange={(v) => setExportFormat(v as "pdf" | "excel")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pdf">Text File</TabsTrigger>
                    <TabsTrigger value="excel">CSV/Excel</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <Button 
                  className="w-full" 
                  onClick={exportFormat === "pdf" ? exportAsPDF : exportAsExcel}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download {exportFormat === "pdf" ? "Text File" : "CSV File"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Review Posted Jobs</h2>
        <div className="space-y-4">
          {jobs?.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {job.title}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => prepareAcceptedApplicantsList(job.id)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share List
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Applications
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>
                            Applications for {job.title} 
                            {applications && applications.length > 0 && (
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                (Total: {applications.length})
                              </span>
                            )}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          {applicationsLoading ? (
                            <div className="flex justify-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin text-border" />
                            </div>
                          ) : applicationsError ? (
                            <div className="p-4 text-red-500 text-center">
                              Error loading applications: {applicationsError.toString()}
                            </div>
                          ) : applications && applications.length > 0 ? (
                            applications.map((application, index) => (
                              <div
                                key={application.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>Applicant {index + 1}</span>
                                  {application.user && (
                                    <span className="ml-2 font-medium">
                                      {application.user.fullName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewResume(application.resumePath)}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Resume
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateApplicationStatusMutation.mutate({
                                        applicationId: application.id,
                                        status: "accepted",
                                      })
                                    }
                                    disabled={application.status !== "pending"}
                                    className={application.status === "accepted" ? "bg-green-100 border-green-300 text-green-700" : ""}
                                  >
                                    {application.status === "accepted" ? "Accepted" : "Accept"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateApplicationStatusMutation.mutate({
                                        applicationId: application.id,
                                        status: "rejected",
                                      })
                                    }
                                    disabled={application.status !== "pending"}
                                    className={application.status === "rejected" ? "bg-red-100 border-red-300 text-red-700" : ""}
                                  >
                                    {application.status === "rejected" ? "Rejected" : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-500">
                              No applications found for this job
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this job?")) {
                          deleteJobMutation.mutate(job.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{job.company}</span>
                  <span className="text-sm font-medium">
                    {job.type === "fulltime" ? "Full Time" : "Internship"}
                  </span>
                  <span className="text-sm text-gray-600">{job.location}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
