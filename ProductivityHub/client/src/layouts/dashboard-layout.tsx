import React, { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <header className="bg-white p-4 border-b shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="relative flex-1 max-w-xl">
              <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <Search className="h-5 w-5 text-blue-500 mr-2" />
                <input
                  type="search"
                  placeholder="Search across all apps"
                  className="w-full bg-transparent border-none focus:outline-none text-base"
                />
              </div>
            </div>
            <Avatar className="ml-4 h-10 w-10 bg-blue-600">
              <AvatarFallback className="bg-blue-600 text-white font-bold text-lg">U</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}