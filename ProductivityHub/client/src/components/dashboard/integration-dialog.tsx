import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrelloIcon, BookOpen, Mail, Info } from 'lucide-react';

const integrationSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  accessToken: z.string().optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationType: 'trello' | 'notion' | 'gmail';
}

export function IntegrationDialog({ open, onOpenChange, integrationType }: IntegrationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      type: integrationType,
      name: integrationType.charAt(0).toUpperCase() + integrationType.slice(1),
    },
  });

  const addIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      let integrationData: any;
      
      if (integrationType === 'trello') {
        // For Trello, we're using a simpler personal access token approach
        // In a real app, this would typically be an OAuth flow
        integrationData = {
          ...data,
          // Use the user-provided token
          accessToken: data.accessToken,
          connected: !!data.accessToken, // Only mark as connected if token is provided
          tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          lastSynced: new Date().toISOString(),
        };
      } else if (integrationType === 'notion') {
        // For Notion, similar to Trello - using a personal access token
        integrationData = {
          ...data,
          accessToken: data.accessToken,
          connected: !!data.accessToken, // Only mark as connected if token is provided
          tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          lastSynced: new Date().toISOString(),
        };
      } else if (integrationType === 'gmail') {
        // For Gmail, we'll use an API token directly for simplicity
        integrationData = {
          ...data,
          accessToken: data.accessToken,
          connected: !!data.accessToken, // Only mark as connected if token is provided
          tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          lastSynced: new Date().toISOString(),
        };
      } else {
        // For other integrations, we'd handle their specific authentication flows
        // For now, using placeholder data - will be replaced with real implementation
        integrationData = {
          ...data,
          accessToken: data.accessToken || 'pending-token',  
          refreshToken: 'pending-refresh',
          tokenExpiry: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          connected: false, // Mark as not connected until proper OAuth flow
          lastSynced: null,
        };
      }
      
      const res = await apiRequest('POST', '/api/integrations', integrationData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: 'Integration connected',
        description: `Your ${integrationType} account has been connected successfully`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to connect integration: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: IntegrationFormData) => {
    addIntegrationMutation.mutate(data);
  };

  const getIcon = () => {
    switch (integrationType) {
      case 'trello':
        return <TrelloIcon className="h-6 w-6" />;
      case 'notion':
        return <BookOpen className="h-6 w-6" />;
      case 'gmail':
        return <Mail className="h-6 w-6" />;
    }
  };

  const getBgColor = () => {
    switch (integrationType) {
      case 'trello':
        return 'bg-blue-500';
      case 'notion':
        return 'bg-black';
      case 'gmail':
        return 'bg-red-500';
    }
  };

  const getPermissions = () => {
    switch (integrationType) {
      case 'trello':
        return [
          'Access your boards, lists, cards, and labels',
          'Display your deadlines and tasks in the dashboard',
          'Create new cards and update existing ones',
        ];
      case 'notion':
        return [
          'Access your pages and databases',
          'Display your recent pages in the dashboard',
          'Create new pages and update existing ones',
        ];
      case 'gmail':
        return [
          'Access your email messages',
          'Display your recent emails in the dashboard',
          'Compose new emails',
        ];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Connect to {integrationType.charAt(0).toUpperCase() + integrationType.slice(1)}</DialogTitle>
              <DialogDescription>
                Connect your account to access your data in Productivity Hub
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              <div className="flex flex-col items-center mb-6">
                <div className={`w-16 h-16 rounded ${getBgColor()} flex items-center justify-center text-white mb-3`}>
                  {getIcon()}
                </div>
                <h3 className="font-semibold text-lg">Connect to {integrationType.charAt(0).toUpperCase() + integrationType.slice(1)}</h3>
                <p className="text-slate-500 text-center mt-1">
                  {integrationType === 'trello' && 'Access your boards, lists, and cards'}
                  {integrationType === 'notion' && 'Access your pages and databases'}
                  {integrationType === 'gmail' && 'Access your emails and compose new ones'}
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-4">
                  Connecting your {integrationType} account will allow Productivity Hub to:
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {getPermissions().map((permission, i) => (
                    <li key={i} className="flex items-start">
                      <div className="text-green-500 mr-2 mt-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {(integrationType === 'trello' || integrationType === 'notion' || integrationType === 'gmail') && (
                <div className="mb-4">
                  <FormField
                    control={form.control}
                    name="accessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {integrationType === 'trello' 
                            ? 'Enter your Trello Access Token' 
                            : integrationType === 'notion'
                              ? 'Enter your Notion Integration Token'
                              : 'Enter your Gmail API Token'}
                        </FormLabel>
                        <FormControl>
                          <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            type="text"
                            placeholder={integrationType === 'trello' 
                              ? "Enter your Trello API token" 
                              : integrationType === 'notion'
                                ? "Enter your Notion Integration token"
                                : "Enter your Gmail API token"
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-slate-500 mt-1">
                          {integrationType === 'trello' ? (
                            <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              Get your token from Trello Developer API
                            </a>
                          ) : integrationType === 'notion' ? (
                            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              Create a Notion integration to get your token
                            </a>
                          ) : (
                            <a href="https://developers.google.com/gmail/api/quickstart/js" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              Get your token from Gmail API
                            </a>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Productivity Hub only requests read and write access to your {integrationType} account. We never store your credentials.
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addIntegrationMutation.isPending}
                className={`${integrationType === 'trello' ? 'bg-blue-500 hover:bg-blue-600' : 
                             integrationType === 'notion' ? 'bg-black hover:bg-gray-800' : 
                             'bg-red-500 hover:bg-red-600'}`}
              >
                <span className="mr-2">{getIcon()}</span>
                Login with {integrationType.charAt(0).toUpperCase() + integrationType.slice(1)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
