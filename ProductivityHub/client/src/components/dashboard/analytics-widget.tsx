import React, { useState } from 'react';
import { Widget } from './widget';
import { BarChart3, ChevronDown, ArrowUpRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface AnalyticsWidgetProps {
  id: number;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function AnalyticsWidget({ id, onRemove, onRefresh, onEdit }: AnalyticsWidgetProps) {
  const [timeFrame, setTimeFrame] = useState<'This Week' | 'Last Week' | 'This Month'>('This Week');
  
  // Simulated data for the chart - in a real app this would come from an API call
  const chartData = {
    'This Week': [
      { day: 'Mon', value: 0.8 },
      { day: 'Tue', value: 0.6 },
      { day: 'Wed', value: 1.0 },
      { day: 'Thu', value: 0.75 },
      { day: 'Fri', value: 0.4 },
      { day: 'Sat', value: 0.2 },
      { day: 'Sun', value: 0.1 },
    ],
    'Last Week': [
      { day: 'Mon', value: 0.7 },
      { day: 'Tue', value: 0.5 },
      { day: 'Wed', value: 0.8 },
      { day: 'Thu', value: 0.65 },
      { day: 'Fri', value: 0.3 },
      { day: 'Sat', value: 0.1 },
      { day: 'Sun', value: 0.05 },
    ],
    'This Month': [
      { day: 'Week 1', value: 0.65 },
      { day: 'Week 2', value: 0.8 },
      { day: 'Week 3', value: 0.85 },
      { day: 'Week 4', value: 0.7 },
    ],
  };

  const selectedData = chartData[timeFrame];
  
  const stats = {
    'This Week': {
      total: 24,
      change: 12,
      avgTime: 2.3,
      avgChange: 0.5,
      changeDirection: 'up',
      timeDirection: 'up',
    },
    'Last Week': {
      total: 21,
      change: -5,
      avgTime: 1.8,
      avgChange: -0.2,
      changeDirection: 'down',
      timeDirection: 'down',
    },
    'This Month': {
      total: 87,
      change: 22,
      avgTime: 2.1,
      avgChange: 0.3,
      changeDirection: 'up',
      timeDirection: 'up',
    },
  };

  const selectedStats = stats[timeFrame];

  return (
    <Widget
      id={id}
      title="Productivity Analytics"
      icon={<BarChart3 className="h-4 w-4" />}
      onRemove={onRemove}
      onRefresh={onRefresh}
      onEdit={onEdit}
      footer={
        <Button variant="link" className="text-primary-600 hover:text-primary-800 text-sm">
          View detailed analytics
        </Button>
      }
    >
      <div className="flex justify-between mb-4">
        <h3 className="font-medium text-sm">Tasks Completed {timeFrame}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 flex items-center space-x-1">
              <span>{timeFrame}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTimeFrame('This Week')}>
              This Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeFrame('Last Week')}>
              Last Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeFrame('This Month')}>
              This Month
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Chart Visualization */}
      <div className="h-40 flex items-end justify-between space-x-2">
        {selectedData.map((item, index) => (
          <div key={index} className="flex flex-col items-center space-y-1">
            <div 
              className={`w-10 rounded-t ${index === 2 ? 'bg-primary-500' : index === 3 ? 'bg-primary-700' : index === 0 ? 'bg-primary-100' : index === 1 ? 'bg-primary-300' : 'bg-slate-200'}`} 
              style={{ height: `${item.value * 100}%` }}
            ></div>
            <span className="text-xs text-slate-500">{item.day}</span>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-50 p-3 rounded">
          <div className="text-xs text-slate-500">Total Completed</div>
          <div className="font-bold text-xl">{selectedStats.total}</div>
          <div className={`text-xs ${selectedStats.changeDirection === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {selectedStats.changeDirection === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowUpRight className="h-3 w-3 mr-1 rotate-180" />}
            {Math.abs(selectedStats.change)}% from previous period
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded">
          <div className="text-xs text-slate-500">Avg. Completion Time</div>
          <div className="font-bold text-xl">{selectedStats.avgTime} days</div>
          <div className={`text-xs ${selectedStats.timeDirection === 'down' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {selectedStats.timeDirection === 'down' ? <ArrowUpRight className="h-3 w-3 mr-1 rotate-180" /> : <ArrowUpRight className="h-3 w-3 mr-1" />}
            {Math.abs(selectedStats.avgChange)} days {selectedStats.timeDirection === 'down' ? 'faster' : 'slower'}
          </div>
        </div>
      </div>
    </Widget>
  );
}
