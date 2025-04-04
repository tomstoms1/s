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

const registerSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      fullName: '',
      password: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      try {
        const res = await apiRequest('POST', '/api/auth/register', data);
        
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Registration failed');
          } else {
            const text = await res.text();
            throw new Error(text || 'Registration failed');
          }
        }
        
        return await res.json();
      } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Account created successfully',
        description: 'Welcome to Productivity Hub',
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Registration error in component:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'Could not create account',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
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
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Sign up for Productivity Hub to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Choose a username" {...field} />
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
                      <Input type="password" placeholder="Create a password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Already have an account?{' '}
            <Link href="/login">
              <span className="text-primary hover:underline cursor-pointer">Log in</span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
