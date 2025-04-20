import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/nav/navbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AcademicDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    course: "",
    branch: "",
    semester: "",
    academicYear: "",
    percentage: "",
    armietPin: ""
  });

  // Fetch existing academic details
  const { data: academicDetails, isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/academic-details`, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest("GET", `/api/users/${user.id}/academic-details`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Update form data when details are fetched
  useEffect(() => {
    if (academicDetails) {
      setFormData({
        course: academicDetails.course || "",
        branch: academicDetails.branch || "",
        semester: academicDetails.semester || "",
        academicYear: academicDetails.academicYear || "",
        percentage: academicDetails.percentage || "",
        armietPin: academicDetails.armietPin || ""
      });
    }
  }, [academicDetails]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/academic-details`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/academic-details`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Details Updated",
        description: "Your academic details have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update academic details:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating your academic details. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Academic Details</CardTitle>
            <CardDescription>
              Update your academic information to be visible to recruiters and the placement team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={formData.course}
                    onValueChange={(value) => setFormData({ ...formData, course: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="degree">Degree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => setFormData({ ...formData, branch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cse">Computer Engineering</SelectItem>
                      <SelectItem value="cs">Computer Science</SelectItem>
                      <SelectItem value="it">Information Technology</SelectItem>
                      <SelectItem value="ece">Electronics & Communication</SelectItem>
                      <SelectItem value="mechanical">Mechanical Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Select
                    value={formData.academicYear}
                    onValueChange={(value) => setFormData({ ...formData, academicYear: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2020-21">2020-21</SelectItem>
                      <SelectItem value="2021-22">2021-22</SelectItem>
                      <SelectItem value="2022-23">2022-23</SelectItem>
                      <SelectItem value="2023-24">2023-24</SelectItem>
                      <SelectItem value="2024-25">2024-25</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="percentage">Current Percentage/CGPA</Label>
                  <Input
                    id="percentage"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    placeholder="e.g. 85% or 8.5 CGPA"
                  />
                </div>
                <div>
                  <Label htmlFor="armietPin">ARMIET Registration/PIN Number</Label>
                  <Input
                    id="armietPin"
                    value={formData.armietPin}
                    onChange={(e) => setFormData({ ...formData, armietPin: e.target.value })}
                    placeholder="Enter your registration number"
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="mt-6">
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Details"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
