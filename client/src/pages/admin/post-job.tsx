import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/nav/navbar";
import { useState } from "react";

export default function PostJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const form = useForm<InsertJob & { salary?: string, contactDetails?: string }>({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: "",
      company: "",
      description: "",
      requirements: "",
      location: "",
      type: "fulltime",
      salary: "",
      contactDetails: "",
      imagePath: "",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob & { salary?: string, contactDetails?: string }) => {
      // Create FormData to handle file upload
      const formData = new FormData();
      
      // Add all text fields - ensure required fields are included
      formData.append('title', data.title);
      formData.append('company', data.company);
      formData.append('description', data.description);
      formData.append('requirements', data.requirements);
      formData.append('location', data.location);
      formData.append('type', data.type);
      
      // Add optional fields if they exist
      if (data.salary) {
        formData.append('salary', data.salary);
      }
      
      if (data.contactDetails) {
        formData.append('contactDetails', data.contactDetails);
      }
      
      // Add the image file if selected
      if (selectedImage) {
        formData.append('jobImage', selectedImage);
      }
      
      const res = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create job');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      form.reset();
      setSelectedImage(null);
      toast({
        title: "Job posted",
        description: "The job has been posted successfully",
      });
    },
    onError: (error) => {
      console.error('Job posting error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post job",
        variant: "destructive",
      });
    },
  });

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  // Validate form data to ensure all required fields are present
  const validateFormData = (data: InsertJob & { salary?: string, contactDetails?: string }) => {
    console.log('Validating form data:', data);
    // Check for required fields
    const requiredFields = ['title', 'company', 'description', 'requirements', 'location', 'type'] as const;
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      toast({
        title: "Missing Fields",
        description: `Please fill out all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    
    // Check for empty strings
    const emptyFields = requiredFields.filter(field => data[field] === '');
    if (emptyFields.length > 0) {
      console.error('Empty required fields:', emptyFields);
      toast({
        title: "Empty Fields",
        description: `These fields cannot be empty: ${emptyFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  // Form submission handler
  const onSubmit = (data: InsertJob & { salary?: string, contactDetails?: string }) => {
    console.log('Form submission initiated:', data);
    
    if (!validateFormData(data)) {
      return;
    }
    
    createJobMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Post New Job</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                encType="multipart/form-data"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Textarea {...field} />
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
                      <Textarea {...field} />
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
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Details</FormLabel>
                      <Textarea 
                        {...field} 
                        placeholder="Enter contact details for this job posting (email, phone, etc.)" 
                      />
                      <FormDescription>
                        Provide contact information for applicants.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <Input {...field} placeholder="e.g. 50000 or 40000-60000" />
                      <FormDescription>
                        Enter a fixed amount or a salary range.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fulltime">Full Time</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Image Upload */}
                <div className="space-y-2">
                  <FormLabel>Company Image</FormLabel>
                  <div className="flex items-center gap-4">
                    <label 
                      htmlFor="jobImage" 
                      className="cursor-pointer border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full hover:bg-gray-50"
                    >
                      <Upload className="h-6 w-6 text-gray-500 mb-2" />
                      <span className="text-sm text-gray-500">
                        {selectedImage ? selectedImage.name : "Upload company image"}
                      </span>
                      <input 
                        type="file" 
                        id="jobImage" 
                        accept="image/jpeg,image/png,image/gif" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </label>
                    
                    {selectedImage && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedImage(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    Upload a company logo or job-related image (JPG, PNG or GIF, max 2MB).
                  </FormDescription>
                </div>
                
                <Button type="submit" className="w-full bg-[#9f1c33]" disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Job"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
