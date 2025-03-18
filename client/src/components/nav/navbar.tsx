import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { User, GraduationCap, Briefcase, FileText } from "lucide-react";

export function Navbar() {
  const { user, logoutMutation } = useAuth();

  const studentLinks = [
    { href: "/", label: "Dashboard", icon: User },
    { href: "/personal-details", label: "Personal Details", icon: User },
    { href: "/academic-details", label: "Academic Details", icon: GraduationCap },
    { href: "/opportunities", label: "Opportunities", icon: Briefcase },
    { href: "/applications", label: "My Applications", icon: FileText },
  ];

  const adminLinks = [
    { href: "/", label: "Dashboard", icon: User },
    { href: "/manage-jobs", label: "Manage Jobs", icon: Briefcase },
  ];

  const links = user?.role === "admin" ? adminLinks : studentLinks;

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold">T&P Portal</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary">
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </a>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-4">
              Welcome, {user?.fullName}
            </span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
