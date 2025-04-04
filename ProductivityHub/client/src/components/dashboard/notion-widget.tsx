import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Widget } from './widget';
import { NotionPageView } from './notion-page-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Lightbulb, Users, ListChecks, ExternalLink, ChevronRight } from 'lucide-react';

interface NotionPage {
  id: string;
  title: string;
  icon?: { type: string; emoji?: string };
  lastEditedTime: string;
  url: string;
}

interface NotionWidgetProps {
  id: number;
  onRemove?: (id: number) => void;
  onRefresh?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function NotionWidget({ id, onRemove, onRefresh, onEdit }: NotionWidgetProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  const { data: pages, isLoading, error } = useQuery<NotionPage[]>({
    queryKey: ['/api/notion/pages'],
    staleTime: 60 * 1000, // 1 minute
  });

  const handlePageClick = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const handleBackClick = () => {
    setSelectedPageId(null);
  };

  const getPageIcon = (page: NotionPage) => {
    if (page.title.includes('OKR') || page.title.includes('Planning')) {
      return <FileText className="h-4 w-4" />;
    }
    if (page.title.includes('Ideas') || page.title.includes('Brainstorm')) {
      return <Lightbulb className="h-4 w-4" />;
    }
    if (page.title.includes('Team') || page.title.includes('Meeting')) {
      return <Users className="h-4 w-4" />;
    }
    if (page.title.includes('Roadmap') || page.title.includes('Tasks')) {
      return <ListChecks className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getIconBackground = (page: NotionPage) => {
    if (page.title.includes('OKR') || page.title.includes('Planning')) {
      return 'bg-slate-200 text-slate-600';
    }
    if (page.title.includes('Ideas') || page.title.includes('Brainstorm')) {
      return 'bg-amber-100 text-amber-600';
    }
    if (page.title.includes('Team') || page.title.includes('Meeting')) {
      return 'bg-blue-100 text-blue-600';
    }
    if (page.title.includes('Roadmap') || page.title.includes('Tasks')) {
      return 'bg-green-100 text-green-600';
    }
    return 'bg-slate-200 text-slate-600';
  };

  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Updated just now';
    if (diffInHours < 2) return 'Updated 1 hour ago';
    if (diffInHours < 24) return `Updated ${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return 'Updated yesterday';
    if (diffInHours < 168) return `Updated ${Math.floor(diffInHours / 24)} days ago`;
    return `Updated ${date.toLocaleDateString()}`;
  };

  // If a page is selected, display the page view
  if (selectedPageId) {
    return (
      <NotionPageView 
        pageId={selectedPageId} 
        onBack={handleBackClick} 
      />
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 rounded-md hover:bg-slate-50">
              <div className="flex items-center">
                <Skeleton className="w-8 h-8 rounded mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-red-500 mb-2">Failed to load Notion pages</p>
          <Button variant="outline" size="sm" onClick={() => onRefresh?.(id)}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!pages || pages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-gray-500 mb-2">No Notion pages found</p>
          <p className="text-sm text-gray-400">Connect Notion to see your pages here</p>
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {pages.map((page: NotionPage) => (
          <li 
            key={page.id} 
            className="p-3 rounded-md hover:bg-slate-50 cursor-pointer"
            onClick={() => handlePageClick(page.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 ${getIconBackground(page)} rounded flex items-center justify-center mr-3`}>
                  {getPageIcon(page)}
                </div>
                <div>
                  <h3 className="font-medium">{page.title}</h3>
                  <p className="text-slate-500 text-xs">{formatLastEdited(page.lastEditedTime)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(page.url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Widget
      id={id}
      title="Recent Notion Pages"
      icon={<FileText className="h-4 w-4" />}
      onRemove={onRemove}
      onRefresh={onRefresh}
      onEdit={onEdit}
      footer={
        <Button 
          variant="link" 
          className="text-primary-600 hover:text-primary-800 text-sm"
          onClick={() => {
            // Only try to open if we have pages data and at least one page
            if (pages && Array.isArray(pages) && pages.length > 0 && pages[0]?.url) {
              // Open Notion main interface by extracting the base URL
              window.open(pages[0].url.split('/').slice(0, -1).join('/'), '_blank');
            }
          }}
        >
          View all Notion pages
        </Button>
      }
    >
      {renderContent()}
    </Widget>
  );
}
