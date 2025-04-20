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
import { Loader2, Linkedin } from "lucide-react";
import { Navbar } from "@/components/nav/navbar";

export default function PersonalDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    phone: user?.phone || "",
    email: user?.email || "",
    address: "",
    linkedin: ""
  });

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
        linkedin: personalDetails.linkedin || ""
      });
    }
  }, [personalDetails, user]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/personal-details`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/personal-details`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Details Updated",
        description: "Your personal details have been updated successfully.",
      });
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
            >
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
              <Button type="submit" disabled={updateMutation.isPending} className="mt-4">
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
