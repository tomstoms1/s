import React from 'react';
import { Widget } from './widget';
import { Bolt, Plus, FileText, Mail, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QuickActionsWidgetProps {
  id: number;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function QuickActionsWidget({ id, onRemove, onRefresh, onEdit }: QuickActionsWidgetProps) {
  const { toast } = useToast();
  
  const handleAction = (action: string) => {
    // This would typically open a modal or navigate to the appropriate creation page
    toast({
      title: "Action triggered",
      description: `${action} action was triggered.`,
    });
  };

  return (
    <Widget
      id={id}
      title="Quick Actions"
      icon={<Bolt className="h-4 w-4" />}
      onRemove={onRemove}
      onRefresh={onRefresh}
      onEdit={onEdit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline"
          className="flex flex-col items-center p-4 h-auto bg-slate-50 hover:bg-slate-100 border-slate-200"
          onClick={() => handleAction('Create Trello Task')}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">New Trello Task</span>
        </Button>
        
        <Button 
          variant="outline"
          className="flex flex-col items-center p-4 h-auto bg-slate-50 hover:bg-slate-100 border-slate-200"
          onClick={() => handleAction('Create Note')}
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Create Note</span>
        </Button>
        
        <Button 
          variant="outline"
          className="flex flex-col items-center p-4 h-auto bg-slate-50 hover:bg-slate-100 border-slate-200"
          onClick={() => handleAction('Compose Email')}
        >
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Compose Email</span>
        </Button>
        
        <Button 
          variant="outline"
          className="flex flex-col items-center p-4 h-auto bg-slate-50 hover:bg-slate-100 border-slate-200"
          onClick={() => handleAction('Schedule Meeting')}
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Schedule Meeting</span>
        </Button>
      </div>
    </Widget>
  );
}
