import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      try {
        const res = await apiRequest('POST', '/api/auth/login', data);
        
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Login failed');
          } else {
            const text = await res.text();
            throw new Error(text || 'Login failed');
          }
        }
        
        return await res.json();
      } catch (error: any) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Logged in successfully',
        description: 'Welcome to Productivity Hub',
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Login error in component:', error);
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-primary-700 text-white p-2 rounded">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Log in to your Productivity Hub account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Don't have an account?{' '}
            <Link href="/register">
              <span className="text-primary hover:underline cursor-pointer">Sign up</span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
