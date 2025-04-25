import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Linkedin, Github, Instagram, Upload, Image, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/nav/navbar";

export default function PersonalDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    phone: user?.phone || "",
    email: user?.email || "",
    address: "",
    linkedin: "",
    github: "",
    socialMedia: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch existing personal details
  const { data: personalDetails, isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/personal-details`, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest("GET", `/api/users/${user.id}/personal-details`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Update form data when details are fetched
  useEffect(() => {
    if (personalDetails && Object.keys(personalDetails).length > 0) {
      setFormData({
        phone: personalDetails.phone || user?.phone || "",
        email: personalDetails.email || user?.email || "",
        address: personalDetails.address || "",
        linkedin: personalDetails.linkedin || "",
        github: personalDetails.github || "",
        socialMedia: personalDetails.socialMedia || ""
      });

      // If there's an existing image path, set the preview
      if (personalDetails.imagePath) {
        console.log("Found image path:", personalDetails.imagePath);
        
        // Normalize path separators
        const normalizedPath = personalDetails.imagePath.replace(/\\/g, '/');
        console.log("Normalized path:", normalizedPath);
        
        // Handle different path formats
        let imageUrl;
        if (normalizedPath.includes('/uploads/')) {
          const pathAfterUploads = normalizedPath.split('/uploads/')[1];
          imageUrl = `/uploads/${pathAfterUploads}`;
        } else if (normalizedPath.includes('/student-photos/')) {
          const parts = normalizedPath.split('/student-photos/');
          imageUrl = `/uploads/student-photos/${parts[1]}`;
        } else {
          // For cases where the path is just a filename or partial path
          const filename = normalizedPath.split('/').pop() || normalizedPath;
          imageUrl = `/uploads/student-photos/${filename}`;
        }
        
        console.log("Setting photo preview to:", imageUrl);
        setPhotoPreview(imageUrl);
      }
    }
  }, [personalDetails, user]);

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG or PNG image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Photo must be under 2MB",
        variant: "destructive",
      });
      return;
    }

    // Save the file for upload
    setPhotoFile(file);
    console.log("Photo selected for upload:", file.name, file.type, file.size);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Create FormData to handle file upload
      const formData = new FormData();
      
      // Add all text fields
      formData.append('phone', data.phone);
      formData.append('email', data.email);
      if (data.address) formData.append('address', data.address);
      if (data.linkedin) formData.append('linkedin', data.linkedin);
      if (data.github) formData.append('github', data.github);
      if (data.socialMedia) formData.append('socialMedia', data.socialMedia);
      
      // Add the photo file if selected
      if (photoFile) {
        console.log("Attaching photo to request:", photoFile.name);
        formData.append('studentPhoto', photoFile);
      }
      
      console.log("Submitting form data with", photoFile ? "photo" : "no photo");
      
      const res = await fetch(`/api/users/${user?.id}/personal-details`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error updating personal details:", errorText);
        throw new Error(errorText || 'Failed to update personal details');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Personal details updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/personal-details`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Details Updated",
        description: "Your personal details have been updated successfully.",
      });
      
      // Clear the photo file after successful upload
      if (photoFile) {
        console.log("Photo uploaded successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to update personal details:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating your personal details. Please try again.",
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
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Update your contact information to be visible to recruiters and the placement team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(formData);
              }}
              className="space-y-4"
              encType="multipart/form-data"
            >
              {/* Photo Upload Section */}
              <div className="mb-6">
                <Label htmlFor="photo" className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4" />
                  Passport Photo
                </Label>
                <div className="flex items-center gap-4">
                  <div className="border rounded-md overflow-hidden w-32 h-40 flex items-center justify-center bg-gray-50">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-gray-400">
                        <Image className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-xs">No photo</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="border-2 border-dashed rounded-md p-4">
                      <label 
                        htmlFor="photo" 
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="h-6 w-6 text-gray-500 mb-2" />
                        <span className="text-sm text-gray-500">
                          Click to upload passport photo
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          JPG or PNG, max 2MB
                        </span>
                        <input 
                          type="file" 
                          id="photo" 
                          accept="image/jpeg,image/png,image/jpg" 
                          className="hidden" 
                          onChange={handlePhotoChange}
                        />
                      </label>
                    </div>
                    {photoFile && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {photoFile.name} selected
                      </p>
                    )}
                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <p>Upload a passport-sized photo with clear face visibility for identification purposes.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your full address"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub Profile
                  </Label>
                  <Input
                    id="github"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="socialMedia" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Social Media (Instagram/Facebook)
                </Label>
                <Input
                  id="socialMedia"
                  value={formData.socialMedia}
                  onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                  placeholder="https://instagram.com/yourusername or https://facebook.com/yourusername"
                />
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="mt-4 bg-[#9f1c33]">
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
