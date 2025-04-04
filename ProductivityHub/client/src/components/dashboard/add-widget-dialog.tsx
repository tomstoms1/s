import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Integration } from '@shared/schema';
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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const widgetFormSchema = z.object({
  type: z.string().min(1, { message: 'Please select a widget type' }),
  name: z.string().min(1, { message: 'Please enter a widget name' }),
  integrationType: z.string().min(1, { message: 'Please select an integration' }),
});

type WidgetFormData = z.infer<typeof widgetFormSchema>;

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWidgetDialog({ open, onOpenChange }: AddWidgetDialogProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user's integrations to show available ones
  const { data: integrations, isLoading: integrationsLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
    enabled: open, // Only fetch when dialog is open
  });
  
  const form = useForm<WidgetFormData>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      type: '',
      name: '',
      integrationType: '',
    },
  });

  // When integration type changes, update the widget type and name based on selection
  useEffect(() => {
    const integrationType = form.watch('integrationType');
    
    if (integrationType === 'trello') {
      form.setValue('type', 'trello-tasks');
      form.setValue('name', 'Trello Tasks');
    } else if (integrationType === 'notion') {
      form.setValue('type', 'notion-pages');
      form.setValue('name', 'Notion Pages');
    } else if (integrationType === 'gmail') {
      form.setValue('type', 'gmail');
      form.setValue('name', 'Gmail Inbox');
    } else if (integrationType === 'analytics') {
      form.setValue('type', 'analytics');
      form.setValue('name', 'Analytics');
    }
  }, [form.watch('integrationType'), form]);

  const addWidgetMutation = useMutation({
    mutationFn: async (data: WidgetFormData) => {
      const widgetData = {
        type: data.type,
        name: data.name,
        config: {
          integrationType: data.integrationType,
        },
        position: 0, // Default position
        gridPosition: { x: 0, y: 0, w: 1, h: 1 },
      };
      
      const res = await apiRequest('POST', '/api/widgets', widgetData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
      toast({
        title: 'Widget added',
        description: 'Your new widget has been added to the dashboard',
      });
      form.reset();
      setStep(1);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to add widget: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: WidgetFormData) => {
    if (step === 1) {
      setStep(2);
    } else {
      addWidgetMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep(1);
    onOpenChange(false);
  };

  // Get only connected integrations
  const connectedIntegrations = integrations || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add New Widget</DialogTitle>
              <DialogDescription>
                {step === 1 
                  ? 'Select an integration and widget type to add to your dashboard.'
                  : 'Configure your widget settings.'
                }
              </DialogDescription>
            </DialogHeader>
            
            {step === 1 ? (
              <div className="grid gap-6 py-4">
                <FormField
                  control={form.control}
                  name="integrationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Integration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={integrationsLoading}>
                        <FormControl>
                          <SelectTrigger>
                            {integrationsLoading ? (
                              <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Loading...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select an integration" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Always include Trello as default since it's automatically connected */}
                          <SelectItem value="trello">Trello</SelectItem>
                          
                          {/* Only display other integrations if they are connected */}
                          {connectedIntegrations.some(i => i.type === 'notion' && i.connected) && (
                            <SelectItem value="notion">Notion</SelectItem>
                          )}
                          {connectedIntegrations.some(i => i.type === 'gmail' && i.connected) && (
                            <SelectItem value="gmail">Gmail</SelectItem>
                          )}
                          
                          {/* Analytics doesn't require integration */}
                          <SelectItem value="analytics">Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch('integrationType') && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Widget Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            {/* Only show relevant widget types based on selected integration */}
                            {form.watch('integrationType') === 'trello' && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:bg-slate-50">
                                <FormControl>
                                  <RadioGroupItem value="trello-tasks" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  Tasks & Deadlines
                                </FormLabel>
                              </FormItem>
                            )}
                            
                            {form.watch('integrationType') === 'notion' && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:bg-slate-50">
                                <FormControl>
                                  <RadioGroupItem value="notion-pages" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  Recent Items
                                </FormLabel>
                              </FormItem>
                            )}
                            
                            {form.watch('integrationType') === 'gmail' && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:bg-slate-50">
                                <FormControl>
                                  <RadioGroupItem value="gmail" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  Inbox
                                </FormLabel>
                              </FormItem>
                            )}
                            
                            {form.watch('integrationType') === 'analytics' && (
                              <FormItem className="flex items-center space-x-3 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:bg-slate-50">
                                <FormControl>
                                  <RadioGroupItem value="analytics" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  Analytics
                                </FormLabel>
                              </FormItem>
                            )}
                            
                            {/* Quick Actions widget works with any integration */}
                            <FormItem className="flex items-center space-x-3 space-y-0 border rounded-md p-3 cursor-pointer data-[state=checked]:bg-slate-50">
                              <FormControl>
                                <RadioGroupItem value="quick-actions" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Quick Actions
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            ) : (
              <div className="py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widget Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Widget" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter>
              {step === 2 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="mr-auto"
                >
                  Back
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  addWidgetMutation.isPending || 
                  (step === 1 && (!form.watch('integrationType') || !form.watch('type')))
                }
              >
                {addWidgetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === 1 ? 'Next' : 'Adding...'}
                  </>
                ) : (
                  step === 1 ? 'Next' : 'Add Widget'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
