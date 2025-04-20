import { Navbar } from "@/components/nav/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLanding() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Admin Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage job postings and review applications through our comprehensive placement portal.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Post New Jobs</h2>
                <p className="text-gray-600">
                  Create and publish new job opportunities for students.
                  You can specify job details, requirements, and type.
                </p>
              </CardContent>
              
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Review Applications</h2>
                <p className="text-gray-600">
                  Review student applications, download resumes, and manage application statuses.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
