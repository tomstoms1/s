import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { WidgetGrid } from '@/components/dashboard/widget-grid';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { useQuery } from '@tanstack/react-query';
import { Widget } from '@shared/schema';

export default function Dashboard() {
  const [showAddWidget, setShowAddWidget] = useState(false);
  
  const { data: widgets, isLoading: widgetsLoading } = useQuery<Widget[]>({
    queryKey: ['/api/widgets'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Handle opening the add widget dialog
  const handleAddWidget = useCallback(() => {
    setShowAddWidget(true);
  }, []);

  return (
    <DashboardLayout title="Main Dashboard" onAddWidget={handleAddWidget}>
      <WelcomeBanner />
      
      <WidgetGrid 
        widgets={widgets || []} 
        isLoading={widgetsLoading} 
        onAddWidget={handleAddWidget}
      />
      
      <AddWidgetDialog 
        open={showAddWidget} 
        onOpenChange={setShowAddWidget} 
      />
    </DashboardLayout>
  );
}
