import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";

function App() {
  const [location, setLocation] = useLocation();
  
  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    staleTime: 60000, // 1 minute
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        
        if (res.status === 401) {
          return { authenticated: false };
        }
        
        if (!res.ok) {
          throw new Error('Failed to check authentication status');
        }
        
        return await res.json();
      } catch (error) {
        console.error('Session check error:', error);
        return { authenticated: false };
      }
    }
  });

  useEffect(() => {
    // If user is not authenticated and not on auth pages, redirect to login
    if (!isLoading && !session?.authenticated) {
      if (!['/login', '/register'].includes(location)) {
        setLocation('/login');
      }
    }
  }, [session, isLoading, location, setLocation]);

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
