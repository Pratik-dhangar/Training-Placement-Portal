import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { User, GraduationCap, Briefcase, FileText, ChevronDown, Settings, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logoutMutation } = useAuth();

  const studentLinks = [
    { href: "/", label: "Dashboard", icon: User },
    { href: "/opportunities", label: "Opportunities", icon: Briefcase },
    { href: "/applications", label: "My Applications", icon: FileText },
  ];

  const adminLinks = [
    { href: "/", label: "Dashboard", icon: User },
    { href: "/admin/post-job", label: "Post New Job", icon: Briefcase },
    { href: "/admin/review-jobs", label: "Review Jobs", icon: FileText },
    { href: "/admin/student-lookup", label: "Student Lookup", icon: Search },
  ];

  const links = user?.role === "admin" ? adminLinks : studentLinks;

  return (
    <nav className="bg-[#9f1c33] border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <a className="flex items-center">
                  <img 
                    src="/logo.png" 
                    alt="Training & Placement Portal Logo" 
                    className="h-12 w-auto"
                    onError={(e) => {
                      // Fallback if image doesn't load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'block';
                    }}
                  />
                  </a>
              </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:justify-center sm:items-center sm:space-x-8 sm:pl-10">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className="inline-flex items-center px-1 pt-1 text-lg font-medium text-white hover:text-primary">
                    <link.icon className="h-5 w-5 mr-2" />
                    {link.label}
                  </a>
                </Link>
              ))}
              
              {user?.role === "student" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <a className="inline-flex items-center px-1 pt-1 text-lg font-medium text-white hover:text-primary cursor-pointer">
                      <Settings className="h-5 w-5 mr-2" />
                      Profile
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </a>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/personal-details">
                        <a className="flex w-full cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Personal Details</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/academic-details">
                        <a className="flex w-full cursor-pointer">
                          <GraduationCap className="mr-2 h-4 w-4" />
                          <span>Academic Details</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-white mr-4">
              Welcome, {user?.fullName}
            </span>
            <Button variant="outline" className="hover:bg-gray-200 hover:text-black hover:border-gray-500" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}