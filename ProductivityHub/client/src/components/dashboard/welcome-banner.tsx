import React from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

export function WelcomeBanner() {
  const { data: session } = useQuery({
    queryKey: ['/api/auth/session'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/trello/cards'],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const tasksCount = Array.isArray(tasks) ? tasks.length : 0;
  const userName = session?.user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white p-6 rounded-lg mb-6 shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Welcome back, {userName}</h1>
          <p className="opacity-80">
            You have {tasksCount} {tasksCount === 1 ? 'task' : 'tasks'} due today across your connected apps.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button variant="secondary" className="bg-white text-primary-700 hover:bg-white/90">
            View All Tasks
          </Button>
        </div>
      </div>
    </div>
  );
}
