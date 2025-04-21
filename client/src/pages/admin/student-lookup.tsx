import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, GraduationCap, Link as LinkIcon, Github, Instagram } from "lucide-react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/nav/navbar";
import { useToast } from "@/hooks/use-toast";

export interface StudentDetails {
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  };
  academic?: {
    course: string;
    branch: string;
    semester: string;
    academicYear: string;
    percentage: string;
    armietPin: string;
    previousSemesterGrades: string;
    backlogs: string;
    updatedAt: string;
  };
  personal?: {
    phone: string;
    email: string;
    address: string;
    linkedin: string;
    github: string;
    socialMedia: string;
    updatedAt: string;
  };
}

export default function StudentLookupPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState<"username" | "id">("username");
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Use useEffect for navigation to avoid React state update during render
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "Only administrators can access this page",
          variant: "destructive",
        });
        setLocation("/");
      }
    } else if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation, toast]);

  const lookupMutation = useMutation({
    mutationFn: async () => {
      // Check if authenticated
      if (!user || user.role !== 'admin') {
        throw new Error('You must be logged in as an admin to use this feature');
      }
      
      setIsSearching(true);
      const queryParam = searchType === "id" ? "userId" : "username";
      try {
        console.log("Making request with auth user:", user);
        const res = await apiRequest(
          "GET", 
          `/api/admin/student-lookup?${queryParam}=${encodeURIComponent(searchInput)}`
        );
        
        // Check response before parsing
        console.log("Response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Error response:", errorData);
          throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      } catch (error) {
        console.error("Error looking up student:", error);
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    onSuccess: (data) => {
      setStudentDetails(data);
      toast({
        title: "Student Found",
        description: `Details retrieved for ${data.user.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lookup Failed",
        description: error.message || "Failed to find student details",
        variant: "destructive",
      });
      setStudentDetails(null);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student username or ID",
        variant: "destructive",
      });
      return;
    }
    lookupMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Student Lookup</CardTitle>
            <CardDescription>
              Search for a specific student by username or ID to view their complete details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Tabs 
                      defaultValue="username" 
                      value={searchType}
                      onValueChange={(value) => setSearchType(value as "username" | "id")}
                      className="w-full mb-4"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="username">Search by Username</TabsTrigger>
                        <TabsTrigger value="id">Search by ID</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={searchType === "username" ? "Enter student username" : "Enter student ID"}
                        className="pl-10"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        type={searchType === "id" ? "number" : "text"}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="bg-[#9f1c33]" disabled={isSearching || !searchInput.trim()}>
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {studentDetails && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Student Details</h3>
                
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center">
                      <User className="h-5 w-5 mr-2 text-primary" />
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{studentDetails.user.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Username</p>
                        <p className="font-medium">{studentDetails.user.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{studentDetails.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{studentDetails.user.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ID</p>
                        <p className="font-medium">{studentDetails.user.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {studentDetails.personal && (
                  <Card className="mb-6">
                    <CardHeader>
                      <div className="flex items-center">
                        <User className="h-5 w-5 mr-2 text-primary" />
                        <CardTitle className="text-lg">Additional Personal Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{studentDetails.personal.address || "Not provided"}</p>
                        </div>
                        {studentDetails.personal.linkedin && (
                          <div>
                            <p className="text-sm text-muted-foreground">LinkedIn</p>
                            <a 
                              href={studentDetails.personal.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline flex items-center"
                            >
                              {studentDetails.personal.linkedin}
                              <LinkIcon className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                        {studentDetails.personal.github && (
                          <div>
                            <p className="text-sm text-muted-foreground">GitHub</p>
                            <a 
                              href={studentDetails.personal.github} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline flex items-center"
                            >
                              {studentDetails.personal.github}
                              <Github className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                        {studentDetails.personal.socialMedia && (
                          <div>
                            <p className="text-sm text-muted-foreground">Social Media</p>
                            <a 
                              href={studentDetails.personal.socialMedia} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline flex items-center"
                            >
                              {studentDetails.personal.socialMedia}
                              <Instagram className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="font-medium">
                            {studentDetails.personal.updatedAt 
                              ? new Date(studentDetails.personal.updatedAt).toLocaleString() 
                              : "Never updated"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {studentDetails.academic && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                        <CardTitle className="text-lg">Academic Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Course</p>
                          <p className="font-medium">{studentDetails.academic.course || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Branch</p>
                          <p className="font-medium">{studentDetails.academic.branch || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Semester</p>
                          <p className="font-medium">{studentDetails.academic.semester || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Academic Year</p>
                          <p className="font-medium">{studentDetails.academic.academicYear || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Percentage/CGPA</p>
                          <p className="font-medium">{studentDetails.academic.percentage || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ARMIET PIN</p>
                          <p className="font-medium">{studentDetails.academic.armietPin || "Not provided"}</p>
                        </div>
                        {studentDetails.academic.previousSemesterGrades && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Previous Semester Grades</p>
                            <p className="font-medium whitespace-pre-line">{studentDetails.academic.previousSemesterGrades}</p>
                          </div>
                        )}
                        {studentDetails.academic.backlogs && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Backlogs/ATKT</p>
                            <p className="font-medium whitespace-pre-line">{studentDetails.academic.backlogs}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="font-medium">
                            {studentDetails.academic.updatedAt 
                              ? new Date(studentDetails.academic.updatedAt).toLocaleString() 
                              : "Never updated"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!studentDetails.academic && !studentDetails.personal && (
                  <div className="text-center py-6 text-muted-foreground">
                    This student hasn't provided any academic or additional personal details yet.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 