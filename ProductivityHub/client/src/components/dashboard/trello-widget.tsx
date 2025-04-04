import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Widget } from './widget';
import { Badge } from '@/components/ui/badge';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { TrelloIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface TrelloTask {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  idBoard: string;
  idList: string;
  labels: Array<{ id: string; name: string; color: string }>;
  // These are processed fields
  status?: string;
  members?: { initials: string }[];
}

interface TrelloWidgetProps {
  id: number;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function TrelloWidget({ id, onRemove, onRefresh, onEdit }: TrelloWidgetProps) {
  const { data: tasks = [], isLoading, error, refetch } = useQuery<TrelloTask[]>({
    queryKey: ['/api/trello/cards'],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
  });

  function getDueDateStatus(dueDate: string | null): { text: string; className: string } {
    if (!dueDate) return { text: 'No date', className: 'bg-slate-100 text-slate-800' };
    
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (due < today) return { text: 'Overdue', className: 'bg-red-100 text-red-800' };
    if (due.getTime() === today.getTime()) return { text: 'Today', className: 'bg-blue-100 text-blue-800' };
    if (due.getTime() === tomorrow.getTime()) return { text: 'Tomorrow', className: 'bg-amber-100 text-amber-800' };
    
    return { text: 'Upcoming', className: 'bg-slate-100 text-slate-800' };
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'border-slate-300';
    
    switch (status.toLowerCase()) {
      case 'to do': return 'border-slate-300';
      case 'in progress': return 'border-amber-500';
      case 'done': return 'border-green-500';
      case 'urgent': return 'border-red-500';
      default: return 'border-slate-300';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-l-4 border-slate-200 bg-white p-3 rounded shadow-sm">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
              <div className="flex items-center justify-between mt-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-red-500 mb-2">Failed to load Trello tasks</p>
          <Button variant="outline" size="sm" onClick={() => onRefresh?.(id)}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!tasks || tasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center p-4">
          <TrelloIcon className="w-10 h-10 text-blue-400 mb-3" />
          <p className="text-gray-600 font-medium mb-2">No upcoming Trello tasks found</p>
          <p className="text-sm text-gray-500 mb-3">
            This widget shows tasks with due dates in the next 7 days.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-400 text-blue-500 hover:bg-blue-50"
            onClick={() => onRefresh?.(id)}
          >
            Refresh Tasks
          </Button>
        </div>
      );
    }

    return (
      <div>
        <div className="flex space-x-2 mb-4">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">All</Button>
          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">To Do</Button>
          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">In Progress</Button>
          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">Done</Button>
        </div>
        
        <ul className="space-y-3">
          {tasks.map((task: TrelloTask) => {
            const statusColor = getStatusColor(task.status);
            const dueStatus = getDueDateStatus(task.due);
            
            return (
              <li key={task.id} className={`border-l-4 ${statusColor} bg-white p-3 rounded shadow-sm`}>
                <div className="flex justify-between">
                  <h3 className="font-medium">{task.name}</h3>
                  <Badge variant="outline" className={dueStatus.className}>
                    {dueStatus.text}
                  </Badge>
                </div>
                <p className="text-slate-500 text-sm mt-1">{task.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-slate-500">
                    Due: {task.due ? new Date(task.due).toLocaleDateString() : 'No date'}
                  </div>
                  <AvatarStack 
                    avatars={task.members?.map(m => ({ fallback: m.initials })) || []}
                    size="xs"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <Widget
      id={id}
      title="Trello Tasks"
      icon={<TrelloIcon className="h-4 w-4" />}
      onRemove={onRemove}
      onRefresh={onRefresh}
      onEdit={onEdit}
      footer={
        <Button variant="link" className="text-blue-600 hover:text-blue-800 text-sm">
          Open in Trello
        </Button>
      }
    >
      {renderContent()}
    </Widget>
  );
}
