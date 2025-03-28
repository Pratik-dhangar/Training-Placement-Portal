import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type Job, type Application, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

interface ApplicationWithUser extends Application {
  user: User;
}

interface JobWithApplications {
  job: Job;
  applications: ApplicationWithUser[];
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applicationsByJob, isLoading: applicationsLoading, error: applicationsError } = useQuery<JobWithApplications[]>({
    queryKey: ["/api/applications"],
  });

  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: "",
      company: "",
      location: "",
      description: "",
      requirements: "",
      type: "fulltime",
    },
  });

  const jobMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      form.reset();
      toast({
        title: "Job posted successfully",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "accepted" | "rejected";
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/applications/${id}/status`,
        { status }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application status updated",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Post New Job</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => jobMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Post Job</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <div>Loading applications...</div>
            ) : applicationsError ? (
              <div>Error loading applications: {applicationsError.toString()}</div>
            ) : !applicationsByJob || applicationsByJob.length === 0 ? (
              <div>No applications found</div>
            ) : (
              <div className="space-y-6">
                {applicationsByJob.map((jobData) => (
                  <div key={jobData.job.id} className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">
                      {jobData.job.title} - {jobData.job.company}
                    </h3>
                    
                    {jobData.applications.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No applications for this job</div>
                    ) : (
                      <div className="grid gap-4">
                        {jobData.applications.map((application) => (
                          <Card key={application.id}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Applicant: {application.user?.fullName || 'Unknown'}</p>
                                    <p>Email: {application.user?.email || 'Unknown'}</p>
                                    <p>Phone: {application.user?.phone || 'Unknown'}</p>
                                    <p>Status: {application.status || 'Unknown'}</p>
                                  </div>
                                  {application.resumePath && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(`/api/applications/resume/${application.resumePath.split('/').pop()}`, '_blank')}
                                    >
                                      View Resume
                                    </Button>
                                  )}
                                </div>
                                <div className="space-x-2">
                                  <Button
                                    onClick={() =>
                                      statusMutation.mutate({
                                        id: application.id,
                                        status: "accepted",
                                      })
                                    }
                                    disabled={application.status !== "pending"}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      statusMutation.mutate({
                                        id: application.id,
                                        status: "rejected",
                                      })
                                    }
                                    disabled={application.status !== "pending"}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
