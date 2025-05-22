import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signOut } = useAuth(); 
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const data = await signIn(email, password);

      if (data && data.user) {
        if (!data.user.email_confirmed_at) {
          // Email is not confirmed, sign the user out immediately
          await signOut(); 
          toast({
            title: "Email Verification Required",
            description: "Your email address has not been verified. Please check your inbox for a verification link to complete the sign-in process.",
            variant: "default", 
            duration: 7000,
          });
        } else {
          // Email is confirmed, sign-in successful
          // "Successfully logged in!" toast is now handled by useAuth hook (sonner)
          // for consistency and bottom placement.
          // Navigation to dashboard or protected route will typically be handled
          // by the AuthProvider listening to auth state changes.
        }
      } else {
        // This case handles when signIn resolves but no user is found (data.user is null)
        // or data itself is null (though less likely if no error was thrown by signIn).
        toast({
          title: "Sign In Failed",
          description: "User not found or invalid credentials. Please check your email and password.",
          variant: "destructive",
        });
      } // If signIn throws an error (e.g. wrong password), it's caught below.
    } catch (error) {
      let toastTitle = "Error signing in";
      let toastDescription = "An unexpected error occurred. Please try again.";

      if (error instanceof Error && error.message === "Invalid login credentials") {
        toastTitle = "Sign In Failed";
        toastDescription = "User not found or invalid credentials. Please check your email and password.";
      } else if (error instanceof Error) {
        toastDescription = error.message;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signUp(email, password);
    } catch (error) { // Supabase error is caught here
      // console.error("Error signing up:", error); // Removed for production clarity
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center space-x-2 mb-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Daily Zen</span>
          </div>
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">Sign in to your account or create a new one</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Enter your credentials below to sign in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Sign Up</CardTitle>
                  <CardDescription>Create a new account to get started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="text-center text-sm text-muted-foreground">
          <Link to="/" className="underline hover:text-primary">
            Back to home page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;