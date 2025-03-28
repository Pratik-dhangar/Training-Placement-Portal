import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "student" as "student" | "admin",
      fullName: "",
      email: "",
      phone: "",
    },
  });

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        backgroundImage: 'url("/Home.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center 10%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Semi-transparent overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-25"></div>
      
      {/* Content container */}
      <div className="w-full h-full flex flex-col items-center z-10 relative">
        {/* Main heading at the top center */}
        <div className="w-full text-center mb-2 pt-8">
          <h1 className="text-5xl font-bold text-white">
            Training & Placement Portal
          </h1>
        </div>

        {/* Content area */}
        <div className="w-full max-w-7xl flex flex-col items-start px-4 md:px-8 flex-grow">
          {/* Login/Register card on the left */}
          <div className="w-full md:w-1/3 md:ml-28 mt-10">
            <Card className="w-full backdrop-blur-lg bg-black/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Welcome</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Username</FormLabel>
                              <Input {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Password</FormLabel>
                              <Input type="password" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full bg-white text-black hover:bg-blue-600 hover:text-white transition-colors"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? "Logging in..." : "Login"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register">
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Full Name</FormLabel>
                              <Input {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Username</FormLabel>
                              <Input {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Password</FormLabel>
                              <Input type="password" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Email</FormLabel>
                              <Input type="email" {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Phone</FormLabel>
                              <Input {...field} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Role</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full bg-white text-black hover:bg-blue-600 hover:text-white transition-colors"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? "Registering..." : "Register"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Description text at the bottom */}
        <div className="max-w-lg text-center my-28">
          <p className="text-lg text-white font-medium">
            Connect with top companies and find your dream job through our comprehensive placement platform.
          </p>
        </div>
      </div>
    </div>
  );
}