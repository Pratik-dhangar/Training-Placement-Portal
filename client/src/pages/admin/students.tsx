import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Search, ExternalLink, User } from "lucide-react";
import { useRouter } from "next/router";
import { AdminNavbar } from "@/components/nav/admin-navbar";
import { useState } from "react";

interface StudentDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  academicDetails?: {
    course: string;
    branch: string;
    semester: string;
    academicYear: string;
    percentage: string;
    armietPin: string;
    updatedAt: string;
  };
  personalDetails?: {
    address: string;
    linkedin: string;
    imagePath: string;
    updatedAt: string;
  };
}

// Helper function to correct image paths
const getImageUrl = (imagePath: string | null | undefined): string | undefined => {
  if (!imagePath) return undefined;
  
  console.log("Original image path:", imagePath);
  
  // Normalize path separators
  const normalizedPath = imagePath.replace(/\\/g, '/');
  console.log("Normalized path:", normalizedPath);
  
  // Handle full paths that include the uploads directory
  if (normalizedPath.includes('/uploads/')) {
    const pathAfterUploads = normalizedPath.split('/uploads/')[1];
    console.log("Path after /uploads/:", pathAfterUploads);
    return `/uploads/${pathAfterUploads}`;
  }
  
  // Handle paths that are direct file paths
  if (normalizedPath.includes('/student-photos/')) {
    const parts = normalizedPath.split('/student-photos/');
    console.log("Path after /student-photos/:", parts[1]);
    return `/uploads/student-photos/${parts[1]}`;
  }
  
  // For cases where the path is just a filename or partial path
  const filename = normalizedPath.split('/').pop() || normalizedPath;
  console.log("Extracted filename:", filename);
  return `/uploads/student-photos/${filename}`;
};

export default function StudentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // If user is not an admin, redirect to the dashboard
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const { data: students, isLoading } = useQuery<StudentDetails[]>({
    queryKey: ["/api/admin/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/students");
      const data = await res.json();
      return data.students;
    },
    enabled: !!user && user.role === "admin",
  });

  const filteredStudents = students?.filter((student) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.academicDetails?.course?.toLowerCase().includes(searchLower) ||
      student.academicDetails?.branch?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    if (!students) return;
    
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Course",
      "Branch",
      "Semester",
      "Academic Year",
      "Percentage",
      "ARMIET Pin",
      "Address",
      "LinkedIn"
    ];

    const csvData = students.map((student) => [
      student.name || "",
      student.email || "",
      student.phone || "",
      student.academicDetails?.course || "",
      student.academicDetails?.branch || "",
      student.academicDetails?.semester || "",
      student.academicDetails?.academicYear || "",
      student.academicDetails?.percentage || "",
      student.academicDetails?.armietPin || "",
      student.personalDetails?.address || "",
      student.personalDetails?.linkedin || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "students_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Profiles</CardTitle>
                <CardDescription>
                  View and manage all student profiles and their details.
                </CardDescription>
              </div>
              <Button 
                onClick={exportToCSV} 
                disabled={!students || students.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, course or branch..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : !filteredStudents || filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {students && students.length > 0 
                  ? "No students match your search criteria." 
                  : "No student profiles available."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Academic Details</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          {student.personalDetails?.imagePath ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                              <img 
                                src={getImageUrl(student.personalDetails.imagePath)} 
                                alt={`${student.name}'s photo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Replace with placeholder icon if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
                              <User className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{student.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{student.email || "N/A"}</div>
                            <div>{student.phone || "N/A"}</div>
                            {student.personalDetails?.linkedin && (
                              <a 
                                href={student.personalDetails.linkedin}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                              >
                                LinkedIn <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.academicDetails ? (
                            <div>
                              <div>{student.academicDetails.course}</div>
                              <div className="text-muted-foreground text-sm">
                                {student.academicDetails.branch}
                              </div>
                            </div>
                          ) : (
                            "Not provided"
                          )}
                        </TableCell>
                        <TableCell>
                          {student.academicDetails ? (
                            <div className="space-y-1">
                              <div>Semester: {student.academicDetails.semester}</div>
                              <div>Year: {student.academicDetails.academicYear}</div>
                              <div>CGPA: {student.academicDetails.percentage}%</div>
                              <div>ARMIET PIN: {student.academicDetails.armietPin}</div>
                            </div>
                          ) : (
                            "Not provided"
                          )}
                        </TableCell>
                        <TableCell>
                          {student.academicDetails?.updatedAt 
                            ? new Date(student.academicDetails.updatedAt).toLocaleDateString() 
                            : "Never updated"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 