import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Widget as WidgetType } from '@shared/schema';
import { useDnd } from '@/lib/dnd';
import { TrelloWidget } from './trello-widget';
import { NotionWidget } from './notion-widget';
import { GmailWidget } from './gmail-widget';
import { AnalyticsWidget } from './analytics-widget';
import { QuickActionsWidget } from './quick-actions-widget';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface WidgetGridProps {
  widgets: WidgetType[];
  isLoading?: boolean;
  onAddWidget?: () => void;
}

export function WidgetGrid({ widgets, isLoading, onAddWidget }: WidgetGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { DndContext, useDraggable } = useDnd();

  const updateWidgetPositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: number; position: number }) => {
      const res = await apiRequest('PUT', `/api/widgets/${id}/position`, { position });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update widget position: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updateWidgetAppearanceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { colorTheme?: string, size?: string } }) => {
      const res = await apiRequest('PATCH', `/api/widgets/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
      toast({
        title: 'Widget updated',
        description: 'Widget appearance has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update widget: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const removeWidgetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/widgets/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
      toast({
        title: 'Widget removed',
        description: 'Widget has been removed from your dashboard',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to remove widget: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleRemoveWidget = useCallback((id: number) => {
    removeWidgetMutation.mutate(id);
  }, [removeWidgetMutation]);

  const handleRefreshWidget = useCallback((id: number) => {
    // Invalidate query for specific widget type
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      if (widget.type === 'trello-tasks') {
        queryClient.invalidateQueries({ queryKey: ['/api/trello/cards'] });
      } else if (widget.type === 'notion-pages') {
        queryClient.invalidateQueries({ queryKey: ['/api/notion/pages'] });
      } else if (widget.type === 'gmail') {
        queryClient.invalidateQueries({ queryKey: ['/api/gmail/messages'] });
      }
    }
    
    toast({
      title: 'Widget refreshed',
      description: 'Widget data has been refreshed',
    });
  }, [toast, queryClient, widgets]);

  const handleEditWidget = useCallback((id: number) => {
    // Edit functionality can be added later if needed
    toast({
      title: 'Edit widget',
      description: 'Widget configuration options will appear here in a future update',
    });
  }, [toast]);

  const renderWidget = (widget: WidgetType) => {
    const { id, type, config } = widget;
    const { dragHandleProps } = useDraggable(id);

    // Extract appearance settings from config
    const widgetConfig = config as { colorTheme?: string; size?: 'normal' | 'large' } | undefined;
    const colorTheme = widgetConfig?.colorTheme || 'default';
    const size = widgetConfig?.size || 'normal';

    const commonProps = {
      id,
      onRemove: handleRemoveWidget,
      onRefresh: handleRefreshWidget,
      onEdit: handleEditWidget,
      dragHandleProps,
      colorTheme,
      size,
    };

    switch (type) {
      case 'trello-tasks':
        return <TrelloWidget key={id} {...commonProps} />;
      case 'notion-pages':
        return <NotionWidget key={id} {...commonProps} />;
      case 'gmail':
        return <GmailWidget key={id} {...commonProps} />;
      case 'analytics':
        return <AnalyticsWidget key={id} {...commonProps} />;
      case 'quick-actions':
        return <QuickActionsWidget key={id} {...commonProps} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg h-80 shadow-sm border animate-pulse opacity-50" 
          />
        ))}
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
        <p className="text-gray-500 mb-4">Add your first widget to get started</p>
        <Button 
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          onClick={onAddWidget}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Widget
        </Button>
      </div>
    );
  }

  return (
    <DndContext>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {widgets.map(widget => {
          // Check if widget should span across the full width
          const widgetConfig = widget.config as { size?: 'normal' | 'large' } | undefined;
          const isWideWidget = widgetConfig?.size === 'large';
          return (
            <div 
              key={widget.id} 
              className={isWideWidget ? 'col-span-1 md:col-span-2' : 'col-span-1'}
            >
              {renderWidget(widget)}
            </div>
          );
        })}
      </div>
      
      {/* Add Widget Button for non-empty dashboard */}
      <div className="mt-6 text-center">
        <Button 
          variant="outline"
          className="border-dashed border-2"
          onClick={onAddWidget}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Widget
        </Button>
      </div>
    </DndContext>
  );
}
