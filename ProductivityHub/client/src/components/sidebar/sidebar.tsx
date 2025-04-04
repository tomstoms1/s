import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  Home, Bookmark, Settings, Puzzle,
  Mail, BookOpen, Trello, Calendar, Plus, Check, ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Integration } from '@shared/schema';
import { IntegrationDialog } from '@/components/dashboard/integration-dialog';
import { IntegrationItem } from '@/components/sidebar/integration-item';
import { Button } from '@/components/ui/button';

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<'trello' | 'notion' | 'gmail'>('gmail');

  // Fetch integrations
  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Custom navigation item that properly handles the Link component
  const NavItem = ({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: React.ReactNode }) => {
    const isActive = location === href || (href === '/dashboard' && location === '/');
    
    return (
      <Link href={href}>
        <div className={cn(
            "flex items-center px-4 py-3 text-sm cursor-pointer",
            isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
          )}>
          {icon}
          <span className="font-medium">{label}</span>
          {badge}
        </div>
      </Link>
    );
  };

  const openIntegrationDialog = (type: 'trello' | 'notion' | 'gmail') => {
    setSelectedIntegrationType(type);
    setIntegrationDialogOpen(true);
  };

  // Find existing integrations
  const trelloIntegration = integrations.find(i => i.type === 'trello');
  const notionIntegration = integrations.find(i => i.type === 'notion');
  const gmailIntegration = integrations.find(i => i.type === 'gmail');

  return (
    <aside className={cn("w-[300px] bg-white border-r h-screen flex flex-col", className)}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">ProductivityHub</h1>
      </div>

      <div>
        <NavItem 
          href="/dashboard" 
          icon={<Home className="h-5 w-5 mr-3" />} 
          label="Dashboard" 
        />
        <NavItem 
          href="/favorites" 
          icon={<Bookmark className="h-5 w-5 mr-3" />} 
          label="Favorites" 
        />
      </div>

      <div className="mt-8">
        <h2 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          APPLICATIONS
        </h2>
        <div>
          <NavItem 
            href="/notion" 
            icon={<BookOpen className="h-5 w-5 mr-3" />} 
            label="Notion" 
          />
          <NavItem 
            href="/gmail" 
            icon={<Mail className="h-5 w-5 mr-3" />} 
            label="Gmail" 
          />
          <NavItem 
            href="/trello" 
            icon={<Trello className="h-5 w-5 mr-3" />} 
            label="Trello" 
            badge={<span className="ml-auto bg-blue-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">3</span>}
          />
          <NavItem 
            href="/calendar" 
            icon={<Calendar className="h-5 w-5 mr-3" />} 
            label="Calendar" 
          />
        </div>
      </div>

      {/* New Integrations Section */}
      <div className="mt-8">
        <h2 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex justify-between items-center">
          INTEGRATIONS
        </h2>
        <div>
          <div 
            className="cursor-pointer" 
            onClick={() => openIntegrationDialog('trello')}
          >
            <IntegrationItem 
              type="trello" 
              name="Trello" 
              connected={!!trelloIntegration?.connected} 
            />
          </div>
          <div 
            className="cursor-pointer" 
            onClick={() => openIntegrationDialog('notion')}
          >
            <IntegrationItem 
              type="notion" 
              name="Notion" 
              connected={!!notionIntegration?.connected} 
            />
          </div>
          <div 
            className="cursor-pointer" 
            onClick={() => openIntegrationDialog('gmail')}
          >
            <IntegrationItem 
              type="gmail" 
              name="Gmail" 
              connected={!!gmailIntegration?.connected} 
            />
          </div>
        </div>
      </div>

      {/* Integration Dialog */}
      <IntegrationDialog 
        open={integrationDialogOpen}
        onOpenChange={setIntegrationDialogOpen}
        integrationType={selectedIntegrationType}
      />
    </aside>
  );
}