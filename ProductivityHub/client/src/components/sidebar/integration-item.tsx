import React from 'react';
import { TrelloIcon, BookOpen, Mail } from 'lucide-react';

interface IntegrationItemProps {
  type: string;
  name: string;
  connected: boolean;
}

export function IntegrationItem({ type, name, connected }: IntegrationItemProps) {
  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'trello':
        return <TrelloIcon className="h-4 w-4" />;
      case 'notion':
        return <BookOpen className="h-4 w-4" />;
      case 'gmail':
        return <Mail className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };
  
  const getBgColor = () => {
    switch (type.toLowerCase()) {
      case 'trello':
        return 'bg-blue-500';
      case 'notion':
        return 'bg-black';
      case 'gmail':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <li className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
      <div className={`w-8 h-8 rounded ${getBgColor()} flex items-center justify-center text-white mr-3`}>
        {getIcon()}
      </div>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-slate-500">{connected ? 'Connected' : 'Not connected'}</p>
      </div>
    </li>
  );
}
