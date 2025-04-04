import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Widget } from './widget';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight, AlertCircle, Clock, FileText, Star, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  internalDate: string;
}

interface GmailWidgetProps {
  id: number;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function GmailWidget({ id, onRemove, onRefresh, onEdit }: GmailWidgetProps) {
  const [selectedView, setSelectedView] = useState<'recent' | 'unread'>('recent');
  const { toast } = useToast();
  
  // Query for fetching emails
  const { 
    data: messages = [], 
    isLoading, 
    error 
  } = useQuery<GmailMessage[]>({
    queryKey: ['/api/gmail/messages', selectedView],
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation for creating Trello cards from emails
  const createCardMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await apiRequest('POST', '/api/gmail/create-task', { emailId });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email converted to task",
        description: "The email has been successfully converted to a Trello task",
        variant: "default",
      });
      // Invalidate Trello cards query to refresh the tasks widget
      // Force immediate refetch of Trello cards
      queryClient.invalidateQueries({ queryKey: ['/api/trello/cards'] });
      queryClient.refetchQueries({ queryKey: ['/api/trello/cards'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateTask = (emailId: string) => {
    createCardMutation.mutate(emailId);
  };

  const formatDate = (dateString: string) => {
    try {
      // Gmail returns internalDate as a timestamp in milliseconds
      const date = new Date(parseInt(dateString));
      return format(date, 'MMM d, h:mm a');
    } catch (err) {
      return 'Unknown date';
    }
  };

  return (
    <Widget
      id={id}
      title="Gmail"
      icon={<Mail className="h-5 w-5" />}
      onRemove={onRemove}
      onRefresh={onRefresh}
      onEdit={onEdit}
      footer={
        <div className="flex space-x-2 mt-2">
          <Button 
            variant={selectedView === 'recent' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedView('recent')}
            className="flex-1"
          >
            Recent
          </Button>
          <Button 
            variant={selectedView === 'unread' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedView('unread')}
            className="flex-1"
          >
            Unread
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load emails</p>
            <p className="text-sm mt-1">
              Please check your Gmail integration or try again later.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            <Mail className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">No emails to display</p>
            <p className="text-sm mt-1">
              {selectedView === 'unread' 
                ? 'You have no unread emails' 
                : 'Could not fetch recent emails'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Card key={message.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="p-3 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 overflow-hidden">
                      <CardTitle className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {message.subject || '[No Subject]'}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        From: {message.from}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(message.internalDate)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {message.snippet}
                  </p>
                </CardContent>
                <CardFooter className="px-3 py-2 bg-gray-50 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${message.id}`, '_blank')}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    onClick={() => handleCreateTask(message.id)}
                    disabled={createCardMutation.isPending}
                  >
                    {createCardMutation.isPending ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3 w-3 mr-1" />
                    )}
                    Create Task
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </>
        )}
      </div>
    </Widget>
  );
}